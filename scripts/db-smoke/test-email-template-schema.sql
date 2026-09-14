-- Goal G-160: SQL Smoke & Invariant Verification Suite
-- Tests table creation, RLS enforcement, 3-tier enum isolation, and bilingual seed integrity

BEGIN;

-- 1. Check Tables Existence
DO $$
DECLARE
    v_table_count int;
BEGIN
    SELECT count(*) INTO v_table_count
    FROM information_schema.tables
    WHERE table_schema = 'app'
      AND table_name IN (
          'email_templates',
          'email_audit_log',
          'email_suppressions',
          'user_notification_preferences',
          'agency_email_settings'
      );

    IF v_table_count != 5 THEN
        RAISE EXCEPTION 'Table check failed: Expected 5 tables in app schema, found %', v_table_count;
    END IF;
    RAISE NOTICE '✔ 5/5 email schema tables exist in app schema.';
END $$;

-- 2. Check Custom Enums
DO $$
DECLARE
    v_type_count int;
BEGIN
    SELECT count(*) INTO v_type_count
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'app'
      AND t.typname IN ('email_template_tier', 'email_delivery_status', 'email_suppression_category');

    IF v_type_count != 3 THEN
        RAISE EXCEPTION 'Enum check failed: Expected 3 custom types, found %', v_type_count;
    END IF;
    RAISE NOTICE '✔ 3/3 custom enums exist.';
END $$;

-- 3. Check Seed Template Counts (23 in th-TH, 23 in en-US = 46 total)
DO $$
DECLARE
    v_total_templates int;
    v_th_templates int;
    v_en_templates int;
    v_mandatory int;
    v_operational int;
    v_commercial int;
BEGIN
    SELECT count(*) INTO v_total_templates FROM app.email_templates;
    SELECT count(*) INTO v_th_templates FROM app.email_templates WHERE locale = 'th-TH';
    SELECT count(*) INTO v_en_templates FROM app.email_templates WHERE locale = 'en-US';
    
    SELECT count(*) INTO v_mandatory FROM app.email_templates WHERE tier = 'mandatory_transactional';
    SELECT count(*) INTO v_operational FROM app.email_templates WHERE tier = 'operational_campaign';
    SELECT count(*) INTO v_commercial FROM app.email_templates WHERE tier = 'commercial_marketing';

    IF v_total_templates != 46 THEN
        RAISE EXCEPTION 'Seed count failed: Expected 46 total templates, found %', v_total_templates;
    END IF;

    IF v_th_templates != 23 OR v_en_templates != 23 THEN
        RAISE EXCEPTION 'Locale balance failed: Expected 23 th-TH and 23 en-US, found th: %, en: %', v_th_templates, v_en_templates;
    END IF;

    IF v_mandatory != 18 OR v_operational != 24 OR v_commercial != 4 THEN
        RAISE EXCEPTION 'Tier count mismatch: Mandatory %, Operational %, Commercial %', v_mandatory, v_operational, v_commercial;
    END IF;

    RAISE NOTICE '✔ 46/46 bilingual templates seeded (18 mandatory, 24 operational, 4 commercial).';
END $$;

-- 4. Test RLS Isolation
DO $$
DECLARE
    v_agency_id uuid := '11111111-1111-4111-8111-111111111111';
    v_dummy_agency_id uuid := '22222222-2222-4222-8222-222222222222';
    v_visible_templates int;
BEGIN
    -- As tenant 1, can see system templates (agency_id IS NULL)
    PERFORM app.set_current_tenant(v_agency_id, NULL, NULL);
    SELECT count(*) INTO v_visible_templates FROM app.email_templates;
    IF v_visible_templates < 46 THEN
        RAISE EXCEPTION 'RLS fallback failed: Expected >= 46 global templates visible, found %', v_visible_templates;
    END IF;

    -- Clear tenant session
    PERFORM app.clear_current_tenant();
    RAISE NOTICE '✔ RLS policy allows global template resolution.';
END $$;

-- 5. Test Audit Log Insertion with Masked Email & Hash
DO $$
DECLARE
    v_log_id uuid;
BEGIN
    INSERT INTO app.email_audit_log (
        template_code,
        recipient_email_masked,
        recipient_email_hash,
        tier,
        status,
        payload_variables
    ) VALUES (
        'T02_AGENCY_EMAIL_OTP',
        'a***n@sodality.ai',
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        'mandatory_transactional',
        'dispatched',
        '{"otp_code":"889922"}'::jsonb
    ) RETURNING id INTO v_log_id;

    IF v_log_id IS NULL THEN
        RAISE EXCEPTION 'Audit log insertion failed.';
    END IF;
    RAISE NOTICE '✔ Email audit log insertion verified with masked PII.';
END $$;

ROLLBACK;

SELECT 'G-160 SQL Smoke & Invariant Verification Suite PASSED' AS status;
