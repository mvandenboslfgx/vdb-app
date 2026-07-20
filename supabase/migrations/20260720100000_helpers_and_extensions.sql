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
