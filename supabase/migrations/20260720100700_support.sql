-- STATUS: NOT APPLIED -- local proposal only. Requires explicit owner approval before remote apply.
DO $$ BEGIN
  CREATE TYPE public.support_ticket_status AS ENUM (
    'open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.support_ticket_priority AS ENUM (
    'low', 'normal', 'high', 'urgent'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users (id),
  project_id uuid REFERENCES public.projects (id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.conversations (id) ON DELETE SET NULL,
  subject text NOT NULL,
  category text,
  status public.support_ticket_status NOT NULL DEFAULT 'open',
  priority public.support_ticket_priority NOT NULL DEFAULT 'normal',
  assigned_to uuid REFERENCES auth.users (id),
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS support_tickets_requester_id_idx ON public.support_tickets (requester_id);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON public.support_tickets (status);

CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets (id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users (id),
  body text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  attachment_path text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS support_ticket_messages_ticket_id_idx
  ON public.support_ticket_messages (ticket_id, created_at);

DROP TRIGGER IF EXISTS support_tickets_set_updated_at ON public.support_tickets;
CREATE TRIGGER support_tickets_set_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS support_ticket_messages_set_updated_at ON public.support_ticket_messages;
CREATE TRIGGER support_ticket_messages_set_updated_at
  BEFORE UPDATE ON public.support_ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

