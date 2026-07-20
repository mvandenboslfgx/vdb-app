-- Local multi-user RLS suite. Requires seed-local-identities.mjs.
-- Run via: node scripts/run-rls-suite.mjs
-- DO NOT run against remote production.

CREATE SCHEMA IF NOT EXISTS tests;
GRANT USAGE ON SCHEMA tests TO postgres, authenticated, service_role;

-- INVOKER on purpose: SET ROLE is forbidden inside SECURITY DEFINER.
CREATE OR REPLACE FUNCTION tests.authenticate_as(uid uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claim.sub', uid::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', uid::text, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END;
$$;

CREATE OR REPLACE FUNCTION tests.clear_auth()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claim.role', '', true);
  PERFORM set_config('request.jwt.claims', '', true);
  EXECUTE 'RESET ROLE';
END;
$$;

CREATE OR REPLACE FUNCTION tests.user_id(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth
AS $$
  SELECT id FROM auth.users WHERE email = lower(p_email) LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION tests.authenticate_as(uuid) TO authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION tests.clear_auth() TO authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION tests.user_id(text) TO authenticated, service_role, postgres;

DO $$
DECLARE
  v_pass int := 0;
  v_fail int := 0;
  v_skip int := 0;
  v_tests int := 0;
  uid_a uuid;
  uid_b uuid;
  uid_staff uuid;
  uid_partner_a uuid;
  uid_partner_b uuid;
  uid_admin uuid;
  project_a uuid;
  conv_a uuid;
  ticket_a uuid;
  quote_a uuid;
  inv_a uuid;
  inv_b uuid;
  doc_id uuid;
  clean_ver uuid;
  flagged_ver uuid;
  commission_id uuid;
  partner_prof_a uuid;
  partner_prof_b uuid;
  lead_a_id uuid;
  lead_b_id uuid;
  new_doc public.documents;
  cnt int;
  raised boolean;
  new_proj uuid;
  payout_test_sale_id uuid;
  payout_test_commission_id uuid;
  payout_request_id uuid;
BEGIN
  uid_a := tests.user_id('customer.a@local.vdb');
  uid_b := tests.user_id('customer.b@local.vdb');
  uid_staff := tests.user_id('staff@local.vdb');
  uid_partner_a := tests.user_id('partner.active.a@local.vdb');
  uid_partner_b := tests.user_id('partner.active.b@local.vdb');
  uid_admin := tests.user_id('admin@local.vdb');

  IF uid_a IS NULL OR uid_b IS NULL OR uid_staff IS NULL THEN
    RAISE EXCEPTION 'Seed users missing — run node scripts/seed-local-identities.mjs first';
  END IF;

  SELECT id INTO project_a
  FROM public.projects p
  WHERE p.customer_user_id = uid_a
    AND EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = p.id AND pm.user_id = uid_a
    )
  ORDER BY p.created_at ASC
  LIMIT 1;
  SELECT id INTO conv_a FROM public.conversations WHERE created_by = uid_a ORDER BY created_at ASC LIMIT 1;
  SELECT t.id INTO ticket_a
  FROM public.support_tickets t
  WHERE t.requester_id = uid_a
    AND EXISTS (
      SELECT 1 FROM public.support_ticket_messages m
      WHERE m.ticket_id = t.id AND m.is_internal = true
    )
  ORDER BY t.created_at ASC
  LIMIT 1;
  -- Fallback: any ticket for A if seed internal note missing
  IF ticket_a IS NULL THEN
    SELECT id INTO ticket_a FROM public.support_tickets WHERE requester_id = uid_a ORDER BY created_at ASC LIMIT 1;
  END IF;
  SELECT id INTO quote_a FROM public.quotes WHERE customer_user_id = uid_a ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO inv_a FROM public.invoices WHERE customer_user_id = uid_a LIMIT 1;
  SELECT id INTO inv_b FROM public.invoices WHERE customer_user_id = uid_b LIMIT 1;
  SELECT id INTO doc_id FROM public.documents WHERE owner_user_id = uid_a LIMIT 1;
  SELECT id INTO clean_ver FROM public.document_versions WHERE document_id = doc_id AND scan_status = 'clean' LIMIT 1;
  SELECT id INTO flagged_ver FROM public.document_versions WHERE document_id = doc_id AND scan_status = 'flagged' LIMIT 1;
  SELECT id INTO partner_prof_a FROM public.partner_profiles WHERE user_id = uid_partner_a LIMIT 1;
  SELECT id INTO partner_prof_b FROM public.partner_profiles WHERE user_id = uid_partner_b LIMIT 1;
  SELECT id INTO commission_id FROM public.commissions WHERE partner_id = partner_prof_a LIMIT 1;
  SELECT id INTO lead_a_id FROM public.partner_leads WHERE partner_id = partner_prof_a ORDER BY created_at LIMIT 1;
  SELECT id INTO lead_b_id FROM public.partner_leads WHERE partner_id = partner_prof_b ORDER BY created_at LIMIT 1;

  -- Dedicated sale/commission for the payout RPC tests below -- kept separate
  -- from the seed's own 'payable' commission (see seed-local-identities.mjs)
  -- so scripts/repository-integration.mjs can independently exercise the
  -- same RPC without this suite consuming its balance first.
  IF partner_prof_a IS NOT NULL THEN
    INSERT INTO public.sales (partner_id, status, currency, gross_amount_cents, net_amount_cents)
    VALUES (partner_prof_a, 'won', 'EUR', 5000, 4000)
    RETURNING id INTO payout_test_sale_id;

    INSERT INTO public.commissions (
      sale_id, partner_id, status, basis_amount_cents, rate_bps, commission_amount_cents, currency
    )
    VALUES (payout_test_sale_id, partner_prof_a, 'payable', 4000, 1000, 400, 'EUR')
    RETURNING id INTO payout_test_commission_id;
  END IF;

  -- helper to assert
  -- ========== PROFILES ==========
  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_a);
    SELECT count(*) INTO cnt FROM public.app_profiles WHERE id = uid_a;
    IF cnt = 1 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS profiles_own_select';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL profiles_own_select cnt=%', cnt; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL profiles_own_select: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_a);
    SELECT count(*) INTO cnt FROM public.app_profiles WHERE id = uid_b;
    IF cnt = 0 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS profiles_no_cross_select';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL profiles_no_cross_select cnt=%', cnt; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL profiles_no_cross_select: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_staff);
    SELECT count(*) INTO cnt FROM public.app_profiles WHERE id IN (uid_a, uid_b);
    IF cnt = 2 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS profiles_staff_select_all';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL profiles_staff_select_all cnt=%', cnt; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL profiles_staff_select_all: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_a);
    UPDATE public.app_profiles SET full_name = 'Customer A Updated' WHERE id = uid_a;
    SELECT count(*) INTO cnt FROM public.app_profiles WHERE id = uid_a AND full_name = 'Customer A Updated';
    IF cnt = 1 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS profiles_own_update_name';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL profiles_own_update_name'; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL profiles_own_update_name: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_a);
    raised := false;
    BEGIN
      UPDATE public.app_profiles SET email = 'hacked@local.vdb' WHERE id = uid_a;
    EXCEPTION WHEN OTHERS THEN
      raised := true;
    END;
    IF raised THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS profiles_block_email_change';
    ELSE
      -- if update silently no-op / reverted
      SELECT count(*) INTO cnt FROM public.app_profiles WHERE id = uid_a AND email = 'hacked@local.vdb';
      IF cnt = 0 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS profiles_block_email_change';
      ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL profiles_block_email_change'; END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL profiles_block_email_change: %', SQLERRM;
  END;

  -- ========== USER ROLES ==========
  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_a);
    SELECT count(*) INTO cnt FROM public.user_roles WHERE user_id = uid_a;
    IF cnt >= 1 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS roles_own_select';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL roles_own_select'; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL roles_own_select: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_a);
    SELECT count(*) INTO cnt FROM public.user_roles WHERE user_id = uid_staff;
    IF cnt = 0 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS roles_no_cross_select';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL roles_no_cross_select cnt=%', cnt; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL roles_no_cross_select: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_a);
    raised := false;
    BEGIN
      INSERT INTO public.user_roles (user_id, role) VALUES (uid_a, 'admin');
    EXCEPTION WHEN OTHERS THEN
      raised := true;
    END;
    IF raised THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS roles_customer_cannot_self_elevate';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL roles_customer_cannot_self_elevate'; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL roles_customer_cannot_self_elevate: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_a);
    raised := false;
    BEGIN
      INSERT INTO public.user_roles (user_id, role) VALUES (uid_a, 'partner');
    EXCEPTION WHEN OTHERS THEN
      raised := true;
    END;
    IF raised THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS roles_customer_cannot_grant_partner';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL roles_customer_cannot_grant_partner'; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL roles_customer_cannot_grant_partner: %', SQLERRM;
  END;

  -- ========== PROJECTS ==========
  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_a);
    SELECT count(*) INTO cnt FROM public.projects WHERE id = project_a;
    IF cnt = 1 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS projects_customer_a_select_own';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL projects_customer_a_select_own'; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL projects_customer_a_select_own: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_b);
    SELECT count(*) INTO cnt FROM public.projects WHERE id = project_a;
    IF cnt = 0 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS projects_customer_b_cannot_see_a';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL projects_customer_b_cannot_see_a'; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL projects_customer_b_cannot_see_a: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_a);
    INSERT INTO public.projects (title, customer_user_id, status)
    VALUES ('Customer created', uid_a, 'request_received')
    RETURNING id INTO new_proj;
    IF new_proj IS NOT NULL THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS projects_customer_insert';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL projects_customer_insert'; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL projects_customer_insert: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_a);
    raised := false;
    BEGIN
      UPDATE public.projects SET title = 'Hacked title' WHERE id = project_a;
      GET DIAGNOSTICS cnt = ROW_COUNT;
      IF cnt > 0 THEN raised := false; ELSE raised := true; END IF;
    EXCEPTION WHEN OTHERS THEN
      raised := true;
    END;
    IF raised THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS projects_customer_cannot_update';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL projects_customer_cannot_update'; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL projects_customer_cannot_update: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_a);
    raised := false;
    BEGIN
      UPDATE public.projects SET status = 'completed' WHERE id = project_a;
      GET DIAGNOSTICS cnt = ROW_COUNT;
      IF cnt > 0 THEN raised := false; ELSE raised := true; END IF;
    EXCEPTION WHEN OTHERS THEN
      raised := true;
    END;
    IF raised THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS projects_customer_cannot_change_status';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL projects_customer_cannot_change_status'; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL projects_customer_cannot_change_status: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_staff);
    UPDATE public.projects SET status = 'planning' WHERE id = project_a;
    SELECT count(*) INTO cnt FROM public.projects WHERE id = project_a AND status = 'planning';
    IF cnt = 1 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS projects_staff_can_change_status';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL projects_staff_can_change_status'; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL projects_staff_can_change_status: %', SQLERRM;
  END;

  -- ========== CHAT ==========
  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_a);
    SELECT count(*) INTO cnt FROM public.messages WHERE conversation_id = conv_a;
    IF cnt >= 1 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS chat_participant_reads_messages';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL chat_participant_reads_messages'; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL chat_participant_reads_messages: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_b);
    SELECT count(*) INTO cnt FROM public.messages WHERE conversation_id = conv_a;
    IF cnt = 0 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS chat_non_participant_blocked';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL chat_non_participant_blocked cnt=%', cnt; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL chat_non_participant_blocked: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_a);
    INSERT INTO public.messages (conversation_id, sender_id, body)
    VALUES (conv_a, uid_a, 'RLS test message');
    v_pass := v_pass + 1; RAISE NOTICE 'PASS chat_participant_insert';
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL chat_participant_insert: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_b);
    raised := false;
    BEGIN
      INSERT INTO public.messages (conversation_id, sender_id, body)
      VALUES (conv_a, uid_b, 'intruder');
    EXCEPTION WHEN OTHERS THEN
      raised := true;
    END;
    IF raised THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS chat_non_participant_cannot_insert';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL chat_non_participant_cannot_insert'; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL chat_non_participant_cannot_insert: %', SQLERRM;
  END;

  -- ========== SUPPORT ==========
  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_a);
    SELECT count(*) INTO cnt FROM public.support_tickets WHERE id = ticket_a;
    IF cnt = 1 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS support_own_ticket_select';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL support_own_ticket_select'; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL support_own_ticket_select: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_b);
    SELECT count(*) INTO cnt FROM public.support_tickets WHERE id = ticket_a;
    IF cnt = 0 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS support_other_ticket_hidden';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL support_other_ticket_hidden'; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL support_other_ticket_hidden: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_a);
    SELECT count(*) INTO cnt FROM public.support_ticket_messages
    WHERE ticket_id = ticket_a AND is_internal = true;
    IF cnt = 0 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS support_customer_hides_internal';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL support_customer_hides_internal cnt=%', cnt; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL support_customer_hides_internal: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_staff);
    SELECT count(*) INTO cnt FROM public.support_ticket_messages
    WHERE ticket_id = ticket_a AND is_internal = true;
    IF cnt >= 1 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS support_staff_sees_internal';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL support_staff_sees_internal'; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL support_staff_sees_internal: %', SQLERRM;
  END;

  -- ========== DOCUMENTS ==========
  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_a);
    SELECT count(*) INTO cnt FROM public.document_versions WHERE id = clean_ver;
    IF cnt = 1 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS docs_customer_sees_clean';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL docs_customer_sees_clean'; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL docs_customer_sees_clean: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_a);
    SELECT count(*) INTO cnt FROM public.document_versions WHERE id = flagged_ver;
    IF cnt = 0 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS docs_customer_hides_flagged';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL docs_customer_hides_flagged'; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL docs_customer_hides_flagged: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_staff);
    SELECT count(*) INTO cnt FROM public.document_versions WHERE id = flagged_ver;
    IF cnt = 1 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS docs_staff_sees_flagged';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL docs_staff_sees_flagged'; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL docs_staff_sees_flagged: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_b);
    SELECT count(*) INTO cnt FROM public.documents WHERE id = doc_id;
    IF cnt = 0 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS docs_other_customer_blocked';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL docs_other_customer_blocked'; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL docs_other_customer_blocked: %', SQLERRM;
  END;

  -- ========== QUOTES / INVOICES ==========
  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_a);
    SELECT count(*) INTO cnt FROM public.quotes WHERE id = quote_a;
    IF cnt = 1 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS quotes_own_select';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL quotes_own_select'; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL quotes_own_select: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_b);
    SELECT count(*) INTO cnt FROM public.quotes WHERE id = quote_a;
    IF cnt = 0 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS quotes_cross_hidden';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL quotes_cross_hidden'; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL quotes_cross_hidden: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_a);
    raised := false;
    BEGIN
      UPDATE public.quotes SET status = 'accepted' WHERE id = quote_a;
      GET DIAGNOSTICS cnt = ROW_COUNT;
      IF cnt > 0 THEN raised := false; ELSE raised := true; END IF;
    EXCEPTION WHEN OTHERS THEN
      raised := true;
    END;
    IF raised THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS quotes_customer_cannot_write';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL quotes_customer_cannot_write'; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL quotes_customer_cannot_write: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_a);
    SELECT count(*) INTO cnt FROM public.invoices WHERE id = inv_a;
    IF cnt = 1 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS invoices_own_select';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL invoices_own_select'; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL invoices_own_select: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_a);
    SELECT count(*) INTO cnt FROM public.invoices WHERE id = inv_b;
    IF cnt = 0 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS invoices_cross_hidden';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL invoices_cross_hidden'; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL invoices_cross_hidden: %', SQLERRM;
  END;

  -- ========== PARTNERS / COMMISSIONS ==========
  v_tests := v_tests + 1;
  BEGIN
    IF uid_partner_a IS NULL OR commission_id IS NULL THEN
      v_skip := v_skip + 1; RAISE NOTICE 'SKIP partner_own_commission_select (no seed)';
    ELSE
      PERFORM tests.authenticate_as(uid_partner_a);
      SELECT count(*) INTO cnt FROM public.commissions WHERE id = commission_id;
      IF cnt = 1 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS partner_own_commission_select';
      ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL partner_own_commission_select'; END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL partner_own_commission_select: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    IF uid_partner_b IS NULL OR commission_id IS NULL THEN
      v_skip := v_skip + 1; RAISE NOTICE 'SKIP partner_cross_commission_hidden (no seed)';
    ELSE
      PERFORM tests.authenticate_as(uid_partner_b);
      SELECT count(*) INTO cnt FROM public.commissions WHERE id = commission_id;
      IF cnt = 0 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS partner_cross_commission_hidden';
      ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL partner_cross_commission_hidden'; END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL partner_cross_commission_hidden: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    IF uid_partner_a IS NULL OR commission_id IS NULL THEN
      v_skip := v_skip + 1; RAISE NOTICE 'SKIP partner_cannot_update_commission (no seed)';
    ELSE
      PERFORM tests.authenticate_as(uid_partner_a);
      raised := false;
      BEGIN
        UPDATE public.commissions SET status = 'approved' WHERE id = commission_id;
        GET DIAGNOSTICS cnt = ROW_COUNT;
        IF cnt > 0 THEN raised := false; ELSE raised := true; END IF;
      EXCEPTION WHEN OTHERS THEN
        raised := true;
      END;
      IF raised THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS partner_cannot_update_commission';
      ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL partner_cannot_update_commission'; END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL partner_cannot_update_commission: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_a);
    SELECT count(*) INTO cnt FROM public.commissions;
    IF cnt = 0 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS customer_cannot_see_commissions';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL customer_cannot_see_commissions cnt=%', cnt; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL customer_cannot_see_commissions: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_partner_a);
    SELECT count(*) INTO cnt FROM public.partner_profiles WHERE user_id = uid_partner_a;
    IF cnt = 1 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS partner_own_profile_select';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL partner_own_profile_select'; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL partner_own_profile_select: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_staff);
    SELECT count(*) INTO cnt FROM public.payment_webhook_events;
    -- may be 0 rows but select must succeed for staff
    v_pass := v_pass + 1; RAISE NOTICE 'PASS staff_can_select_payment_webhooks cnt=%', cnt;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL staff_can_select_payment_webhooks: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_a);
    raised := false;
    BEGIN
      SELECT count(*) INTO cnt FROM public.payment_webhook_events;
      -- RLS returns 0 for customers
      IF cnt = 0 THEN raised := true; END IF;
    EXCEPTION WHEN OTHERS THEN
      raised := true;
    END;
    IF raised THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS customer_blocked_payment_webhooks';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL customer_blocked_payment_webhooks'; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL customer_blocked_payment_webhooks: %', SQLERRM;
  END;

  -- ========== SUPPORT: INTERNAL NOTE INSERT (Goal D) ==========
  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_a);
    raised := false;
    BEGIN
      INSERT INTO public.support_ticket_messages (ticket_id, author_id, body, is_internal)
      VALUES (ticket_a, uid_a, 'Customer attempting internal note', true);
    EXCEPTION WHEN OTHERS THEN
      raised := true;
    END;
    IF raised THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS support_customer_cannot_insert_internal_note';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL support_customer_cannot_insert_internal_note'; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL support_customer_cannot_insert_internal_note: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_staff);
    raised := false;
    BEGIN
      PERFORM public.admin_reply_support_ticket(ticket_a, 'Staff internal note (rls test)', true, NULL);
    EXCEPTION WHEN OTHERS THEN
      raised := true;
    END;
    IF NOT raised THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS support_staff_can_insert_internal_note_via_rpc';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL support_staff_can_insert_internal_note_via_rpc'; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL support_staff_can_insert_internal_note_via_rpc: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_a);
    raised := false;
    BEGIN
      PERFORM public.admin_reply_support_ticket(ticket_a, 'Customer attempting staff reply', false, NULL);
    EXCEPTION WHEN OTHERS THEN
      raised := true;
    END;
    IF raised THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS support_customer_cannot_call_admin_reply';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL support_customer_cannot_call_admin_reply'; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL support_customer_cannot_call_admin_reply: %', SQLERRM;
  END;

  -- ========== PAYOUT REQUESTS (Goal C isolation) ==========
  v_tests := v_tests + 1;
  BEGIN
    IF payout_test_commission_id IS NULL THEN
      v_skip := v_skip + 1; RAISE NOTICE 'SKIP payout_partner_a_can_request (no seed)';
    ELSE
      PERFORM tests.authenticate_as(uid_partner_a);
      SELECT (public.request_commission_payout(ARRAY[payout_test_commission_id]::uuid[])).id INTO payout_request_id;
      IF payout_request_id IS NOT NULL THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS payout_partner_a_can_request';
      ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL payout_partner_a_can_request'; END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL payout_partner_a_can_request: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    IF payout_request_id IS NULL THEN
      v_skip := v_skip + 1; RAISE NOTICE 'SKIP payout_double_spend_blocked (no seed)';
    ELSE
      PERFORM tests.authenticate_as(uid_partner_a);
      raised := false;
      BEGIN
        PERFORM public.request_commission_payout(ARRAY[payout_test_commission_id]::uuid[]);
      EXCEPTION WHEN OTHERS THEN
        raised := true;
      END;
      IF raised THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS payout_double_spend_blocked';
      ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL payout_double_spend_blocked'; END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL payout_double_spend_blocked: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    IF payout_request_id IS NULL THEN
      v_skip := v_skip + 1; RAISE NOTICE 'SKIP payout_partner_b_cannot_see_a (no seed)';
    ELSE
      PERFORM tests.authenticate_as(uid_partner_b);
      SELECT count(*) INTO cnt FROM public.payout_requests WHERE id = payout_request_id;
      IF cnt = 0 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS payout_partner_b_cannot_see_a';
      ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL payout_partner_b_cannot_see_a cnt=%', cnt; END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL payout_partner_b_cannot_see_a: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    IF payout_request_id IS NULL THEN
      v_skip := v_skip + 1; RAISE NOTICE 'SKIP payout_staff_can_see_all (no seed)';
    ELSE
      PERFORM tests.authenticate_as(uid_staff);
      SELECT count(*) INTO cnt FROM public.payout_requests WHERE id = payout_request_id;
      IF cnt = 1 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS payout_staff_can_see_all';
      ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL payout_staff_can_see_all'; END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL payout_staff_can_see_all: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    IF payout_request_id IS NULL THEN
      v_skip := v_skip + 1; RAISE NOTICE 'SKIP payout_partner_cannot_reject_own (no seed)';
    ELSE
      PERFORM tests.authenticate_as(uid_partner_a);
      raised := false;
      BEGIN
        PERFORM public.reject_payout_request(payout_request_id, 'self-service attempt');
      EXCEPTION WHEN OTHERS THEN
        raised := true;
      END;
      IF raised THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS payout_partner_cannot_reject_own';
      ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL payout_partner_cannot_reject_own'; END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL payout_partner_cannot_reject_own: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    IF payout_request_id IS NULL THEN
      v_skip := v_skip + 1; RAISE NOTICE 'SKIP payout_staff_can_reject_with_reason (no seed)';
    ELSE
      PERFORM tests.authenticate_as(uid_staff);
      PERFORM public.reject_payout_request(payout_request_id, 'rls test rejection');
      SELECT count(*) INTO cnt FROM public.commissions
      WHERE id = payout_test_commission_id AND status = 'payable';
      IF cnt = 1 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS payout_staff_can_reject_with_reason';
      ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL payout_staff_can_reject_with_reason'; END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL payout_staff_can_reject_with_reason: %', SQLERRM;
  END;

  -- ========== PARTNER LEADS ==========
  v_tests := v_tests + 1;
  BEGIN
    IF lead_a_id IS NULL THEN
      v_skip := v_skip + 1; RAISE NOTICE 'SKIP leads_partner_a_sees_own (no seed)';
    ELSE
      PERFORM tests.authenticate_as(uid_partner_a);
      SELECT count(*) INTO cnt FROM public.partner_leads WHERE id = lead_a_id;
      IF cnt = 1 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS leads_partner_a_sees_own';
      ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL leads_partner_a_sees_own cnt=%', cnt; END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL leads_partner_a_sees_own: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    IF lead_b_id IS NULL THEN
      v_skip := v_skip + 1; RAISE NOTICE 'SKIP leads_partner_a_hidden_from_b (no seed)';
    ELSE
      PERFORM tests.authenticate_as(uid_partner_a);
      SELECT count(*) INTO cnt FROM public.partner_leads WHERE id = lead_b_id;
      IF cnt = 0 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS leads_partner_a_hidden_from_b';
      ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL leads_partner_a_hidden_from_b cnt=%', cnt; END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL leads_partner_a_hidden_from_b: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    IF lead_a_id IS NULL OR lead_b_id IS NULL THEN
      v_skip := v_skip + 1; RAISE NOTICE 'SKIP leads_staff_sees_all (no seed)';
    ELSE
      PERFORM tests.authenticate_as(uid_staff);
      SELECT count(*) INTO cnt FROM public.partner_leads WHERE id IN (lead_a_id, lead_b_id);
      IF cnt = 2 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS leads_staff_sees_all';
      ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL leads_staff_sees_all cnt=%', cnt; END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL leads_staff_sees_all: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    IF lead_a_id IS NULL THEN
      v_skip := v_skip + 1; RAISE NOTICE 'SKIP leads_partner_cannot_read_staff_notes (no seed)';
    ELSE
      PERFORM tests.authenticate_as(uid_partner_a);
      SELECT count(*) INTO cnt FROM public.partner_lead_staff_notes WHERE lead_id = lead_a_id;
      IF cnt = 0 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS leads_partner_cannot_read_staff_notes';
      ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL leads_partner_cannot_read_staff_notes cnt=%', cnt; END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL leads_partner_cannot_read_staff_notes: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    IF lead_a_id IS NULL THEN
      v_skip := v_skip + 1; RAISE NOTICE 'SKIP leads_staff_can_read_staff_notes (no seed)';
    ELSE
      PERFORM tests.authenticate_as(uid_staff);
      SELECT count(*) INTO cnt FROM public.partner_lead_staff_notes WHERE lead_id = lead_a_id;
      IF cnt >= 1 THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS leads_staff_can_read_staff_notes';
      ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL leads_staff_can_read_staff_notes cnt=%', cnt; END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL leads_staff_can_read_staff_notes: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_partner_a);
    raised := false;
    BEGIN
      INSERT INTO public.partner_leads (partner_id, name, email, consent_given, consent_at)
      VALUES (partner_prof_a, 'Direct Insert Attempt', 'direct.insert@example.com', true, now());
    EXCEPTION WHEN OTHERS THEN
      raised := true;
    END;
    IF raised THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS leads_partner_cannot_direct_insert';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL leads_partner_cannot_direct_insert'; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL leads_partner_cannot_direct_insert: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    IF lead_a_id IS NULL THEN
      v_skip := v_skip + 1; RAISE NOTICE 'SKIP leads_partner_cannot_direct_update_status (no seed)';
    ELSE
      PERFORM tests.authenticate_as(uid_partner_a);
      raised := false;
      BEGIN
        UPDATE public.partner_leads SET status = 'converted' WHERE id = lead_a_id;
        GET DIAGNOSTICS cnt = ROW_COUNT;
        IF cnt > 0 THEN raised := false; ELSE raised := true; END IF;
      EXCEPTION WHEN OTHERS THEN
        raised := true;
      END;
      IF raised THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS leads_partner_cannot_direct_update_status';
      ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL leads_partner_cannot_direct_update_status'; END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL leads_partner_cannot_direct_update_status: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    IF lead_a_id IS NULL THEN
      v_skip := v_skip + 1; RAISE NOTICE 'SKIP leads_partner_b_cannot_edit_a_via_rpc (no seed)';
    ELSE
      PERFORM tests.authenticate_as(uid_partner_b);
      raised := false;
      BEGIN
        PERFORM public.update_partner_lead_contact(lead_a_id, p_mark_contacted := true);
      EXCEPTION WHEN OTHERS THEN
        raised := true;
      END;
      IF raised THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS leads_partner_b_cannot_edit_a_via_rpc';
      ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL leads_partner_b_cannot_edit_a_via_rpc'; END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL leads_partner_b_cannot_edit_a_via_rpc: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_a);
    raised := false;
    BEGIN
      PERFORM public.admin_qualify_lead(lead_a_id, 'qualified', NULL);
    EXCEPTION WHEN OTHERS THEN
      raised := true;
    END;
    IF raised THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS leads_customer_cannot_qualify';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL leads_customer_cannot_qualify'; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL leads_customer_cannot_qualify: %', SQLERRM;
  END;

  -- ========== DOCUMENT UPLOAD ACCESS ==========
  v_tests := v_tests + 1;
  BEGIN
    IF project_a IS NULL THEN
      v_skip := v_skip + 1; RAISE NOTICE 'SKIP upload_member_can_upload_to_project (no seed)';
    ELSE
      PERFORM tests.authenticate_as(uid_a);
      SELECT public.can_upload_to_documents_path(project_a::text || '/00000000-0000-0000-0000-000000000001/file.pdf') INTO raised;
      IF raised THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS upload_member_can_upload_to_project';
      ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL upload_member_can_upload_to_project'; END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL upload_member_can_upload_to_project: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    IF project_a IS NULL THEN
      v_skip := v_skip + 1; RAISE NOTICE 'SKIP upload_non_member_blocked (no seed)';
    ELSE
      PERFORM tests.authenticate_as(uid_b);
      SELECT public.can_upload_to_documents_path(project_a::text || '/00000000-0000-0000-0000-000000000002/file.pdf') INTO raised;
      IF NOT raised THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS upload_non_member_blocked';
      ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL upload_non_member_blocked'; END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL upload_non_member_blocked: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_a);
    SELECT public.can_upload_to_documents_path(uid_a::text || '/00000000-0000-0000-0000-000000000003/file.pdf') INTO raised;
    IF raised THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS upload_own_personal_scope_allowed';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL upload_own_personal_scope_allowed'; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL upload_own_personal_scope_allowed: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_b);
    SELECT public.can_upload_to_documents_path(uid_a::text || '/00000000-0000-0000-0000-000000000004/file.pdf') INTO raised;
    IF NOT raised THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS upload_other_personal_scope_blocked';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL upload_other_personal_scope_blocked'; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL upload_other_personal_scope_blocked: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_staff);
    SELECT public.can_upload_to_documents_path(uid_a::text || '/00000000-0000-0000-0000-000000000005/file.pdf') INTO raised;
    IF raised THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS upload_staff_can_upload_anywhere';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL upload_staff_can_upload_anywhere'; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL upload_staff_can_upload_anywhere: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    IF project_a IS NULL THEN
      v_skip := v_skip + 1; RAISE NOTICE 'SKIP register_document_upload_member_succeeds (no seed)';
    ELSE
      PERFORM tests.authenticate_as(uid_a);
      new_doc := public.register_document_upload(
        'RLS test upload',
        project_a::text || '/00000000-0000-0000-0000-000000000006/test.pdf',
        'application/pdf', 1024, 'rls-test-upload-' || gen_random_uuid()::text, project_a, 'contract'
      );
      IF new_doc.id IS NOT NULL AND new_doc.owner_user_id = uid_a THEN
        v_pass := v_pass + 1; RAISE NOTICE 'PASS register_document_upload_member_succeeds';
      ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL register_document_upload_member_succeeds'; END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL register_document_upload_member_succeeds: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    IF project_a IS NULL THEN
      v_skip := v_skip + 1; RAISE NOTICE 'SKIP register_document_upload_non_member_blocked (no seed)';
    ELSE
      PERFORM tests.authenticate_as(uid_b);
      raised := false;
      BEGIN
        PERFORM public.register_document_upload(
          'RLS test upload B', project_a::text || '/00000000-0000-0000-0000-000000000007/test.pdf',
          'application/pdf', 1024, 'rls-test-upload-b-' || gen_random_uuid()::text, project_a, 'contract'
        );
      EXCEPTION WHEN OTHERS THEN
        raised := true;
      END;
      IF raised THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS register_document_upload_non_member_blocked';
      ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL register_document_upload_non_member_blocked'; END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL register_document_upload_non_member_blocked: %', SQLERRM;
  END;

  v_tests := v_tests + 1;
  BEGIN
    PERFORM tests.authenticate_as(uid_a);
    raised := false;
    BEGIN
      PERFORM public.register_document_upload(
        'Blocked exe', uid_a::text || '/00000000-0000-0000-0000-000000000008/malware.exe',
        'application/x-msdownload', 1024, 'rls-test-exe-' || gen_random_uuid()::text
      );
    EXCEPTION WHEN OTHERS THEN
      raised := true;
    END;
    IF raised THEN v_pass := v_pass + 1; RAISE NOTICE 'PASS register_document_upload_blocks_executable';
    ELSE v_fail := v_fail + 1; RAISE NOTICE 'FAIL register_document_upload_blocks_executable'; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_fail := v_fail + 1; RAISE NOTICE 'FAIL register_document_upload_blocks_executable: %', SQLERRM;
  END;

  PERFORM tests.clear_auth();

  RAISE NOTICE 'RLS_SUITE_SUMMARY tests=% passed=% failed=% skipped=%', v_tests, v_pass, v_fail, v_skip;

  IF v_fail > 0 THEN
    RAISE EXCEPTION 'RLS suite failed: % failures of % tests (% skipped)', v_fail, v_tests, v_skip;
  END IF;
END;
$$;

