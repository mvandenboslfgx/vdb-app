-- STATUS: NOT APPLIED -- local proposal only. Requires explicit owner approval before remote apply.
-- App profiles for mobile portal + project/role write guards.

-- ---------- app_profiles ----------
CREATE TABLE IF NOT EXISTS public.app_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text,
  full_name text,
  phone text,
  locale text NOT NULL DEFAULT 'nl',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS app_profiles_email_idx ON public.app_profiles (email);

DROP TRIGGER IF EXISTS app_profiles_set_updated_at ON public.app_profiles;
CREATE TRIGGER app_profiles_set_updated_at
  BEFORE UPDATE ON public.app_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.app_profiles ENABLE ROW LEVEL SECURITY;

-- No public/anon select
DROP POLICY IF EXISTS app_profiles_select_own ON public.app_profiles;
CREATE POLICY app_profiles_select_own ON public.app_profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS app_profiles_select_staff ON public.app_profiles;
CREATE POLICY app_profiles_select_staff ON public.app_profiles
  FOR SELECT TO authenticated
  USING (public.is_staff_or_above());

-- Users may update own non-identity fields (email protected by trigger)
DROP POLICY IF EXISTS app_profiles_update_own ON public.app_profiles;
CREATE POLICY app_profiles_update_own ON public.app_profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_staff_or_above())
  WITH CHECK (id = auth.uid() OR public.is_staff_or_above());

DROP POLICY IF EXISTS app_profiles_staff_insert ON public.app_profiles;
CREATE POLICY app_profiles_staff_insert ON public.app_profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR public.is_staff_or_above());

CREATE OR REPLACE FUNCTION public.trg_app_profiles_protect_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'app_profiles.id is immutable';
    END IF;
    -- Non-staff cannot change email (synced from auth)
    IF NEW.email IS DISTINCT FROM OLD.email AND NOT public.is_staff_or_above() THEN
      RAISE EXCEPTION 'Only staff can change app_profiles.email';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS app_profiles_protect_identity ON public.app_profiles;
CREATE TRIGGER app_profiles_protect_identity
  BEFORE UPDATE ON public.app_profiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_app_profiles_protect_identity();

-- ---------- signup: profile + default customer role ----------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.app_profiles (id, email, full_name, locale)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'locale', 'nl')
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = timezone('utc', now());

  INSERT INTO public.user_roles (user_id, role, notes)
  VALUES (NEW.id, 'customer', 'auto-granted on signup')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_app_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_app_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ---------- projects: staff-only UPDATE + status guard ----------
CREATE OR REPLACE FUNCTION public.trg_projects_status_staff_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT public.is_staff_or_above() THEN
      RAISE EXCEPTION 'Only staff can change projects.status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS projects_status_staff_only ON public.projects;
CREATE TRIGGER projects_status_staff_only
  BEFORE UPDATE OF status ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.trg_projects_status_staff_only();

DROP POLICY IF EXISTS projects_update ON public.projects;
CREATE POLICY projects_update ON public.projects
  FOR UPDATE TO authenticated
  USING (public.is_staff_or_above())
  WITH CHECK (public.is_staff_or_above());

-- ---------- user_roles: staff-only writes; block self-elevation ----------
CREATE OR REPLACE FUNCTION public.trg_user_roles_staff_write_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  elev public.app_role[] := ARRAY['partner_pending', 'partner', 'staff', 'admin', 'owner']::public.app_role[];
  acting uuid := auth.uid();
BEGIN
  -- service_role / signup trigger (no jwt): allow
  IF acting IS NULL AND current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'authenticated' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF NOT public.is_staff_or_above() THEN
    RAISE EXCEPTION 'Only staff can modify user_roles';
  END IF;

  IF TG_OP = 'INSERT' AND NEW.role = ANY (elev) AND NEW.user_id = acting THEN
    -- staff may grant themselves only if already staff (is_staff_or_above already true)
    NULL;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS user_roles_staff_write_guard ON public.user_roles;
CREATE TRIGGER user_roles_staff_write_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.trg_user_roles_staff_write_guard();

DROP POLICY IF EXISTS user_roles_staff_write ON public.user_roles;
DROP POLICY IF EXISTS user_roles_staff_insert ON public.user_roles;
DROP POLICY IF EXISTS user_roles_staff_update ON public.user_roles;
DROP POLICY IF EXISTS user_roles_staff_delete ON public.user_roles;

CREATE POLICY user_roles_staff_insert ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_above());

CREATE POLICY user_roles_staff_update ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.is_staff_or_above())
  WITH CHECK (public.is_staff_or_above());

CREATE POLICY user_roles_staff_delete ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.is_staff_or_above());

-- Staff may read flagged / failed document scans; customers only clean|pending
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
    AND (
      scan_status IN ('clean', 'pending')
      OR public.is_staff_or_above()
    )
  );

-- ---------- grants ----------
GRANT SELECT, INSERT, UPDATE ON public.app_profiles TO authenticated;
GRANT ALL ON public.app_profiles TO service_role;

REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO service_role;

REVOKE ALL ON FUNCTION public.trg_app_profiles_protect_identity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trg_projects_status_staff_only() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trg_user_roles_staff_write_guard() FROM PUBLIC;

-- Table privileges for PostgREST roles (local mobile tables)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'app_profiles','user_roles',
    'partner_applications','partner_profiles','partner_codes','partner_links',
    'sales','sale_attributions','commissions','commission_events','payout_accounts','payout_requests',
    'projects','project_members','project_updates','project_milestones','project_activity',
    'conversations','conversation_participants','messages','message_receipts',
    'support_tickets','support_ticket_messages',
    'documents','document_versions','document_reviews',
    'quotes','quote_items','quote_acceptances','terms_versions','terms_acceptances',
    'invoices','invoice_items','payment_events','payment_webhook_events',
    'availability_slots','appointments','reviews',
    'push_tokens','notifications','notification_deliveries','feature_flags','account_deletion_requests'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
      EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    END IF;
  END LOOP;
END;
$$;