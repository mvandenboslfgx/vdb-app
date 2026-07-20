-- STATUS: NOT APPLIED -- local proposal only. Requires explicit owner approval before remote apply.
-- RLS policies for mobile-portal tables. Existing remote table policies are left untouched.

-- ---------- helpers used in policies ----------
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = p_project_id AND pm.user_id = auth.uid()
  ) OR public.is_staff_or_above();
$$;

CREATE OR REPLACE FUNCTION public.is_conversation_participant(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = p_conversation_id
      AND cp.user_id = auth.uid()
      AND cp.left_at IS NULL
  ) OR public.is_staff_or_above();
$$;

CREATE OR REPLACE FUNCTION public.current_partner_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pp.id FROM public.partner_profiles pp
  WHERE pp.user_id = auth.uid() AND pp.deleted_at IS NULL
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.is_project_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_partner_id() TO authenticated, service_role;

-- ---------- user_roles ----------
DROP POLICY IF EXISTS user_roles_select_own_or_staff ON public.user_roles;
CREATE POLICY user_roles_select_own_or_staff ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_above());

DROP POLICY IF EXISTS user_roles_staff_write ON public.user_roles;
CREATE POLICY user_roles_staff_write ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_staff_or_above())
  WITH CHECK (public.is_staff_or_above());

-- ---------- partner domain ----------
DROP POLICY IF EXISTS partner_applications_own ON public.partner_applications;
CREATE POLICY partner_applications_own ON public.partner_applications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_above());

DROP POLICY IF EXISTS partner_applications_insert_own ON public.partner_applications;
CREATE POLICY partner_applications_insert_own ON public.partner_applications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS partner_applications_update_own_draft ON public.partner_applications;
CREATE POLICY partner_applications_update_own_draft ON public.partner_applications
  FOR UPDATE TO authenticated
  USING (
    (user_id = auth.uid() AND status IN ('draft', 'submitted'))
    OR public.is_staff_or_above()
  )
  WITH CHECK (
    (user_id = auth.uid() AND status IN ('draft', 'submitted', 'under_review'))
    OR public.is_staff_or_above()
  );

DROP POLICY IF EXISTS partner_profiles_select ON public.partner_profiles;
CREATE POLICY partner_profiles_select ON public.partner_profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_above() OR is_active = true);

DROP POLICY IF EXISTS partner_profiles_staff_write ON public.partner_profiles;
CREATE POLICY partner_profiles_staff_write ON public.partner_profiles
  FOR ALL TO authenticated
  USING (public.is_staff_or_above())
  WITH CHECK (public.is_staff_or_above());

DROP POLICY IF EXISTS partner_codes_select ON public.partner_codes;
CREATE POLICY partner_codes_select ON public.partner_codes
  FOR SELECT TO authenticated
  USING (partner_id = public.current_partner_id() OR public.is_staff_or_above());

DROP POLICY IF EXISTS partner_codes_staff_write ON public.partner_codes;
CREATE POLICY partner_codes_staff_write ON public.partner_codes
  FOR ALL TO authenticated
  USING (public.is_staff_or_above())
  WITH CHECK (public.is_staff_or_above());

DROP POLICY IF EXISTS partner_links_select ON public.partner_links;
CREATE POLICY partner_links_select ON public.partner_links
  FOR SELECT TO authenticated
  USING (partner_id = public.current_partner_id() OR public.is_staff_or_above() OR is_active = true);

DROP POLICY IF EXISTS partner_links_staff_write ON public.partner_links;
CREATE POLICY partner_links_staff_write ON public.partner_links
  FOR ALL TO authenticated
  USING (public.is_staff_or_above())
  WITH CHECK (public.is_staff_or_above());

-- ---------- sales / commissions ----------
DROP POLICY IF EXISTS sales_select ON public.sales;
CREATE POLICY sales_select ON public.sales
  FOR SELECT TO authenticated
  USING (
    customer_user_id = auth.uid()
    OR partner_id = public.current_partner_id()
    OR public.is_staff_or_above()
  );

DROP POLICY IF EXISTS sales_staff_write ON public.sales;
CREATE POLICY sales_staff_write ON public.sales
  FOR ALL TO authenticated
  USING (public.is_staff_or_above())
  WITH CHECK (public.is_staff_or_above());

DROP POLICY IF EXISTS sale_attributions_select ON public.sale_attributions;
CREATE POLICY sale_attributions_select ON public.sale_attributions
  FOR SELECT TO authenticated
  USING (partner_id = public.current_partner_id() OR public.is_staff_or_above());

