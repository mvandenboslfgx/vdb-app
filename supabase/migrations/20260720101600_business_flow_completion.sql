-- STATUS: NOT APPLIED (remote) -- local proposal only. Requires explicit owner approval before remote apply.
-- Business flow completion: customer document upload (Goal A) + partner leads (Goal B).
-- Idempotent: safe to re-run (CREATE OR REPLACE FUNCTION / IF NOT EXISTS everywhere).

-- =====================================================================
-- GOAL A: DOCUMENT UPLOAD
-- =====================================================================

-- 1. client_upload_id for idempotent uploads -------------------------------
ALTER TABLE public.document_versions ADD COLUMN IF NOT EXISTS client_upload_id text;

CREATE UNIQUE INDEX IF NOT EXISTS document_versions_client_upload_id_key
  ON public.document_versions (client_upload_id)
  WHERE client_upload_id IS NOT NULL;

-- 2. Storage policies: INSERT/UPDATE for project members / doc owner / staff.
--    Objects are uploaded to `{scope}/{uuid}/{fileName}` where `scope` is
--    either a project id (member/staff only) or the uploader's own auth.uid()
--    (personal, non-project documents). SELECT stays private (see
--    20260720101500_admin_rpcs_and_quote_accept.sql, documents_bucket_select) --
--    never touched here. No public/anon grants.
CREATE OR REPLACE FUNCTION public.can_upload_to_documents_path(p_object_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scope text;
  v_scope_uuid uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  IF public.is_staff_or_above() THEN
    RETURN true;
  END IF;

  v_scope := (storage.foldername(p_object_name))[1];
  IF v_scope IS NULL THEN
    RETURN false;
  END IF;
  IF v_scope = auth.uid()::text THEN
    RETURN true;
  END IF;

  BEGIN
    v_scope_uuid := v_scope::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN false;
  END;

  RETURN public.is_project_member(v_scope_uuid);
END;
$$;

REVOKE ALL ON FUNCTION public.can_upload_to_documents_path(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_upload_to_documents_path(text) TO authenticated, service_role;

DROP POLICY IF EXISTS documents_bucket_insert ON storage.objects;
CREATE POLICY documents_bucket_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND public.can_upload_to_documents_path(name));

DROP POLICY IF EXISTS documents_bucket_update ON storage.objects;
CREATE POLICY documents_bucket_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND public.can_upload_to_documents_path(name))
  WITH CHECK (bucket_id = 'documents' AND public.can_upload_to_documents_path(name));

