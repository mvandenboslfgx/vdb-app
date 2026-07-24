-- STATUS: NOT APPLIED (remote) -- local proposal only. Requires explicit owner approval before remote apply.
-- Partner payout self-service (Goal C) + admin support ticket replies (Goal D).
-- Idempotent: safe to re-run (CREATE OR REPLACE FUNCTION / IF NOT EXISTS everywhere).

-- =====================================================================
-- GOAL C: PARTNER PAYOUT REQUESTS
-- =====================================================================

-- Idempotent client-side retries for admin ticket replies (mirrors
-- public.messages.client_message_id, see 20260720100600_messaging.sql).
ALTER TABLE public.support_ticket_messages ADD COLUMN IF NOT EXISTS client_message_id text;

CREATE UNIQUE INDEX IF NOT EXISTS support_ticket_messages_client_message_id_uq
  ON public.support_ticket_messages (ticket_id, client_message_id)
  WHERE client_message_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- request_commission_payout: active, non-suspended partners only. Fails
-- closed when the `partner_payouts` feature flag is disabled. Only ever
-- touches commissions that are currently `payable` and belong to the
-- calling partner -- rows are locked with FOR UPDATE before being
-- re-checked, so a concurrent request can never grab the same commission
-- twice (the classic SELECT-then-lock idiom: Postgres re-evaluates each
-- locked row's current state before it is returned to the aggregate).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_commission_payout(
  p_commission_ids uuid[] DEFAULT NULL,
  p_amount_cents int DEFAULT NULL,
  p_payout_account_id uuid DEFAULT NULL
)
RETURNS public.payout_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_partner_id uuid;
  v_partner public.partner_profiles;
  v_flag_enabled boolean;
  v_account_id uuid;
  v_commission_ids uuid[];
  v_total_cents int;
  v_amount_cents int;
  v_invalid_count int := 0;
  v_requested_count int := 0;
  v_result public.payout_requests;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_partner_id := public.current_partner_id();
  IF v_partner_id IS NULL THEN
    RAISE EXCEPTION 'Only active partners may request payouts';
  END IF;

  SELECT * INTO v_partner FROM public.partner_profiles WHERE id = v_partner_id FOR UPDATE;
  IF v_partner.id IS NULL OR NOT coalesce(v_partner.is_active, false) THEN
    RAISE EXCEPTION 'Your partner account is suspended';
  END IF;

  v_flag_enabled := NULL;
  IF to_regclass('public.feature_flags') IS NOT NULL THEN
    SELECT COALESCE(bool_or(enabled), false)
      INTO v_flag_enabled
    FROM public.feature_flags
    WHERE key IN ('partner_payouts', 'partner.payouts');
  END IF;
  IF NOT coalesce(v_flag_enabled, false) THEN
    RAISE EXCEPTION 'FEATURE_NOT_CONFIGURED: partner payouts are currently disabled';
  END IF;

  IF p_commission_ids IS NOT NULL AND array_length(p_commission_ids, 1) > 0 THEN
    -- Lock every referenced row regardless of its current status/owner, then
    -- classify: only rows still `payable` AND owned by this partner count.
    SELECT
      array_agg(c.id) FILTER (WHERE c.partner_id = v_partner_id AND c.status = 'payable'),
      coalesce(sum(c.commission_amount_cents) FILTER (WHERE c.partner_id = v_partner_id AND c.status = 'payable'), 0),
      count(*) FILTER (WHERE c.partner_id <> v_partner_id OR c.status <> 'payable'),
      count(*)
    INTO v_commission_ids, v_total_cents, v_invalid_count, v_requested_count
    FROM (
      SELECT id, partner_id, status, commission_amount_cents
      FROM public.commissions
      WHERE id = ANY(p_commission_ids)
      FOR UPDATE
    ) c;

    IF v_requested_count < array_length(p_commission_ids, 1) THEN
      RAISE EXCEPTION 'One or more commissions were not found';
    END IF;
    IF v_invalid_count > 0 THEN
      RAISE EXCEPTION 'One or more commissions are not payable or do not belong to you';
    END IF;
  ELSE
    SELECT array_agg(c.id), coalesce(sum(c.commission_amount_cents), 0)
    INTO v_commission_ids, v_total_cents
    FROM (
      SELECT id, commission_amount_cents
      FROM public.commissions
      WHERE partner_id = v_partner_id AND status = 'payable'
      FOR UPDATE
    ) c;
  END IF;

  IF v_commission_ids IS NULL OR array_length(v_commission_ids, 1) = 0 THEN
    RAISE EXCEPTION 'No payable commissions available for payout';
  END IF;

  v_amount_cents := coalesce(p_amount_cents, v_total_cents);
  IF v_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Payout amount must be greater than zero';
  END IF;
  IF v_amount_cents > v_total_cents THEN
    RAISE EXCEPTION 'Requested amount exceeds your payable balance';
  END IF;

  v_account_id := p_payout_account_id;
  IF v_account_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.payout_accounts
    WHERE id = v_account_id AND partner_id = v_partner_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Payout account not found for your partner profile';
  END IF;
  IF v_account_id IS NULL THEN
    SELECT id INTO v_account_id FROM public.payout_accounts
    WHERE partner_id = v_partner_id AND deleted_at IS NULL
    ORDER BY is_default DESC, created_at DESC
    LIMIT 1;
  END IF;
  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'Add a payout account before requesting a payout';
  END IF;

  INSERT INTO public.payout_requests (
    partner_id, payout_account_id, status, amount_cents, currency, submitted_at
  ) VALUES (
    v_partner_id, v_account_id, 'submitted', v_amount_cents, 'EUR', timezone('utc', now())
  )
  RETURNING * INTO v_result;

  UPDATE public.commissions
  SET status = 'payout_requested'
  WHERE id = ANY(v_commission_ids);

  PERFORM public.write_audit_log(
    'payout_request.submitted', 'payout_requests', v_result.id,
    jsonb_build_object('amountCents', v_amount_cents, 'commissionIds', v_commission_ids)
  );

  RETURN v_result;