DROP POLICY IF EXISTS sale_attributions_staff_write ON public.sale_attributions;
CREATE POLICY sale_attributions_staff_write ON public.sale_attributions
  FOR ALL TO authenticated
  USING (public.is_staff_or_above())
  WITH CHECK (public.is_staff_or_above());

DROP POLICY IF EXISTS commissions_select ON public.commissions;
CREATE POLICY commissions_select ON public.commissions
  FOR SELECT TO authenticated
  USING (partner_id = public.current_partner_id() OR public.is_staff_or_above());

-- Partners must NEVER update commission amounts/status directly.
DROP POLICY IF EXISTS commissions_staff_write ON public.commissions;
CREATE POLICY commissions_staff_write ON public.commissions
  FOR ALL TO authenticated
  USING (public.is_staff_or_above())
  WITH CHECK (public.is_staff_or_above());

DROP POLICY IF EXISTS commission_events_select ON public.commission_events;
CREATE POLICY commission_events_select ON public.commission_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.commissions c
      WHERE c.id = commission_id
        AND (c.partner_id = public.current_partner_id() OR public.is_staff_or_above())
    )
  );

DROP POLICY IF EXISTS payout_accounts_own ON public.payout_accounts;
CREATE POLICY payout_accounts_own ON public.payout_accounts
  FOR SELECT TO authenticated
  USING (partner_id = public.current_partner_id() OR public.is_staff_or_above());

DROP POLICY IF EXISTS payout_accounts_partner_insert ON public.payout_accounts;
CREATE POLICY payout_accounts_partner_insert ON public.payout_accounts
  FOR INSERT TO authenticated
  WITH CHECK (partner_id = public.current_partner_id() OR public.is_staff_or_above());

DROP POLICY IF EXISTS payout_accounts_partner_update ON public.payout_accounts;
CREATE POLICY payout_accounts_partner_update ON public.payout_accounts
  FOR UPDATE TO authenticated
  USING (partner_id = public.current_partner_id() OR public.is_staff_or_above())
  WITH CHECK (partner_id = public.current_partner_id() OR public.is_staff_or_above());

DROP POLICY IF EXISTS payout_requests_own ON public.payout_requests;
CREATE POLICY payout_requests_own ON public.payout_requests
  FOR SELECT TO authenticated
  USING (partner_id = public.current_partner_id() OR public.is_staff_or_above());

DROP POLICY IF EXISTS payout_requests_partner_insert ON public.payout_requests;
CREATE POLICY payout_requests_partner_insert ON public.payout_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    partner_id = public.current_partner_id()
    AND status IN ('draft', 'submitted')
  );

DROP POLICY IF EXISTS payout_requests_staff_update ON public.payout_requests;
CREATE POLICY payout_requests_staff_update ON public.payout_requests
  FOR UPDATE TO authenticated
  USING (
    public.is_staff_or_above()
    OR (partner_id = public.current_partner_id() AND status IN ('draft', 'submitted'))
  )
  WITH CHECK (
    public.is_staff_or_above()
    OR (partner_id = public.current_partner_id() AND status IN ('draft', 'submitted', 'cancelled'))
  );

-- ---------- projects ----------
DROP POLICY IF EXISTS projects_select ON public.projects;
CREATE POLICY projects_select ON public.projects
  FOR SELECT TO authenticated
  USING (
    customer_user_id = auth.uid()
    OR public.is_project_member(id)
    OR public.is_staff_or_above()
  );

DROP POLICY IF EXISTS projects_insert ON public.projects;
CREATE POLICY projects_insert ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (customer_user_id = auth.uid() OR public.is_staff_or_above());

DROP POLICY IF EXISTS projects_update ON public.projects;
CREATE POLICY projects_update ON public.projects
  FOR UPDATE TO authenticated
  USING (public.is_staff_or_above() OR customer_user_id = auth.uid())
  WITH CHECK (public.is_staff_or_above() OR customer_user_id = auth.uid());

DROP POLICY IF EXISTS project_members_select ON public.project_members;
CREATE POLICY project_members_select ON public.project_members
  FOR SELECT TO authenticated
  USING (public.is_project_member(project_id));

DROP POLICY IF EXISTS project_members_staff_write ON public.project_members;
CREATE POLICY project_members_staff_write ON public.project_members
  FOR ALL TO authenticated
  USING (public.is_staff_or_above())
  WITH CHECK (public.is_staff_or_above());

DROP POLICY IF EXISTS project_updates_select ON public.project_updates;
CREATE POLICY project_updates_select ON public.project_updates
  FOR SELECT TO authenticated
  USING (
    public.is_project_member(project_id)
    AND (is_customer_visible = true OR public.is_staff_or_above())
  );

