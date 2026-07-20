-- STATUS: NOT APPLIED -- local proposal only. Requires explicit owner approval before remote apply.
DO $$ BEGIN
  CREATE TYPE public.project_status AS ENUM (
    'request_received',
    'intake',
    'quote',
    'accepted',
    'planning',
    'in_progress',
    'waiting_on_customer',
    'review',
    'revision',
    'completed',
    'paused',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.project_member_role AS ENUM (
    'customer', 'project_manager', 'contributor', 'viewer', 'staff'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status public.project_status NOT NULL DEFAULT 'request_received',
  customer_user_id uuid REFERENCES auth.users (id),
  owner_staff_id uuid REFERENCES auth.users (id),
  sale_id uuid REFERENCES public.sales (id) ON DELETE SET NULL,
  order_id uuid,
  starts_on date,
  target_end_on date,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz
);

DO $$ BEGIN
  IF to_regclass('public.orders') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_order_id_fkey') THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES public.orders (id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS projects_customer_user_id_idx ON public.projects (customer_user_id);
CREATE INDEX IF NOT EXISTS projects_status_idx ON public.projects (status);

CREATE TABLE IF NOT EXISTS public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role public.project_member_role NOT NULL DEFAULT 'viewer',
  invited_by uuid REFERENCES auth.users (id),
  joined_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT project_members_unique UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS project_members_user_id_idx ON public.project_members (user_id);

CREATE TABLE IF NOT EXISTS public.project_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users (id),
  title text NOT NULL,
  body text NOT NULL,
  is_customer_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS project_updates_project_id_idx
  ON public.project_updates (project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_on date,
  completed_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS project_milestones_project_id_idx ON public.project_milestones (project_id);

CREATE TABLE IF NOT EXISTS public.project_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users (id),
  activity_type text NOT NULL,
  summary text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS project_activity_project_id_idx
  ON public.project_activity (project_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.trg_project_status_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.project_activity (project_id, actor_id, activity_type, summary, metadata)
    VALUES (
      NEW.id,
      auth.uid(),
      'status_changed',
      'Project status changed',
      jsonb_build_object('from', OLD.status, 'to', NEW.status)
    );
    PERFORM public.write_audit_log(
      'project.status_changed', 'projects', NEW.id,
      jsonb_build_object('from', OLD.status, 'to', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS projects_status_activity ON public.projects;
CREATE TRIGGER projects_status_activity
  AFTER UPDATE OF status ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.trg_project_status_activity();

DROP TRIGGER IF EXISTS projects_set_updated_at ON public.projects;
CREATE TRIGGER projects_set_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS project_members_set_updated_at ON public.project_members;
CREATE TRIGGER project_members_set_updated_at
  BEFORE UPDATE ON public.project_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS project_updates_set_updated_at ON public.project_updates;
CREATE TRIGGER project_updates_set_updated_at
  BEFORE UPDATE ON public.project_updates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS project_milestones_set_updated_at ON public.project_milestones;
CREATE TRIGGER project_milestones_set_updated_at
  BEFORE UPDATE ON public.project_milestones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_activity ENABLE ROW LEVEL SECURITY;

