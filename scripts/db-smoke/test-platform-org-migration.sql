-- Database Smoke Test Harness: G-143 Platform Org Schema & owner_agency_id Migration
-- Run via: psql -f scripts/db-smoke/test-platform-org-migration.sql

\set ON_ERROR_STOP on

\echo '======================================================='
\echo '  SMOKE TEST: G-143 Platform Org Schema Migration     '
\echo '======================================================='

BEGIN;

-- 0. Setup base prerequisite tables if not existing (simulating baseline snapshot)
CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE IF NOT EXISTS app.brands (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    logo_url text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.agency_invites (
    token text PRIMARY KEY,
    agency_id uuid NOT NULL,
    issued_at timestamptz NOT NULL DEFAULT now()
);

-- Seed baseline brands if empty
INSERT INTO app.brands (id, name) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Acme Brand') ON CONFLICT (id) DO NOTHING;
INSERT INTO app.brands (id, name) VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'OtherCo Brand') ON CONFLICT (id) DO NOTHING;

-- 1. Apply UP Migration
\echo '[1/7] Applying G-143 UP Migration...'

-- 1a. app.agencies
CREATE TABLE IF NOT EXISTS app.agencies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    company_registered_name text,
    tax_id text,
    address_line text,
    billing_email text,
    verification_status text NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
    verified_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 1b. app.agency_staff_memberships