DROP POLICY IF EXISTS project_updates_staff_write ON public.project_updates;
CREATE POLICY project_updates_staff_write ON public.project_updates
  FOR ALL TO authenticated
  USING (public.is_staff_or_above())
  WITH CHECK (public.is_staff_or_above());

DROP POLICY IF EXISTS project_milestones_select ON public.project_milestones;
CREATE POLICY project_milestones_select ON public.project_milestones
  FOR SELECT TO authenticated
  USING (public.is_project_member(project_id));

DROP POLICY IF EXISTS project_milestones_staff_write ON public.project_milestones;
CREATE POLICY project_milestones_staff_write ON public.project_milestones
  FOR ALL TO authenticated
  USING (public.is_staff_or_above())
  WITH CHECK (public.is_staff_or_above());

DROP POLICY IF EXISTS project_activity_select ON public.project_activity;
CREATE POLICY project_activity_select ON public.project_activity
  FOR SELECT TO authenticated
  USING (public.is_project_member(project_id));

-- ---------- messaging ----------
DROP POLICY IF EXISTS conversations_select ON public.conversations;
CREATE POLICY conversations_select ON public.conversations
  FOR SELECT TO authenticated
  USING (public.is_conversation_participant(id));

DROP POLICY IF EXISTS conversations_insert ON public.conversations;
CREATE POLICY conversations_insert ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() OR public.is_staff_or_above());

DROP POLICY IF EXISTS conversation_participants_select ON public.conversation_participants;
CREATE POLICY conversation_participants_select ON public.conversation_participants
  FOR SELECT TO authenticated
  USING (public.is_conversation_participant(conversation_id));

DROP POLICY IF EXISTS conversation_participants_staff_write ON public.conversation_participants;
CREATE POLICY conversation_participants_staff_write ON public.conversation_participants
  FOR ALL TO authenticated
  USING (public.is_staff_or_above())
  WITH CHECK (public.is_staff_or_above());

DROP POLICY IF EXISTS messages_select ON public.messages;
CREATE POLICY messages_select ON public.messages
  FOR SELECT TO authenticated
  USING (public.is_conversation_participant(conversation_id));

DROP POLICY IF EXISTS messages_insert ON public.messages;
CREATE POLICY messages_insert ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_conversation_participant(conversation_id)
  );

DROP POLICY IF EXISTS message_receipts_own ON public.message_receipts;
CREATE POLICY message_receipts_own ON public.message_receipts
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_above())
  WITH CHECK (user_id = auth.uid() OR public.is_staff_or_above());

-- ---------- support ----------
DROP POLICY IF EXISTS support_tickets_own ON public.support_tickets;
CREATE POLICY support_tickets_own ON public.support_tickets
  FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR public.is_staff_or_above());

DROP POLICY IF EXISTS support_tickets_insert ON public.support_tickets;
CREATE POLICY support_tickets_insert ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());

DROP POLICY IF EXISTS support_tickets_update ON public.support_tickets;
CREATE POLICY support_tickets_update ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (requester_id = auth.uid() OR public.is_staff_or_above())
  WITH CHECK (requester_id = auth.uid() OR public.is_staff_or_above());

DROP POLICY IF EXISTS support_ticket_messages_select ON public.support_ticket_messages;
CREATE POLICY support_ticket_messages_select ON public.support_ticket_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND (t.requester_id = auth.uid() OR public.is_staff_or_above())
    )
    AND (is_internal = false OR public.is_staff_or_above())
  );

DROP POLICY IF EXISTS support_ticket_messages_insert ON public.support_ticket_messages;
CREATE POLICY support_ticket_messages_insert ON public.support_ticket_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND (t.requester_id = auth.uid() OR public.is_staff_or_above())
    )
    AND (is_internal = false OR public.is_staff_or_above())
  );

-- ---------- documents ----------
DROP POLICY IF EXISTS documents_select ON public.documents;
CREATE POLICY documents_select ON public.documents
  FOR SELECT TO authenticated
  USING (
    owner_user_id = auth.uid()
    OR (project_id IS NOT NULL AND public.is_project_member(project_id))
    OR public.is_staff_or_above()
  );

DROP POLICY IF EXISTS documents_write ON public.documents;
CREATE POLICY documents_write ON public.documents
  FOR ALL TO authenticated
  USING (owner_user_id = auth.uid() OR public.is_staff_or_above())
  WITH CHECK (owner_user_id = auth.uid() OR public.is_staff_or_above());

