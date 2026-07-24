-- STATUS: NOT APPLIED (remote) -- local proposal only. Requires explicit owner approval before remote apply.
-- Secure Postgres RPCs for admin actions, quote acceptance/rejection, and
-- appointment booking. All functions are SECURITY DEFINER with explicit
-- role/ownership checks performed against auth.uid() -- RLS on the underlying
-- tables is intentionally bypassed only inside these functions, never for
-- direct table access. Every mutating RPC writes an audit log entry via
-- public.write_audit_log (no-op when public.audit_logs does not exist).
--
-- Idempotent: safe to re-run (CREATE OR REPLACE FUNCTION everywhere).

-- =====================================================================
-- 1. accept_quote
-- =====================================================================
CREATE OR REPLACE FUNCTION public.accept_quote(
  p_quote_id uuid,
  p_terms_version_id uuid DEFAULT NULL,
  p_confirmation boolean DEFAULT false
)
RETURNS public.quotes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_quote public.quotes;
  v_is_owner boolean;
  v_signature_name text;
  v_result public.quotes;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT p_confirmation THEN
    RAISE EXCEPTION 'Explicit confirmation is required to accept a quote';
  END IF;

  SELECT * INTO v_quote FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
  IF v_quote.id IS NULL THEN
    RAISE EXCEPTION 'Quote not found';
  END IF;

  v_is_owner := v_quote.customer_user_id = v_uid
    OR (
      v_quote.project_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = v_quote.project_id
          AND pm.user_id = v_uid
          AND pm.role = 'customer'
      )
    );
  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'Only the owning customer may accept this quote';
  END IF;

  IF v_quote.status NOT IN ('sent', 'viewed') THEN
    RAISE EXCEPTION 'Quote is not in an acceptable state (status=%)', v_quote.status;
  END IF;

  IF v_quote.valid_until IS NOT NULL AND v_quote.valid_until < current_date THEN
    UPDATE public.quotes SET status = 'expired' WHERE id = v_quote.id;
    RAISE EXCEPTION 'Quote has expired';
  END IF;

  IF EXISTS (SELECT 1 FROM public.quote_acceptances qa WHERE qa.quote_id = v_quote.id) THEN
    RAISE EXCEPTION 'Quote has already been accepted';
  END IF;

  SELECT coalesce(ap.full_name, ap.email, 'Customer')
    INTO v_signature_name
    FROM public.app_profiles ap
    WHERE ap.id = v_uid;
  v_signature_name := coalesce(v_signature_name, 'Customer');

  BEGIN
    INSERT INTO public.quote_acceptances (
      quote_id, accepted_by, signature_name, terms_version_id, metadata
    ) VALUES (
      v_quote.id, v_uid, v_signature_name,
      coalesce(p_terms_version_id, v_quote.terms_version_id),
      jsonb_build_object('source', 'rpc.accept_quote')
    );
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Quote has already been accepted';
  END;

  IF p_terms_version_id IS NOT NULL THEN
    INSERT INTO public.terms_acceptances (terms_version_id, user_id, context)
    VALUES (p_terms_version_id, v_uid, 'quote_acceptance')
    ON CONFLICT (terms_version_id, user_id) DO NOTHING;
  END IF;

  UPDATE public.quotes
  SET status = 'accepted',
      terms_version_id = coalesce(p_terms_version_id, terms_version_id)
  WHERE id = v_quote.id
  RETURNING * INTO v_result;

  PERFORM public.write_audit_log(
    'quote.accepted', 'quotes', v_quote.id,
    jsonb_build_object('terms_version_id', p_terms_version_id)
  );

  RETURN v_result;
END;
$$;

-- =====================================================================
-- 2. reject_quote
-- =====================================================================
CREATE OR REPLACE FUNCTION public.reject_quote(
  p_quote_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS public.quotes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_quote public.quotes;
  v_is_owner boolean;
  v_result public.quotes;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_quote FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
  IF v_quote.id IS NULL THEN
    RAISE EXCEPTION 'Quote not found';
  END IF;

  v_is_owner := v_quote.customer_user_id = v_uid
    OR (
      v_quote.project_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = v_quote.project_id
          AND pm.user_id = v_uid
          AND pm.role = 'customer'
      )
    );
  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'Only the owning customer may reject this quote';
  END IF;

  IF v_quote.status NOT IN ('sent', 'viewed') THEN
    RAISE EXCEPTION 'Quote is not in a rejectable state (status=%)', v_quote.status;
  END IF;

  UPDATE public.quotes
  SET status = 'rejected'
  WHERE id = v_quote.id
  RETURNING * INTO v_result;

  PERFORM public.write_audit_log(
    'quote.rejected', 'quotes', v_quote.id,
    jsonb_build_object('reason', p_reason)
  );

  RETURN v_result;
