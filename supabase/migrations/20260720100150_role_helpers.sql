-- STATUS: NOT APPLIED -- local proposal only. Requires explicit owner approval before remote apply.
-- Role helpers after user_roles exists.

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