DROP POLICY IF EXISTS document_versions_select ON public.document_versions;
CREATE POLICY document_versions_select ON public.document_versions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_id
        AND (
          d.owner_user_id = auth.uid()
          OR (d.project_id IS NOT NULL AND public.is_project_member(d.project_id))
          OR public.is_staff_or_above()
        )
    )
    AND scan_status IN ('clean', 'pending')
  );

DROP POLICY IF EXISTS document_versions_insert ON public.document_versions;
CREATE POLICY document_versions_insert ON public.document_versions
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() OR public.is_staff_or_above());

DROP POLICY IF EXISTS document_reviews_select ON public.document_reviews;
CREATE POLICY document_reviews_select ON public.document_reviews
  FOR SELECT TO authenticated
  USING (
    reviewer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_id
        AND (d.owner_user_id = auth.uid() OR public.is_staff_or_above()
             OR (d.project_id IS NOT NULL AND public.is_project_member(d.project_id)))
    )
  );

DROP POLICY IF EXISTS document_reviews_insert ON public.document_reviews;
CREATE POLICY document_reviews_insert ON public.document_reviews
  FOR INSERT TO authenticated
  WITH CHECK (reviewer_id = auth.uid());

-- ---------- quotes / terms ----------
DROP POLICY IF EXISTS quotes_select ON public.quotes;
CREATE POLICY quotes_select ON public.quotes
  FOR SELECT TO authenticated
  USING (customer_user_id = auth.uid() OR public.is_staff_or_above());

DROP POLICY IF EXISTS quotes_staff_write ON public.quotes;
CREATE POLICY quotes_staff_write ON public.quotes
  FOR ALL TO authenticated
  USING (public.is_staff_or_above())
  WITH CHECK (public.is_staff_or_above());

DROP POLICY IF EXISTS quote_items_select ON public.quote_items;
CREATE POLICY quote_items_select ON public.quote_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_id
        AND (q.customer_user_id = auth.uid() OR public.is_staff_or_above())
    )
  );

DROP POLICY IF EXISTS quote_items_staff_write ON public.quote_items;
CREATE POLICY quote_items_staff_write ON public.quote_items
  FOR ALL TO authenticated
  USING (public.is_staff_or_above())
  WITH CHECK (public.is_staff_or_above());

DROP POLICY IF EXISTS quote_acceptances_select ON public.quote_acceptances;
CREATE POLICY quote_acceptances_select ON public.quote_acceptances
  FOR SELECT TO authenticated
  USING (
    accepted_by = auth.uid()
    OR public.is_staff_or_above()
    OR EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_id AND q.customer_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS quote_acceptances_insert ON public.quote_acceptances;
CREATE POLICY quote_acceptances_insert ON public.quote_acceptances
  FOR INSERT TO authenticated
  WITH CHECK (
    accepted_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_id AND q.customer_user_id = auth.uid() AND q.status IN ('sent', 'viewed')
    )
  );

DROP POLICY IF EXISTS terms_versions_select ON public.terms_versions;
CREATE POLICY terms_versions_select ON public.terms_versions
  FOR SELECT TO authenticated
  USING (is_active = true OR public.is_staff_or_above());

DROP POLICY IF EXISTS terms_versions_staff_write ON public.terms_versions;
CREATE POLICY terms_versions_staff_write ON public.terms_versions
  FOR ALL TO authenticated
  USING (public.is_staff_or_above())
  WITH CHECK (public.is_staff_or_above());

DROP POLICY IF EXISTS terms_acceptances_own ON public.terms_acceptances;
CREATE POLICY terms_acceptances_own ON public.terms_acceptances
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_above());

DROP POLICY IF EXISTS terms_acceptances_insert ON public.terms_acceptances;
CREATE POLICY terms_acceptances_insert ON public.terms_acceptances
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ---------- invoices / payments ----------
DROP POLICY IF EXISTS invoices_select ON public.invoices;
CREATE POLICY invoices_select ON public.invoices
  FOR SELECT TO authenticated
  USING (customer_user_id = auth.uid() OR public.is_staff_or_above());

DROP POLICY IF EXISTS invoices_staff_write ON public.invoices;
CREATE POLICY invoices_staff_write ON public.invoices
  FOR ALL TO authenticated
  USING (public.is_staff_or_above())
  WITH CHECK (public.is_staff_or_above());

DROP POLICY IF EXISTS invoice_items_select ON public.invoice_items;
CREATE POLICY invoice_items_select ON public.invoice_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND (i.customer_user_id = auth.uid() OR public.is_staff_or_above())
    )
  );