END;
$$;

-- =====================================================================
-- 3. approve_partner_application
-- =====================================================================
CREATE OR REPLACE FUNCTION public.approve_partner_application(
  p_application_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_app public.partner_applications;
  v_partner_id uuid;
  v_code text;
  v_attempt int := 0;
BEGIN
  IF NOT public.is_staff_or_above() THEN
    RAISE EXCEPTION 'Only staff can approve partner applications';
  END IF;

  SELECT * INTO v_app FROM public.partner_applications WHERE id = p_application_id FOR UPDATE;
  IF v_app.id IS NULL THEN
    RAISE EXCEPTION 'Partner application not found';
  END IF;

  IF v_app.user_id = v_uid THEN
    RAISE EXCEPTION 'Staff may not approve their own partner application';
  END IF;

  IF v_app.status NOT IN ('submitted', 'under_review') THEN
    RAISE EXCEPTION 'Application is not pending review (status=%)', v_app.status;
  END IF;

  UPDATE public.partner_applications
  SET status = 'approved', reviewed_by = v_uid, reviewed_at = timezone('utc', now()), review_notes = p_reason
  WHERE id = v_app.id;

  INSERT INTO public.user_roles (user_id, role, granted_by, notes)
  VALUES (v_app.user_id, 'partner', v_uid, 'approved via approve_partner_application')
  ON CONFLICT (user_id, role) DO UPDATE
    SET revoked_at = NULL, granted_by = v_uid, granted_at = timezone('utc', now());

  SELECT id INTO v_partner_id FROM public.partner_profiles WHERE user_id = v_app.user_id;
  IF v_partner_id IS NULL THEN
    INSERT INTO public.partner_profiles (
      user_id, application_id, display_name, company_name, is_active, approved_at
    ) VALUES (
      v_app.user_id, v_app.id, v_app.full_name, v_app.company_name, true, timezone('utc', now())
    )
    RETURNING id INTO v_partner_id;
  ELSE
    UPDATE public.partner_profiles
    SET is_active = true, approved_at = timezone('utc', now()), application_id = coalesce(application_id, v_app.id)
    WHERE id = v_partner_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.partner_codes WHERE partner_id = v_partner_id AND is_active = true
  ) THEN
    LOOP
      v_attempt := v_attempt + 1;
      v_code := upper(left(regexp_replace(coalesce(v_app.company_name, v_app.full_name, 'PARTNER'), '[^A-Za-z0-9]', '', 'g'), 10));
      IF v_code = '' THEN v_code := 'PARTNER'; END IF;
      v_code := v_code || '-' || upper(substr(md5(random()::text || v_attempt::text), 1, 4));
      BEGIN
        INSERT INTO public.partner_codes (partner_id, code, is_active, campaign)
        VALUES (v_partner_id, v_code, true, 'auto-approval');
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        IF v_attempt >= 5 THEN
          EXIT;
        END IF;
      END;
    END LOOP;
  END IF;

  PERFORM public.write_audit_log(
    'partner_application.approved', 'partner_applications', v_app.id,
    jsonb_build_object('partner_id', v_partner_id, 'reason', p_reason)
  );

  RETURN jsonb_build_object(
    'id', v_app.id, 'status', 'approved', 'partnerId', v_partner_id
  );
END;
$$;