END;
$$;

-- ---------------------------------------------------------------------
-- reject_payout_request: staff-only, reason required. Reverts the
-- partner's in-flight commissions back to `payable` -- mirrors the same
-- partner-scoped (not per-request) matching already used by
-- `process_payout_request` (20260720101500), since commissions carry no
-- payout_request_id column. A partner is only ever expected to have one
-- in-flight batch at a time under this schema.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_payout_request(
  p_payout_id uuid,
  p_reason text
)
RETURNS public.payout_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_payout public.payout_requests;
  v_result public.payout_requests;
  v_reverted int;
BEGIN
  IF NOT public.is_staff_or_above() THEN
    RAISE EXCEPTION 'Only staff can reject payout requests';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'A reason is required to reject a payout request';
  END IF;

  SELECT * INTO v_payout FROM public.payout_requests WHERE id = p_payout_id FOR UPDATE;
  IF v_payout.id IS NULL THEN
    RAISE EXCEPTION 'Payout request not found';
  END IF;

  IF v_payout.status NOT IN ('submitted', 'under_review') THEN
    RAISE EXCEPTION 'Payout request is not pending review (status=%)', v_payout.status;
  END IF;

  UPDATE public.payout_requests
  SET status = 'rejected',
      reviewed_by = v_uid,
      reviewed_at = timezone('utc', now()),
      notes = coalesce(notes || E'\n', '') || p_reason
  WHERE id = v_payout.id
  RETURNING * INTO v_result;

  UPDATE public.commissions
  SET status = 'payable'
  WHERE partner_id = v_payout.partner_id AND status = 'payout_requested';
  GET DIAGNOSTICS v_reverted = ROW_COUNT;

  PERFORM public.write_audit_log(
    'payout_request.rejected', 'payout_requests', v_payout.id,
    jsonb_build_object('reason', p_reason, 'commissionsReverted', v_reverted)
  );

  RETURN v_result;
END;
$$;

-- `process_payout_request` (staff-only, marks a submitted/under_review/
-- approved payout `paid` and its partner's payout_requested commissions
-- `paid`) already exists from 20260720101500_admin_rpcs_and_quote_accept.sql
-- -- intentionally left untouched here.

-- =====================================================================
-- GOAL D: ADMIN SUPPORT TICKET DETAIL + REPLIES
-- =====================================================================

-- ---------------------------------------------------------------------
-- admin_reply_support_ticket: staff-only. Public replies flip the ticket
-- to `waiting_on_customer` (the customer owes the next response);
-- internal notes never change ticket status and are only ever visible to
-- staff (see support_ticket_messages_select in 20260720101300_rls_policies.sql).
-- Idempotent on p_client_message_id.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_reply_support_ticket(
  p_ticket_id uuid,
  p_body text,
  p_is_internal boolean DEFAULT false,
  p_client_message_id text DEFAULT NULL
)
RETURNS public.support_ticket_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ticket public.support_tickets;
  v_existing public.support_ticket_messages;
  v_result public.support_ticket_messages;