CREATE TABLE IF NOT EXISTS app.agency_staff_memberships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES app.agencies (id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
    display_name text,
    joined_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT agency_staff_memberships_agency_user_unique UNIQUE (agency_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_agency_staff_memberships_user ON app.agency_staff_memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_agency_staff_memberships_agency ON app.agency_staff_memberships (agency_id);

-- 1c. app.staff_invites
CREATE TABLE IF NOT EXISTS app.staff_invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES app.agencies (id) ON DELETE CASCADE,
    email text NOT NULL,
    role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    token text NOT NULL UNIQUE,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    accepted_at timestamptz,
    invited_by_user_id uuid
);

CREATE INDEX IF NOT EXISTS idx_staff_invites_agency ON app.staff_invites (agency_id);
CREATE INDEX IF NOT EXISTS idx_staff_invites_token ON app.staff_invites (token);
CREATE INDEX IF NOT EXISTS idx_staff_invites_email ON app.staff_invites (email);

-- 1d. Seed Agency Org
INSERT INTO app.agencies (id, name, company_registered_name, tax_id, verification_status, verified_at)
VALUES (
    '11111111-1111-4111-8111-111111111111',
    'Acme Agency Org',
    'Acme Global Media Co., Ltd.',
    '0105558123456',
    'verified',
    now()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    company_registered_name = EXCLUDED.company_registered_name,
    tax_id = EXCLUDED.tax_id,
    verification_status = EXCLUDED.verification_status;

-- 1e. Add owner_agency_id to app.brands
ALTER TABLE app.brands ADD COLUMN IF NOT EXISTS owner_agency_id uuid REFERENCES app.agencies (id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_brands_owner_agency_id ON app.brands (owner_agency_id);

-- 1f. Backfill
UPDATE app.brands SET owner_agency_id = '11111111-1111-4111-8111-111111111111' WHERE owner_agency_id IS NULL;

-- 1g. Refactor agency_invites
ALTER TABLE app.agency_invites ADD COLUMN IF NOT EXISTS created_by_user_id uuid;
ALTER TABLE app.agency_invites ADD COLUMN IF NOT EXISTS created_by_staff_name text;
ALTER TABLE app.agency_invites ADD COLUMN IF NOT EXISTS invitation_code text;
ALTER TABLE app.agency_invites ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE app.agency_invites ADD COLUMN IF NOT EXISTS expires_at timestamptz;

UPDATE app.agency_invites SET agency_id = '11111111-1111-4111-8111-111111111111' WHERE agency_id NOT IN (SELECT id FROM app.agencies);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = 'app' AND table_name = 'agency_invites' AND constraint_name = 'agency_invites_agency_id_fkey'
    ) THEN
        ALTER TABLE app.agency_invites ADD CONSTRAINT agency_invites_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES app.agencies (id) ON DELETE CASCADE;
    END IF;
END $$;

\echo '[2/7] Verifying table existence and columns...'

DO $$
DECLARE
    v_count integer;
BEGIN
    SELECT count(*) INTO v_count FROM information_schema.tables WHERE table_schema = 'app' AND table_name = 'agencies';
    IF v_count = 0 THEN RAISE EXCEPTION 'FAIL: app.agencies table missing'; END IF;

    SELECT count(*) INTO v_count FROM information_schema.tables WHERE table_schema = 'app' AND table_name = 'agency_staff_memberships';
    IF v_count = 0 THEN RAISE EXCEPTION 'FAIL: app.agency_staff_memberships table missing'; END IF;

    SELECT count(*) INTO v_count FROM information_schema.tables WHERE table_schema = 'app' AND table_name = 'staff_invites';
    IF v_count = 0 THEN RAISE EXCEPTION 'FAIL: app.staff_invites table missing'; END IF;

    SELECT count(*) INTO v_count FROM information_schema.columns WHERE table_schema = 'app' AND table_name = 'brands' AND column_name = 'owner_agency_id';
    IF v_count = 0 THEN RAISE EXCEPTION 'FAIL: app.brands.owner_agency_id column missing'; END IF;
END $$;

\echo '[3/7] Verifying Seed Backfill & INV-01 Exclusive Bind...'

DO $$
DECLARE
    v_owner_acme uuid;
    v_owner_other uuid;
BEGIN
    SELECT owner_agency_id INTO v_owner_acme FROM app.brands WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    SELECT owner_agency_id INTO v_owner_other FROM app.brands WHERE id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

    IF v_owner_acme <> '11111111-1111-4111-8111-111111111111'::uuid THEN
        RAISE EXCEPTION 'FAIL: Acme brand owner_agency_id backfill failed (got %)', v_owner_acme;
    END IF;

    IF v_owner_other <> '11111111-1111-4111-8111-111111111111'::uuid THEN
        RAISE EXCEPTION 'FAIL: OtherCo brand owner_agency_id backfill failed (got %)', v_owner_other;
    END IF;
END $$;

\echo '[4/7] Verifying Staff RBAC & Unique Constraints (INV-02)...'

DO $$
DECLARE
    v_staff_id uuid := gen_random_uuid();
    v_user_id uuid := gen_random_uuid();
    v_duplicate_caught boolean := false;
BEGIN
    INSERT INTO app.agency_staff_memberships (id, agency_id, user_id, role, status, display_name)
    VALUES (v_staff_id, '11111111-1111-4111-8111-111111111111', v_user_id, 'admin', 'active', 'Test Admin');

    BEGIN
        INSERT INTO app.agency_staff_memberships (agency_id, user_id, role)
        VALUES ('11111111-1111-4111-8111-111111111111', v_user_id, 'member');
    EXCEPTION WHEN unique_violation THEN
        v_duplicate_caught := true;
    END;

    IF NOT v_duplicate_caught THEN
        RAISE EXCEPTION 'FAIL: Duplicate staff membership (agency_id, user_id) was not rejected by unique constraint';
    END IF;
END $$;

\echo '[5/7] Verifying ON DELETE RESTRICT on Brand Ownership (INV-01)...'

DO $$
DECLARE
    v_test_agency_id uuid := gen_random_uuid();
    v_test_brand_id uuid := gen_random_uuid();
    v_restrict_caught boolean := false;
BEGIN
    INSERT INTO app.agencies (id, name, verification_status) VALUES (v_test_agency_id, 'Restrict Test Agency', 'verified');
    INSERT INTO app.brands (id, name, owner_agency_id) VALUES (v_test_brand_id, 'Restrict Test Brand', v_test_agency_id);

    BEGIN
        DELETE FROM app.agencies WHERE id = v_test_agency_id;
    EXCEPTION WHEN foreign_key_violation THEN
        v_restrict_caught := true;
    END;

    IF NOT v_restrict_caught THEN
        RAISE EXCEPTION 'FAIL: ON DELETE RESTRICT failed to block deletion of agency with active owned brand';
    END IF;

    -- Cleanup test entities
    DELETE FROM app.brands WHERE id = v_test_brand_id;
    DELETE FROM app.agencies WHERE id = v_test_agency_id;
END $$;

\echo '[6/7] Verifying Idempotency of UP Migration...'

-- Re-run seed insertion & alters
INSERT INTO app.agencies (id, name, company_registered_name, tax_id, verification_status, verified_at)
VALUES ('11111111-1111-4111-8111-111111111111', 'Acme Agency Org', 'Acme Global Media Co., Ltd.', '0105558123456', 'verified', now())
ON CONFLICT (id) DO NOTHING;

ALTER TABLE app.brands ADD COLUMN IF NOT EXISTS owner_agency_id uuid REFERENCES app.agencies (id) ON DELETE RESTRICT;

\echo '[7/7] Verifying Rollback (DOWN Migration) Reversibility...'

-- Apply Down
ALTER TABLE app.agency_invites DROP CONSTRAINT IF EXISTS agency_invites_agency_id_fkey;
ALTER TABLE app.agency_invites DROP COLUMN IF EXISTS created_by_user_id;
ALTER TABLE app.agency_invites DROP COLUMN IF EXISTS created_by_staff_name;
ALTER TABLE app.agency_invites DROP COLUMN IF EXISTS invitation_code;
ALTER TABLE app.agency_invites DROP COLUMN IF EXISTS status;
ALTER TABLE app.agency_invites DROP COLUMN IF EXISTS expires_at;

DROP INDEX IF EXISTS app.idx_brands_owner_agency_id;
ALTER TABLE app.brands DROP COLUMN IF EXISTS owner_agency_id;
DROP TABLE IF EXISTS app.staff_invites;
DROP TABLE IF EXISTS app.agency_staff_memberships;
DROP TABLE IF EXISTS app.agencies;

DO $$
DECLARE
    v_count integer;
BEGIN
    SELECT count(*) INTO v_count FROM information_schema.tables WHERE table_schema = 'app' AND table_name = 'agencies';
    IF v_count > 0 THEN RAISE EXCEPTION 'FAIL: app.agencies was not dropped during rollback'; END IF;

    SELECT count(*) INTO v_count FROM information_schema.columns WHERE table_schema = 'app' AND table_name = 'brands' AND column_name = 'owner_agency_id';
    IF v_count > 0 THEN RAISE EXCEPTION 'FAIL: app.brands.owner_agency_id was not dropped during rollback'; END IF;
END $$;

-- Re-apply UP to leave DB in clean migrated state
CREATE TABLE IF NOT EXISTS app.agencies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    company_registered_name text,
    tax_id text,
    address_line text,
    billing_email text,
    verification_status text NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
    verified_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.agency_staff_memberships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES app.agencies (id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
    display_name text,
    joined_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT agency_staff_memberships_agency_user_unique UNIQUE (agency_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_agency_staff_memberships_user ON app.agency_staff_memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_agency_staff_memberships_agency ON app.agency_staff_memberships (agency_id);

CREATE TABLE IF NOT EXISTS app.staff_invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES app.agencies (id) ON DELETE CASCADE,
    email text NOT NULL,
    role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    token text NOT NULL UNIQUE,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    accepted_at timestamptz,
    invited_by_user_id uuid
);

CREATE INDEX IF NOT EXISTS idx_staff_invites_agency ON app.staff_invites (agency_id);
CREATE INDEX IF NOT EXISTS idx_staff_invites_token ON app.staff_invites (token);
CREATE INDEX IF NOT EXISTS idx_staff_invites_email ON app.staff_invites (email);

INSERT INTO app.agencies (id, name, company_registered_name, tax_id, verification_status, verified_at)
VALUES ('11111111-1111-4111-8111-111111111111', 'Acme Agency Org', 'Acme Global Media Co., Ltd.', '0105558123456', 'verified', now())
ON CONFLICT (id) DO NOTHING;

ALTER TABLE app.brands ADD COLUMN IF NOT EXISTS owner_agency_id uuid REFERENCES app.agencies (id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_brands_owner_agency_id ON app.brands (owner_agency_id);
UPDATE app.brands SET owner_agency_id = '11111111-1111-4111-8111-111111111111' WHERE owner_agency_id IS NULL;

\echo '======================================================='
\echo '  SUCCESS: ALL G-143 MIGRATION SMOKE CHECKS PASSED     '
\echo '======================================================='

COMMIT;
