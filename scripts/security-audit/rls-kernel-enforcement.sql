-- G-146 Security Audit: PostgreSQL Row Level Security (RLS) Kernel Enforcement Test
-- Verifies R-04, R-05, R-08, and INV-05 isolation invariants.

BEGIN;

-- Create temporary application test role if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rls_test_app_user') THEN
        CREATE ROLE rls_test_app_user;
    END IF;
    GRANT USAGE ON SCHEMA app TO rls_test_app_user;
    GRANT ALL ON ALL TABLES IN SCHEMA app TO rls_test_app_user;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO rls_test_app_user;
END $$;

SET LOCAL ROLE rls_test_app_user;

-- 1. Setup Test Isolation Scopes
SELECT app.clear_current_tenant();

-- Verify R-08: Unscoped direct queries return 0 rows for non-bypassed sessions
DO $$
DECLARE
    brand_count INTEGER;
BEGIN
    SELECT count(*) INTO brand_count FROM app.brands;
    -- When RLS is forced and no session variables are set, count MUST be 0
    IF brand_count > 0 THEN
        RAISE EXCEPTION 'RLS Violation (R-08): Unscoped query returned % brands (expected 0)', brand_count;
    END IF;
    RAISE NOTICE '✔ R-08 Passed: Direct unscoped query returned 0 rows';
END $$;

-- 2. Test Scoped Session Context for SEED_AGENCY_ORG
DO $$
DECLARE
    brand_count INTEGER;
BEGIN
    PERFORM app.set_current_tenant('11111111-1111-4111-8111-111111111111'::UUID, NULL, NULL);
    SELECT count(*) INTO brand_count FROM app.brands;
    IF brand_count = 0 THEN
        RAISE EXCEPTION 'RLS Isolation Error: Scoped query for SEED_AGENCY_ORG returned 0 brands';
    END IF;
    RAISE NOTICE '✔ Scoped Isolation Passed: SEED_AGENCY_ORG retrieved % bound brands', brand_count;
END $$;

-- 3. Test Cross-Tenant Scoped Session Context (Random Unbound Agency)
DO $$
DECLARE
    brand_count INTEGER;
BEGIN
    PERFORM app.set_current_tenant('99999999-9999-4999-8999-999999999999'::UUID, NULL, NULL);
    SELECT count(*) INTO brand_count FROM app.brands;
    IF brand_count > 0 THEN
        RAISE EXCEPTION 'INV-05 Violation: Foreign agency retrieved % brands', brand_count;
    END IF;
    RAISE NOTICE '✔ INV-05 Passed: Foreign agency retrieved 0 brands';
END $$;

-- 4. Test RLS Bypass Switch for System Admin / Worker
DO $$
DECLARE
    brand_count INTEGER;
BEGIN
    PERFORM set_config('app.bypass_rls', 'on', true);
    SELECT count(*) INTO brand_count FROM app.brands;
    IF brand_count = 0 THEN
        RAISE EXCEPTION 'Bypass Error: System admin query returned 0 brands';
    END IF;
    RAISE NOTICE '✔ RLS Bypass Passed: System admin retrieved all % brands', brand_count;
END $$;

ROLLBACK;
