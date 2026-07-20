-- STATUS: NOT APPLIED -- local proposal only. Requires explicit owner approval before remote apply.
-- Helpers shared by mobile-portal migrations.
-- Does not drop or alter existing remote tables.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Generic updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

-- Append-only audit helper (writes to existing audit_logs when present)
CREATE OR REPLACE FUNCTION public.write_audit_log(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    INSERT INTO public.audit_logs (action, entity_type, entity_id, actor_id, metadata, created_at)
    VALUES (
      p_action,
      p_entity_type,
      p_entity_id,
      auth.uid(),
      coalesce(p_metadata, '{}'::jsonb),
      timezone('utc', now())
    );
  END IF;
EXCEPTION
  WHEN undefined_column THEN
    -- Remote audit_logs shape may differ; never fail business writes on audit mismatch.
    NULL;
  WHEN undefined_table THEN
    NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.write_audit_log(text, text, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.write_audit_log(text, text, uuid, jsonb) TO authenticated, service_role;

-- Role helpers: prefer user_roles; fall back to membership in admin_roles (any row).
CREATE OR REPLACE FUNCTION public.has_app_role(p_roles text[])
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ok boolean := false;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role::text = ANY (p_roles)
      AND ur.revoked_at IS NULL
  ) INTO ok;
  IF ok THEN
    RETURN true;
  END IF;

  -- Existing admin_roles implies staff/admin/owner without assuming column names.
  IF p_roles && ARRAY['staff', 'admin', 'owner']::text[]
     AND to_regclass('public.admin_roles') IS NOT NULL THEN
    BEGIN
      EXECUTE $q$
        SELECT EXISTS (
          SELECT 1 FROM public.admin_roles ar WHERE ar.user_id = auth.uid()
        )
      $q$ INTO ok;
    EXCEPTION WHEN undefined_column OR undefined_table THEN
      ok := false;
    END;
  END IF;
  RETURN coalesce(ok, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_staff_or_above()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_app_role(ARRAY['staff', 'admin', 'owner']::text[]);
$$;

CREATE OR REPLACE FUNCTION public.is_partner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'partner'
      AND ur.revoked_at IS NULL
  );
$$;

REVOKE ALL ON FUNCTION public.has_app_role(text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_staff_or_above() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_partner() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_app_role(text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff_or_above() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_partner() TO authenticated, service_role;