-- 3. register_document_upload: single client entry point for uploads. -----
--    Verifies membership/ownership, creates the `documents` row when needed
--    (or a new version on an existing one), always writes the new version
--    with scan_status='pending' (client can never set scan_status --
--    mark_document_scan_clean stays staff-only, see 20260720101500),
--    updates current_version_id, and is idempotent on p_client_upload_id.
CREATE OR REPLACE FUNCTION public.register_document_upload(
  p_title text,
  p_storage_path text,
  p_mime_type text,
  p_byte_size bigint,
  p_client_upload_id text,
  p_project_id uuid DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_checksum_sha256 text DEFAULT NULL,
  p_document_id uuid DEFAULT NULL
)
RETURNS public.documents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_document public.documents;
  v_existing public.documents;
  v_version_id uuid;
  v_next_version int;
  v_result public.documents;
  v_blocked_ext text[] := ARRAY[
    'exe','bat','cmd','sh','msi','dll','apk','jar','com','scr','ps1','vbs','app','deb','rpm'
  ];
  v_blocked_mime text[] := ARRAY[
    'application/x-msdownload','application/x-msdos-program','application/x-executable',
    'application/vnd.android.package-archive','application/x-sh','application/java-archive',
    'application/x-bat'
  ];
  v_ext text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_client_upload_id IS NULL OR length(trim(p_client_upload_id)) = 0 THEN
    RAISE EXCEPTION 'client_upload_id is required';
  END IF;
  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RAISE EXCEPTION 'A document title is required';
  END IF;
  IF p_storage_path IS NULL OR length(trim(p_storage_path)) = 0 THEN
    RAISE EXCEPTION 'A storage path is required';
  END IF;
  IF p_byte_size IS NULL OR p_byte_size <= 0 THEN
    RAISE EXCEPTION 'Invalid file size';
  END IF;
  IF p_byte_size > 26214400 THEN
    RAISE EXCEPTION 'File exceeds the maximum upload size of 25MB';
  END IF;

  v_ext := lower(regexp_replace(p_storage_path, '^.*\.', ''));
  IF v_ext = ANY (v_blocked_ext) OR lower(coalesce(p_mime_type, '')) = ANY (v_blocked_mime) THEN
    RAISE EXCEPTION 'This file type is not allowed';
  END IF;

  -- Idempotency: a prior call with the same client_upload_id already succeeded.
  SELECT d.* INTO v_existing
  FROM public.documents d
  JOIN public.document_versions dv ON dv.document_id = d.id
  WHERE dv.client_upload_id = p_client_upload_id
  LIMIT 1;
  IF v_existing.id IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  IF p_document_id IS NOT NULL THEN
    SELECT * INTO v_document FROM public.documents WHERE id = p_document_id FOR UPDATE;
    IF v_document.id IS NULL THEN
      RAISE EXCEPTION 'Document not found';
    END IF;
    IF NOT (
      v_document.owner_user_id = v_uid
      OR (v_document.project_id IS NOT NULL AND public.is_project_member(v_document.project_id))
      OR public.is_staff_or_above()
    ) THEN
      RAISE EXCEPTION 'You do not have access to this document';
    END IF;
  ELSE
    IF p_project_id IS NOT NULL AND NOT public.is_project_member(p_project_id) THEN
      RAISE EXCEPTION 'You are not a member of this project';
    END IF;
    INSERT INTO public.documents (project_id, owner_user_id, title, category, status)
    VALUES (p_project_id, v_uid, p_title, p_category, 'uploaded')
    RETURNING * INTO v_document;
  END IF;

  SELECT coalesce(max(version_number), 0) + 1 INTO v_next_version
  FROM public.document_versions WHERE document_id = v_document.id;

  BEGIN
    INSERT INTO public.document_versions (
      document_id, version_number, storage_path, mime_type, byte_size,
      checksum_sha256, uploaded_by, scan_status, status, client_upload_id
    ) VALUES (
      v_document.id, v_next_version, p_storage_path, p_mime_type, p_byte_size,
      p_checksum_sha256, v_uid, 'pending', 'uploaded', p_client_upload_id
    )
    RETURNING id INTO v_version_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'This upload has already been registered';
  END;

  UPDATE public.documents
  SET current_version_id = v_version_id,
      title = coalesce(p_title, title),
      category = coalesce(p_category, category),
      status = 'uploaded'
  WHERE id = v_document.id
  RETURNING * INTO v_result;

  PERFORM public.write_audit_log(
    'document.uploaded', 'documents', v_document.id,
    jsonb_build_object('versionId', v_version_id, 'versionNumber', v_next_version, 'byteSize', p_byte_size)
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.register_document_upload(
  text, text, text, bigint, text, uuid, text, text, uuid
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_document_upload(
  text, text, text, bigint, text, uuid, text, text, uuid
) TO authenticated, service_role;

-- Note: `mark_document_scan_clean` (20260720101500) is already staff-gated
-- via is_staff_or_above() -- no client path can ever set scan_status.

-- =====================================================================
-- GOAL B: PARTNER LEADS
-- =====================================================================

DO $$ BEGIN
  CREATE TYPE public.partner_lead_status AS ENUM (
    'new', 'contacted', 'qualified', 'converted', 'rejected', 'invalid'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.partner_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partner_profiles (id) ON DELETE CASCADE,
  campaign_code text,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  interest text,
  notes text,
  consent_given boolean NOT NULL DEFAULT false,
  consent_at timestamptz,
  status public.partner_lead_status NOT NULL DEFAULT 'new',
  sale_id uuid REFERENCES public.sales (id) ON DELETE SET NULL,
  converted_at timestamptz,
  rejected_reason text,
  created_by uuid REFERENCES auth.users (id),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT partner_leads_consent_required CHECK (consent_given = true),
  CONSTRAINT partner_leads_email_format CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

CREATE INDEX IF NOT EXISTS partner_leads_partner_id_idx ON public.partner_leads (partner_id);
CREATE INDEX IF NOT EXISTS partner_leads_status_idx ON public.partner_leads (status);

-- Soft-dedupe: an active (non rejected/invalid) lead may not be re-registered
-- twice for the same partner + email.
CREATE UNIQUE INDEX IF NOT EXISTS partner_leads_partner_email_active_key
  ON public.partner_leads (partner_id, lower(email))
  WHERE status NOT IN ('rejected', 'invalid');

-- Internal-only notes. Kept in a separate table (rather than a column on
-- partner_leads) so partner-facing SELECT on partner_leads can never leak
-- staff commentary -- Postgres RLS has no column-level SELECT masking, so
-- this is the practical way to guarantee partners never see it.
CREATE TABLE IF NOT EXISTS public.partner_lead_staff_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.partner_leads (id) ON DELETE CASCADE,
  note text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users (id),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS partner_lead_staff_notes_lead_id_idx
  ON public.partner_lead_staff_notes (lead_id);

DROP TRIGGER IF EXISTS partner_leads_set_updated_at ON public.partner_leads;
CREATE TRIGGER partner_leads_set_updated_at
  BEFORE UPDATE ON public.partner_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.partner_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_lead_staff_notes ENABLE ROW LEVEL SECURITY;

-- Table privileges for PostgREST roles (RLS above is the real gate; these
-- mirror the pattern in 20260720101400_app_profiles_and_guards.sql so
-- authenticated/service_role have the same baseline as every other table).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_leads TO authenticated;
GRANT ALL ON public.partner_leads TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_lead_staff_notes TO authenticated;
GRANT ALL ON public.partner_lead_staff_notes TO service_role;

-- Partners may only ever SELECT their own leads (directly, via PostgREST).
-- All writes (register/update/qualify/convert) go through the SECURITY
-- DEFINER RPCs below, which bypass RLS deliberately and only there -- there
-- is intentionally NO insert/update/delete policy for partner_leads, so a
-- partner can never write `status`, `sale_id`, `converted_at`, etc. directly,
-- even if they discover the table name.
DROP POLICY IF EXISTS partner_leads_select ON public.partner_leads;
CREATE POLICY partner_leads_select ON public.partner_leads
  FOR SELECT TO authenticated
  USING (partner_id = public.current_partner_id() OR public.is_staff_or_above());

-- Staff-only internal notes: partners never get a policy here at all.
DROP POLICY IF EXISTS partner_lead_staff_notes_staff_only ON public.partner_lead_staff_notes;
CREATE POLICY partner_lead_staff_notes_staff_only ON public.partner_lead_staff_notes
  FOR ALL TO authenticated
  USING (public.is_staff_or_above())
  WITH CHECK (public.is_staff_or_above());

-- ---------------------------------------------------------------------
-- register_partner_lead: active, non-suspended partners only. Consent
-- required. Soft-dedupes via the partial unique index above.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_partner_lead(
  p_name text,
  p_email text,
  p_consent_given boolean,
  p_campaign_code text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_interest text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS public.partner_leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_partner_id uuid;
  v_is_active boolean;
  v_result public.partner_leads;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_partner_id := public.current_partner_id();
  IF v_partner_id IS NULL THEN
    RAISE EXCEPTION 'Only active partners may register leads';
  END IF;

  SELECT is_active INTO v_is_active FROM public.partner_profiles WHERE id = v_partner_id;
  IF NOT coalesce(v_is_active, false) THEN
    RAISE EXCEPTION 'Your partner account is suspended';
  END IF;

  IF NOT coalesce(p_consent_given, false) THEN
    RAISE EXCEPTION 'Lead consent is required';
  END IF;
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'Lead name is required';
  END IF;
  IF p_email IS NULL OR p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'A valid lead email is required';
  END IF;

  BEGIN
    INSERT INTO public.partner_leads (
      partner_id, campaign_code, name, email, phone, interest, notes,
      consent_given, consent_at, status, created_by
    ) VALUES (
      v_partner_id, p_campaign_code, trim(p_name), lower(trim(p_email)), p_phone, p_interest, p_notes,
      true, timezone('utc', now()), 'new', v_uid
    )
    RETURNING * INTO v_result;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'A lead with this email is already active for your account';
  END;

  PERFORM public.write_audit_log(
    'partner_lead.registered', 'partner_leads', v_result.id,
    jsonb_build_object('campaignCode', p_campaign_code)
  );

  RETURN v_result;
END;
$$;

-- ---------------------------------------------------------------------
-- update_partner_lead_contact: owning partner only, and only while the
-- lead has not progressed past initial contact.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_partner_lead_contact(
  p_lead_id uuid,
  p_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_interest text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_mark_contacted boolean DEFAULT false
)
RETURNS public.partner_leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id uuid := public.current_partner_id();
  v_lead public.partner_leads;
  v_result public.partner_leads;
BEGIN
  IF v_partner_id IS NULL THEN
    RAISE EXCEPTION 'Only active partners may update leads';
  END IF;

  SELECT * INTO v_lead FROM public.partner_leads WHERE id = p_lead_id FOR UPDATE;
  IF v_lead.id IS NULL THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;
  IF v_lead.partner_id <> v_partner_id THEN
    RAISE EXCEPTION 'You do not own this lead';
  END IF;
  IF v_lead.status NOT IN ('new', 'contacted') THEN
    RAISE EXCEPTION 'This lead can no longer be edited (status=%)', v_lead.status;
  END IF;

  UPDATE public.partner_leads
  SET name = coalesce(trim(p_name), name),
      phone = coalesce(p_phone, phone),
      interest = coalesce(p_interest, interest),
      notes = coalesce(p_notes, notes),
      status = CASE WHEN p_mark_contacted AND status = 'new' THEN 'contacted' ELSE status END
  WHERE id = v_lead.id
  RETURNING * INTO v_result;

  PERFORM public.write_audit_log(
    'partner_lead.contact_updated', 'partner_leads', v_lead.id, '{}'::jsonb
  );

  RETURN v_result;
END;
$$;

-- ---------------------------------------------------------------------
-- admin_qualify_lead: staff-only status transitions (contacted/qualified/
-- rejected/invalid). A reason is required for rejected/invalid.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_qualify_lead(
  p_lead_id uuid,
  p_status text,
  p_reason text DEFAULT NULL
)
RETURNS public.partner_leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead public.partner_leads;
  v_result public.partner_leads;
  v_status public.partner_lead_status;
BEGIN
  IF NOT public.is_staff_or_above() THEN
    RAISE EXCEPTION 'Only staff can qualify leads';
  END IF;
  IF p_status NOT IN ('contacted', 'qualified', 'rejected', 'invalid') THEN
    RAISE EXCEPTION 'Invalid status transition: %', p_status;
  END IF;
  v_status := p_status::public.partner_lead_status;

  IF v_status IN ('rejected', 'invalid') AND (p_reason IS NULL OR length(trim(p_reason)) = 0) THEN
    RAISE EXCEPTION 'A reason is required to reject/invalidate a lead';
  END IF;

  SELECT * INTO v_lead FROM public.partner_leads WHERE id = p_lead_id FOR UPDATE;
  IF v_lead.id IS NULL THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;
  IF v_lead.status = 'converted' THEN
    RAISE EXCEPTION 'A converted lead cannot be re-qualified';
  END IF;

  UPDATE public.partner_leads
  SET status = v_status,
      rejected_reason = CASE WHEN v_status IN ('rejected', 'invalid') THEN p_reason ELSE rejected_reason END
  WHERE id = v_lead.id
  RETURNING * INTO v_result;

  IF p_reason IS NOT NULL AND length(trim(p_reason)) > 0 THEN
    INSERT INTO public.partner_lead_staff_notes (lead_id, note, created_by)
    VALUES (v_lead.id, p_reason, auth.uid());
  END IF;

  PERFORM public.write_audit_log(
    'partner_lead.qualified', 'partner_leads', v_lead.id,
    jsonb_build_object('status', v_status, 'reason', p_reason)
  );

  RETURN v_result;
END;
$$;

-- ---------------------------------------------------------------------
-- admin_convert_lead: staff-only, sets status=converted exactly once.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_convert_lead(
  p_lead_id uuid,
  p_sale_id uuid DEFAULT NULL
)
RETURNS public.partner_leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead public.partner_leads;
  v_result public.partner_leads;
BEGIN
  IF NOT public.is_staff_or_above() THEN
    RAISE EXCEPTION 'Only staff can convert leads';
  END IF;

  SELECT * INTO v_lead FROM public.partner_leads WHERE id = p_lead_id FOR UPDATE;
  IF v_lead.id IS NULL THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;
  IF v_lead.status = 'converted' THEN
    RAISE EXCEPTION 'This lead has already been converted';
  END IF;
  IF v_lead.status IN ('rejected', 'invalid') THEN
    RAISE EXCEPTION 'A rejected/invalid lead cannot be converted';
  END IF;

  UPDATE public.partner_leads
  SET status = 'converted',
      converted_at = timezone('utc', now()),
      sale_id = coalesce(p_sale_id, sale_id)
  WHERE id = v_lead.id
  RETURNING * INTO v_result;

  PERFORM public.write_audit_log(
    'partner_lead.converted', 'partner_leads', v_lead.id,
    jsonb_build_object('saleId', p_sale_id)
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.register_partner_lead(text, text, boolean, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_partner_lead_contact(uuid, text, text, text, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_qualify_lead(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_convert_lead(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.register_partner_lead(text, text, boolean, text, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_partner_lead_contact(uuid, text, text, text, text, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_qualify_lead(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_convert_lead(uuid, uuid) TO authenticated, service_role;