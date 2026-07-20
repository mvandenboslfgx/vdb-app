-- STATUS: NOT APPLIED -- local proposal only. Requires explicit owner approval before remote apply.
-- Mobile app roles. Existing admin_roles remains authoritative for web admins.
-- Mapping: admin_roles rows imply staff/admin access via is_staff_or_above().

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM (
    'customer',
    'partner_pending',
    'partner',
    'staff',
    'admin',
    'owner'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  granted_by uuid REFERENCES auth.users (id),
  granted_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  revoked_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT user_roles_active_unique UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS user_roles_role_idx ON public.user_roles (role) WHERE revoked_at IS NULL;

DROP TRIGGER IF EXISTS user_roles_set_updated_at ON public.user_roles;
CREATE TRIGGER user_roles_set_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