-- =====================================================================
-- 4. reject_partner_application
-- =====================================================================
CREATE OR REPLACE FUNCTION public.reject_partner_application(
  p_application_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_app public.partner_applications;
BEGIN
  IF NOT public.is_staff_or_above() THEN
    RAISE EXCEPTION 'Only staff can reject partner applications';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'A rejection reason is required';
  END IF;

  SELECT * INTO v_app FROM public.partner_applications WHERE id = p_application_id FOR UPDATE;
  IF v_app.id IS NULL THEN
    RAISE EXCEPTION 'Partner application not found';
  END IF;

  IF v_app.status NOT IN ('submitted', 'under_review') THEN
    RAISE EXCEPTION 'Application is not pending review (status=%)', v_app.status;
  END IF;

  UPDATE public.partner_applications
  SET status = 'rejected', reviewed_by = v_uid, reviewed_at = timezone('utc', now()), review_notes = p_reason
  WHERE id = v_app.id;

  PERFORM public.write_audit_log(
    'partner_application.rejected', 'partner_applications', v_app.id,
    jsonb_build_object('reason', p_reason)
  );

  RETURN jsonb_build_object('id', v_app.id, 'status', 'rejected');
END;
$$;

-- =====================================================================
-- 5. suspend_partner
-- =====================================================================
CREATE OR REPLACE FUNCTION public.suspend_partner(
  p_partner_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_partner public.partner_profiles;
BEGIN
  IF NOT public.is_staff_or_above() THEN
    RAISE EXCEPTION 'Only staff can suspend partners';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'A suspension reason is required';
  END IF;

  SELECT * INTO v_partner FROM public.partner_profiles WHERE id = p_partner_id FOR UPDATE;
  IF v_partner.id IS NULL THEN
    RAISE EXCEPTION 'Partner not found';
  END IF;

  UPDATE public.partner_profiles SET is_active = false WHERE id = v_partner.id;

  IF v_partner.application_id IS NOT NULL THEN
    UPDATE public.partner_applications
    SET status = 'suspended', reviewed_by = v_uid, reviewed_at = timezone('utc', now()), review_notes = p_reason
    WHERE id = v_partner.application_id;
  END IF;

  PERFORM public.write_audit_log(
    'partner.suspended', 'partner_profiles', v_partner.id,
    jsonb_build_object('reason', p_reason)
  );

  RETURN jsonb_build_object('id', v_partner.id, 'isActive', false);
END;
$$;

-- =====================================================================
-- 6. approve_commission
-- =====================================================================
CREATE OR REPLACE FUNCTION public.approve_commission(
  p_commission_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_commission public.commissions;
  v_is_owner boolean;
BEGIN
  IF NOT public.is_staff_or_above() THEN
    RAISE EXCEPTION 'Only staff can approve commissions';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'An approval reason is required';
  END IF;

  SELECT * INTO v_commission FROM public.commissions WHERE id = p_commission_id FOR UPDATE;
  IF v_commission.id IS NULL THEN
    RAISE EXCEPTION 'Commission not found';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.partner_profiles pp
    WHERE pp.id = v_commission.partner_id AND pp.user_id = v_uid
  ) INTO v_is_owner;
  IF v_is_owner THEN
    RAISE EXCEPTION 'Staff may not approve commissions for their own partner account';
  END IF;

  IF v_commission.status <> 'under_review' THEN
    RAISE EXCEPTION 'Commission is not under review (status=%)', v_commission.status;
  END IF;

  UPDATE public.commissions
  SET status = 'approved', approved_by = v_uid, approved_at = timezone('utc', now())
  WHERE id = v_commission.id;

  PERFORM public.write_audit_log(
    'commission.approved', 'commissions', v_commission.id,
    jsonb_build_object('reason', p_reason)
  );

  RETURN jsonb_build_object('id', v_commission.id, 'status', 'approved');
END;
$$;

-- =====================================================================
-- 7. reject_commission
-- =====================================================================
CREATE OR REPLACE FUNCTION public.reject_commission(
  p_commission_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_commission public.commissions;
  v_is_owner boolean;
BEGIN
  IF NOT public.is_staff_or_above() THEN
    RAISE EXCEPTION 'Only staff can reject commissions';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'A rejection reason is required';
  END IF;

  SELECT * INTO v_commission FROM public.commissions WHERE id = p_commission_id FOR UPDATE;
  IF v_commission.id IS NULL THEN
    RAISE EXCEPTION 'Commission not found';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.partner_profiles pp
    WHERE pp.id = v_commission.partner_id AND pp.user_id = v_uid
  ) INTO v_is_owner;
  IF v_is_owner THEN
    RAISE EXCEPTION 'Staff may not reject commissions for their own partner account';
  END IF;

  IF v_commission.status <> 'under_review' THEN
    RAISE EXCEPTION 'Commission is not under review (status=%)', v_commission.status;
  END IF;

  UPDATE public.commissions
  SET status = 'rejected', rejection_reason = p_reason
  WHERE id = v_commission.id;

  PERFORM public.write_audit_log(
    'commission.rejected', 'commissions', v_commission.id,
    jsonb_build_object('reason', p_reason)
  );

  RETURN jsonb_build_object('id', v_commission.id, 'status', 'rejected');
END;
$$;

-- =====================================================================
-- 8. process_payout_request
-- =====================================================================
CREATE OR REPLACE FUNCTION public.process_payout_request(
  p_payout_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_payout public.payout_requests;
  v_flag_enabled boolean;
  v_paid_commissions int;
BEGIN
  IF NOT public.is_staff_or_above() THEN
    RAISE EXCEPTION 'Only staff can process payout requests';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'A reason is required to process a payout request';
  END IF;

  IF to_regclass('public.feature_flags') IS NOT NULL THEN
    SELECT COALESCE(bool_or(enabled), false)
      INTO v_flag_enabled
    FROM public.feature_flags
    WHERE key IN ('partner_payouts', 'partner.payouts');
    IF v_flag_enabled IS NOT NULL AND NOT v_flag_enabled THEN
      RAISE EXCEPTION 'Partner payouts are currently disabled';
    END IF;
  END IF;

  SELECT * INTO v_payout FROM public.payout_requests WHERE id = p_payout_id FOR UPDATE;
  IF v_payout.id IS NULL THEN
    RAISE EXCEPTION 'Payout request not found';
  END IF;

  IF v_payout.status NOT IN ('submitted', 'under_review', 'approved') THEN
    RAISE EXCEPTION 'Payout request is not payable (status=%)', v_payout.status;
  END IF;

  UPDATE public.payout_requests
  SET status = 'paid',
      paid_at = timezone('utc', now()),
      reviewed_by = v_uid,
      reviewed_at = timezone('utc', now()),
      notes = coalesce(notes || E'\n', '') || p_reason
  WHERE id = v_payout.id;

  UPDATE public.commissions
  SET status = 'paid', paid_at = timezone('utc', now())
  WHERE partner_id = v_payout.partner_id AND status = 'payout_requested';
  GET DIAGNOSTICS v_paid_commissions = ROW_COUNT;

  PERFORM public.write_audit_log(
    'payout_request.paid', 'payout_requests', v_payout.id,
    jsonb_build_object('reason', p_reason, 'commissionsMarkedPaid', v_paid_commissions)
  );

  RETURN jsonb_build_object('id', v_payout.id, 'status', 'paid', 'commissionsMarkedPaid', v_paid_commissions);
END;
$$;

-- =====================================================================
-- 9. book_appointment_slot
-- =====================================================================
CREATE OR REPLACE FUNCTION public.book_appointment_slot(
  p_slot_id uuid,
  p_title text,
  p_notes text DEFAULT NULL
)
RETURNS public.appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_slot public.availability_slots;
  v_notes text;
  v_result public.appointments;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RAISE EXCEPTION 'A title is required to book an appointment';
  END IF;

  SELECT * INTO v_slot FROM public.availability_slots WHERE id = p_slot_id FOR UPDATE;
  IF v_slot.id IS NULL THEN
    RAISE EXCEPTION 'Slot not found';
  END IF;

  IF NOT v_slot.is_bookable OR v_slot.booked_count >= v_slot.capacity THEN
    RAISE EXCEPTION 'Slot unavailable';
  END IF;

  v_notes := p_title;
  IF p_notes IS NOT NULL AND length(trim(p_notes)) > 0 THEN
    v_notes := p_title || ' - ' || p_notes;
  END IF;

  -- public.trg_appointment_slot_capacity performs the atomic booked_count
  -- claim on INSERT and raises 'Slot unavailable' if capacity is exhausted,
  -- guaranteeing no double-booking even under concurrent requests.
  INSERT INTO public.appointments (
    customer_user_id, slot_id, status, starts_at, ends_at, timezone, notes
  ) VALUES (
    v_uid, v_slot.id, 'requested', v_slot.starts_at, v_slot.ends_at, v_slot.timezone, v_notes
  )
  RETURNING * INTO v_result;

  PERFORM public.write_audit_log(
    'appointment.booked', 'appointments', v_result.id,
    jsonb_build_object('slot_id', v_slot.id)
  );

  RETURN v_result;
END;
$$;

-- =====================================================================
-- 10. cancel_appointment
-- =====================================================================
CREATE OR REPLACE FUNCTION public.cancel_appointment(
  p_appointment_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS public.appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_appointment public.appointments;
  v_result public.appointments;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_appointment FROM public.appointments WHERE id = p_appointment_id FOR UPDATE;
  IF v_appointment.id IS NULL THEN
    RAISE EXCEPTION 'Appointment not found';
  END IF;

  IF v_appointment.customer_user_id <> v_uid AND NOT public.is_staff_or_above() THEN
    RAISE EXCEPTION 'Only the owning customer or staff may cancel this appointment';
  END IF;

  IF v_appointment.status IN ('cancelled', 'completed', 'no_show') THEN
    RAISE EXCEPTION 'Appointment is already finalized (status=%)', v_appointment.status;
  END IF;

  -- public.trg_appointment_slot_capacity frees the linked slot automatically
  -- on this status transition.
  UPDATE public.appointments
  SET status = 'cancelled',
      cancelled_at = timezone('utc', now()),
      cancellation_reason = p_reason
  WHERE id = v_appointment.id
  RETURNING * INTO v_result;

  PERFORM public.write_audit_log(
    'appointment.cancelled', 'appointments', v_appointment.id,
    jsonb_build_object('reason', p_reason)
  );

  RETURN v_result;
END;
$$;

-- =====================================================================
-- 11. create_project_from_request
-- =====================================================================
CREATE OR REPLACE FUNCTION public.create_project_from_request(
  p_project_id uuid,
  p_status text DEFAULT 'intake'
)
RETURNS public.projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_project public.projects;
  v_result public.projects;
BEGIN
  IF NOT public.is_staff_or_above() THEN
    RAISE EXCEPTION 'Only staff can convert a project request';
  END IF;

  SELECT * INTO v_project FROM public.projects WHERE id = p_project_id FOR UPDATE;
  IF v_project.id IS NULL THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  IF v_project.status <> 'request_received' THEN
    RAISE EXCEPTION 'Project is not in request_received state (status=%)', v_project.status;
  END IF;

  UPDATE public.projects
  SET status = p_status::public.project_status, owner_staff_id = coalesce(owner_staff_id, v_uid)
  WHERE id = v_project.id
  RETURNING * INTO v_result;

  IF v_project.customer_user_id IS NOT NULL THEN
    INSERT INTO public.project_members (project_id, user_id, role, invited_by)
    VALUES (v_project.id, v_project.customer_user_id, 'customer', v_uid)
    ON CONFLICT (project_id, user_id) DO NOTHING;
  END IF;

  INSERT INTO public.project_members (project_id, user_id, role, invited_by)
  VALUES (v_project.id, v_uid, 'staff', v_uid)
  ON CONFLICT (project_id, user_id) DO NOTHING;

  PERFORM public.write_audit_log(
    'project.created_from_request', 'projects', v_project.id,
    jsonb_build_object('status', p_status)
  );

  RETURN v_result;
END;
$$;

-- =====================================================================
-- 12. mark_document_scan_clean (DEV ONLY helper)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.mark_document_scan_clean(
  p_version_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version public.document_versions;
BEGIN
  -- Local/dev helper only. Requires staff (or service_role, which bypasses
  -- RLS/definer checks entirely). We deliberately do not special-case
  -- `current_setting('app.env')` here: this repo has no production
  -- Supabase project wired up, so the only real guard available is
  -- is_staff_or_above() -- keep this function staff-gated everywhere.
  IF NOT public.is_staff_or_above() THEN
    RAISE EXCEPTION 'Only staff can mark a document scan clean';
  END IF;

  SELECT * INTO v_version FROM public.document_versions WHERE id = p_version_id FOR UPDATE;
  IF v_version.id IS NULL THEN
    RAISE EXCEPTION 'Document version not found';
  END IF;

  UPDATE public.document_versions SET scan_status = 'clean' WHERE id = v_version.id;

  PERFORM public.write_audit_log(
    'document_version.scan_marked_clean', 'document_versions', v_version.id, '{}'::jsonb
  );

  RETURN jsonb_build_object('id', v_version.id, 'scanStatus', 'clean');
END;
$$;

-- =====================================================================
-- 13. admin_dashboard_stats
-- =====================================================================
CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_staff_or_above() THEN
    RAISE EXCEPTION 'Only staff can view admin dashboard stats';
  END IF;

  SELECT jsonb_build_object(
    'open_partner_applications', (
      SELECT count(*) FROM public.partner_applications WHERE status = 'submitted'
    ),
    'open_tickets', (
      SELECT count(*) FROM public.support_tickets
      WHERE status IN ('open', 'in_progress', 'waiting_on_customer')
    ),
    'unread_messages', (
      SELECT count(*) FROM public.message_receipts WHERE read_at IS NULL
    ),
    'documents_pending_review', (
      SELECT count(*) FROM public.documents WHERE status = 'under_review'
    ),
    'open_payments', (
      SELECT count(*) FROM public.payment_events WHERE status IN ('open', 'pending', 'authorized')
    ),
    'commissions_under_review', (
      SELECT count(*) FROM public.commissions WHERE status = 'under_review'
    ),
    'payout_requests', (
      SELECT count(*) FROM public.payout_requests WHERE status IN ('submitted', 'under_review')
    ),
    'upcoming_appointments', (
      SELECT count(*) FROM public.appointments
      WHERE starts_at >= timezone('utc', now()) AND status IN ('requested', 'confirmed')
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- =====================================================================
-- 14. admin_work_queue
-- =====================================================================
CREATE OR REPLACE FUNCTION public.admin_work_queue()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_staff_or_above() THEN
    RAISE EXCEPTION 'Only staff can view the admin work queue';
  END IF;

  SELECT coalesce(jsonb_agg(item ORDER BY (item->>'created_at') DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id', a.id,
      'type', 'partner_application',
      'title', 'Partneraanvraag - ' || coalesce(a.company_name, a.full_name),
      'subtitle', 'Ingediend door ' || a.email,
      'created_at', a.created_at,
      'priority', 'high',
      'company_name', a.company_name,
      'email', a.email
    ) AS item
    FROM (
      SELECT * FROM public.partner_applications
      WHERE status = 'submitted'
      ORDER BY created_at DESC
      LIMIT 20
    ) a

    UNION ALL

    SELECT jsonb_build_object(
      'id', t.id,
      'type', 'support_ticket',
      'title', t.subject,
      'subtitle', 'Prioriteit ' || t.priority,
      'created_at', t.created_at,
      'priority', CASE WHEN t.priority IN ('urgent', 'high') THEN 'high' ELSE 'medium' END
    ) AS item
    FROM (
      SELECT * FROM public.support_tickets
      WHERE status = 'open'
      ORDER BY created_at DESC
      LIMIT 20
    ) t

    UNION ALL

    SELECT jsonb_build_object(
      'id', c.id,
      'type', 'commission_review',
      'title', 'Commissie under review',
      'subtitle', to_char(c.commission_amount_cents / 100.0, 'FM999999990.00') || ' ' || c.currency,
      'created_at', c.created_at,
      'priority', 'medium'
    ) AS item
    FROM (
      SELECT * FROM public.commissions
      WHERE status = 'under_review'
      ORDER BY created_at DESC
      LIMIT 20
    ) c

    UNION ALL

    SELECT jsonb_build_object(
      'id', p.id,
      'type', 'payout_request',
      'title', 'Uitbetalingsverzoek',
      'subtitle', to_char(p.amount_cents / 100.0, 'FM999999990.00') || ' ' || p.currency,
      'created_at', p.created_at,
      'priority', 'high'
    ) AS item
    FROM (
      SELECT * FROM public.payout_requests
      WHERE status IN ('submitted', 'under_review')
      ORDER BY created_at DESC
      LIMIT 20
    ) p
  ) queue_items;

  RETURN v_result;
END;
$$;

-- =====================================================================
-- Grants: authenticated + service_role only. Never PUBLIC/anon.
-- =====================================================================
REVOKE ALL ON FUNCTION public.accept_quote(uuid, uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_quote(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_partner_application(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_partner_application(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.suspend_partner(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_commission(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_commission(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_payout_request(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.book_appointment_slot(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_appointment(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_project_from_request(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_document_scan_clean(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_dashboard_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_work_queue() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.accept_quote(uuid, uuid, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_quote(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_partner_application(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_partner_application(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.suspend_partner(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_commission(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_commission(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_payout_request(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.book_appointment_slot(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_appointment(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_project_from_request(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_document_scan_clean(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_work_queue() TO authenticated, service_role;

-- =====================================================================
-- 15. Storage: private 'documents' bucket + RLS mirroring document_versions
--     visibility (used by documentsRepository.createSignedUrl).
-- =====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS documents_bucket_select ON storage.objects;
CREATE POLICY documents_bucket_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1
      FROM public.document_versions dv
      JOIN public.documents d ON d.id = dv.document_id
      WHERE dv.storage_path = storage.objects.name
        AND (
          d.owner_user_id = auth.uid()
          OR (d.project_id IS NOT NULL AND public.is_project_member(d.project_id))
          OR public.is_staff_or_above()
        )
        AND (dv.scan_status = 'clean' OR public.is_staff_or_above())
    )
  );