BEGIN
  IF NOT public.is_staff_or_above() THEN
    RAISE EXCEPTION 'Only staff can reply to support tickets';
  END IF;

  IF p_body IS NULL OR length(trim(p_body)) = 0 THEN
    RAISE EXCEPTION 'A reply body is required';
  END IF;

  SELECT * INTO v_ticket FROM public.support_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF v_ticket.id IS NULL THEN
    RAISE EXCEPTION 'Support ticket not found';
  END IF;

  IF p_client_message_id IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.support_ticket_messages
    WHERE ticket_id = v_ticket.id AND client_message_id = p_client_message_id;
    IF v_existing.id IS NOT NULL THEN
      RETURN v_existing;
    END IF;
  END IF;

  INSERT INTO public.support_ticket_messages (
    ticket_id, author_id, body, is_internal, client_message_id
  ) VALUES (
    v_ticket.id, v_uid, trim(p_body), coalesce(p_is_internal, false), p_client_message_id
  )
  RETURNING * INTO v_result;

  IF NOT coalesce(p_is_internal, false) THEN
    UPDATE public.support_tickets
    SET status = 'waiting_on_customer'
    WHERE id = v_ticket.id AND status NOT IN ('resolved', 'closed');
  END IF;

  PERFORM public.write_audit_log(
    'support_ticket.replied', 'support_tickets', v_ticket.id,
    jsonb_build_object('messageId', v_result.id, 'isInternal', coalesce(p_is_internal, false))
  );

  RETURN v_result;
END;
$$;

-- ---------------------------------------------------------------------
-- admin_update_ticket_status: staff-only. p_reason is required when
-- closing/resolving so there is always a record of why. Optionally
-- reassigns the ticket in the same call.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_update_ticket_status(
  p_ticket_id uuid,
  p_status text,
  p_reason text DEFAULT NULL,
  p_assignee uuid DEFAULT NULL
)
RETURNS public.support_tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ticket public.support_tickets;
  v_result public.support_tickets;
  v_status public.support_ticket_status;
  v_allowed text[] := ARRAY['open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed'];
BEGIN
  IF NOT public.is_staff_or_above() THEN
    RAISE EXCEPTION 'Only staff can update ticket status';
  END IF;

  IF p_status IS NULL OR NOT (p_status = ANY (v_allowed)) THEN
    RAISE EXCEPTION 'Invalid ticket status: %', p_status;
  END IF;
  v_status := p_status::public.support_ticket_status;

  SELECT * INTO v_ticket FROM public.support_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF v_ticket.id IS NULL THEN
    RAISE EXCEPTION 'Support ticket not found';
  END IF;

  IF v_status IN ('resolved', 'closed') AND (p_reason IS NULL OR length(trim(p_reason)) = 0) THEN
    RAISE EXCEPTION 'A reason is required to resolve or close a ticket';
  END IF;

  IF p_assignee IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p_assignee
      AND ur.role::text = ANY (ARRAY['staff', 'admin', 'owner'])
      AND ur.revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Assignee must be a staff member';
  END IF;

  UPDATE public.support_tickets
  SET status = v_status,
      assigned_to = coalesce(p_assignee, assigned_to),
      resolved_at = CASE WHEN v_status = 'resolved' THEN timezone('utc', now()) ELSE resolved_at END,
      closed_at = CASE WHEN v_status = 'closed' THEN timezone('utc', now()) ELSE closed_at END
  WHERE id = v_ticket.id
  RETURNING * INTO v_result;

  PERFORM public.write_audit_log(
    'support_ticket.status_changed', 'support_tickets', v_ticket.id,
    jsonb_build_object('from', v_ticket.status, 'to', v_status, 'reason', p_reason)
  );

  RETURN v_result;
END;
$$;

-- ---------------------------------------------------------------------
-- admin_assign_ticket: staff-only. Assignee must themselves be staff.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_assign_ticket(
  p_ticket_id uuid,
  p_assignee uuid
)
RETURNS public.support_tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket public.support_tickets;
  v_result public.support_tickets;
BEGIN
  IF NOT public.is_staff_or_above() THEN
    RAISE EXCEPTION 'Only staff can assign support tickets';
  END IF;

  IF p_assignee IS NULL THEN
    RAISE EXCEPTION 'An assignee is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p_assignee
      AND ur.role::text = ANY (ARRAY['staff', 'admin', 'owner'])
      AND ur.revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Assignee must be a staff member';
  END IF;

  SELECT * INTO v_ticket FROM public.support_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF v_ticket.id IS NULL THEN
    RAISE EXCEPTION 'Support ticket not found';
  END IF;

  UPDATE public.support_tickets
  SET assigned_to = p_assignee
  WHERE id = v_ticket.id
  RETURNING * INTO v_result;

  PERFORM public.write_audit_log(
    'support_ticket.assigned', 'support_tickets', v_ticket.id,
    jsonb_build_object('assignee', p_assignee)
  );

  RETURN v_result;
END;
$$;

-- =====================================================================
-- Grants: authenticated + service_role only. Never PUBLIC/anon.
-- =====================================================================
REVOKE ALL ON FUNCTION public.request_commission_payout(uuid[], int, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_payout_request(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_reply_support_ticket(uuid, text, boolean, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_update_ticket_status(uuid, text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_assign_ticket(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.request_commission_payout(uuid[], int, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_payout_request(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_reply_support_ticket(uuid, text, boolean, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_ticket_status(uuid, text, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_assign_ticket(uuid, uuid) TO authenticated, service_role;
