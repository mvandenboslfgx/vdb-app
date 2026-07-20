-- STATUS: NOT APPLIED -- local proposal only. Requires explicit owner approval before remote apply.
DO $$ BEGIN
  CREATE TYPE public.conversation_type AS ENUM (
    'customer_support', 'partner_support', 'project', 'direct'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_type public.conversation_type NOT NULL DEFAULT 'customer_support',
  project_id uuid REFERENCES public.projects (id) ON DELETE SET NULL,
  subject text,
  created_by uuid REFERENCES auth.users (id),
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  archived_at timestamptz
);

CREATE INDEX IF NOT EXISTS conversations_project_id_idx ON public.conversations (project_id);
CREATE INDEX IF NOT EXISTS conversations_last_message_at_idx ON public.conversations (last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  left_at timestamptz,
  muted_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT conversation_participants_unique UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS conversation_participants_user_id_idx
  ON public.conversation_participants (user_id);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users (id),
  body text,
  attachment_path text,
  attachment_mime text,
  client_message_id text,
  sent_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT messages_body_or_attachment CHECK (
    body IS NOT NULL OR attachment_path IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS messages_client_message_id_uq
  ON public.messages (conversation_id, client_message_id)
  WHERE client_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS messages_conversation_id_idx
  ON public.messages (conversation_id, sent_at DESC);

CREATE TABLE IF NOT EXISTS public.message_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT message_receipts_unique UNIQUE (message_id, user_id)
);

CREATE OR REPLACE FUNCTION public.trg_messages_touch_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.sent_at, updated_at = timezone('utc', now())
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_touch_conversation ON public.messages;
CREATE TRIGGER messages_touch_conversation
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.trg_messages_touch_conversation();

DROP TRIGGER IF EXISTS conversations_set_updated_at ON public.conversations;
CREATE TRIGGER conversations_set_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS conversation_participants_set_updated_at ON public.conversation_participants;
CREATE TRIGGER conversation_participants_set_updated_at
  BEFORE UPDATE ON public.conversation_participants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS messages_set_updated_at ON public.messages;
CREATE TRIGGER messages_set_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS message_receipts_set_updated_at ON public.message_receipts;
CREATE TRIGGER message_receipts_set_updated_at
  BEFORE UPDATE ON public.message_receipts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_receipts ENABLE ROW LEVEL SECURITY;