DROP POLICY IF EXISTS invoice_items_staff_write ON public.invoice_items;
CREATE POLICY invoice_items_staff_write ON public.invoice_items
  FOR ALL TO authenticated
  USING (public.is_staff_or_above())
  WITH CHECK (public.is_staff_or_above());

-- Payment ledgers: customers may read own via invoice; writes are service_role only.
DROP POLICY IF EXISTS payment_events_select ON public.payment_events;
CREATE POLICY payment_events_select ON public.payment_events
  FOR SELECT TO authenticated
  USING (
    public.is_staff_or_above()
    OR EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id AND i.customer_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS payment_webhook_events_staff_select ON public.payment_webhook_events;
CREATE POLICY payment_webhook_events_staff_select ON public.payment_webhook_events
  FOR SELECT TO authenticated
  USING (public.is_staff_or_above());

-- ---------- appointments / reviews ----------
DROP POLICY IF EXISTS availability_slots_select ON public.availability_slots;
CREATE POLICY availability_slots_select ON public.availability_slots
  FOR SELECT TO authenticated
  USING (is_bookable = true OR public.is_staff_or_above());

DROP POLICY IF EXISTS availability_slots_staff_write ON public.availability_slots;
CREATE POLICY availability_slots_staff_write ON public.availability_slots
  FOR ALL TO authenticated
  USING (public.is_staff_or_above())
  WITH CHECK (public.is_staff_or_above());

DROP POLICY IF EXISTS appointments_own ON public.appointments;
CREATE POLICY appointments_own ON public.appointments
  FOR SELECT TO authenticated
  USING (customer_user_id = auth.uid() OR staff_user_id = auth.uid() OR public.is_staff_or_above());

DROP POLICY IF EXISTS appointments_insert ON public.appointments;
CREATE POLICY appointments_insert ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (customer_user_id = auth.uid() OR public.is_staff_or_above());

DROP POLICY IF EXISTS appointments_update ON public.appointments;
CREATE POLICY appointments_update ON public.appointments
  FOR UPDATE TO authenticated
  USING (customer_user_id = auth.uid() OR public.is_staff_or_above())
  WITH CHECK (customer_user_id = auth.uid() OR public.is_staff_or_above());

DROP POLICY IF EXISTS reviews_select ON public.reviews;
CREATE POLICY reviews_select ON public.reviews
  FOR SELECT TO authenticated
  USING (
    author_id = auth.uid()
    OR status = 'published'
    OR public.is_staff_or_above()
  );

DROP POLICY IF EXISTS reviews_insert ON public.reviews;
CREATE POLICY reviews_insert ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS reviews_update_own ON public.reviews;
CREATE POLICY reviews_update_own ON public.reviews
  FOR UPDATE TO authenticated
  USING (
    (author_id = auth.uid() AND status IN ('draft', 'submitted'))
    OR public.is_staff_or_above()
  )
  WITH CHECK (
    (author_id = auth.uid() AND status IN ('draft', 'submitted'))
    OR public.is_staff_or_above()
  );

-- ---------- notifications / flags / deletion ----------
DROP POLICY IF EXISTS push_tokens_own ON public.push_tokens;
CREATE POLICY push_tokens_own ON public.push_tokens
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS notifications_own ON public.notifications;
CREATE POLICY notifications_own ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_above());

DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS notification_deliveries_own ON public.notification_deliveries;
CREATE POLICY notification_deliveries_own ON public.notification_deliveries
  FOR SELECT TO authenticated
  USING (
    public.is_staff_or_above()
    OR EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.id = notification_id AND n.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS feature_flags_select ON public.feature_flags;
CREATE POLICY feature_flags_select ON public.feature_flags
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS feature_flags_staff_write ON public.feature_flags;
CREATE POLICY feature_flags_staff_write ON public.feature_flags
  FOR ALL TO authenticated
  USING (public.is_staff_or_above())
  WITH CHECK (public.is_staff_or_above());

DROP POLICY IF EXISTS account_deletion_own ON public.account_deletion_requests;
CREATE POLICY account_deletion_own ON public.account_deletion_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_above());

DROP POLICY IF EXISTS account_deletion_insert ON public.account_deletion_requests;
CREATE POLICY account_deletion_insert ON public.account_deletion_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS account_deletion_staff_update ON public.account_deletion_requests;
CREATE POLICY account_deletion_staff_update ON public.account_deletion_requests
  FOR UPDATE TO authenticated
  USING (public.is_staff_or_above() OR user_id = auth.uid())
  WITH CHECK (public.is_staff_or_above() OR user_id = auth.uid());

