-- STATUS: NOT APPLIED -- local proposal only. Requires explicit owner approval before remote apply.
DO $$ BEGIN
  CREATE TYPE public.document_status AS ENUM (
    'draft',
    'uploaded',
    'processing',
    'available',
    'under_review',
    'approved',
    'changes_requested',
    'superseded',
    'archived',
    'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.document_scan_status AS ENUM (
    'pending', 'clean', 'flagged', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.document_review_decision AS ENUM (
    'approved', 'changes_requested', 'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects (id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES auth.users (id),
  title text NOT NULL,
  category text,
  requires_customer_approval boolean NOT NULL DEFAULT false,
  current_version_id uuid,
  status public.document_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS documents_project_id_idx ON public.documents (project_id);
CREATE INDEX IF NOT EXISTS documents_owner_user_id_idx ON public.documents (owner_user_id);

CREATE TABLE IF NOT EXISTS public.document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents (id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number > 0),
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  byte_size bigint NOT NULL CHECK (byte_size >= 0),
  checksum_sha256 text,
  uploaded_by uuid NOT NULL REFERENCES auth.users (id),
  scan_status public.document_scan_status NOT NULL DEFAULT 'pending',
  status public.document_status NOT NULL DEFAULT 'uploaded',
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT document_versions_unique UNIQUE (document_id, version_number)
);

CREATE INDEX IF NOT EXISTS document_versions_document_id_idx ON public.document_versions (document_id);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'documents_current_version_id_fkey'
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_current_version_id_fkey
      FOREIGN KEY (current_version_id) REFERENCES public.document_versions (id)
      ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.document_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents (id) ON DELETE CASCADE,
  document_version_id uuid NOT NULL REFERENCES public.document_versions (id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users (id),
  decision public.document_review_decision NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT document_reviews_comment_required CHECK (
    decision <> 'changes_requested' OR (comment IS NOT NULL AND length(trim(comment)) > 0)
  )
);

CREATE INDEX IF NOT EXISTS document_reviews_document_id_idx ON public.document_reviews (document_id);

CREATE OR REPLACE FUNCTION public.trg_document_review_apply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_status public.document_status;
BEGIN
  new_status := CASE NEW.decision
    WHEN 'approved' THEN 'approved'::public.document_status
    WHEN 'changes_requested' THEN 'changes_requested'::public.document_status
    WHEN 'rejected' THEN 'rejected'::public.document_status
  END;

  UPDATE public.document_versions
  SET status = new_status, updated_at = timezone('utc', now())
  WHERE id = NEW.document_version_id;

  UPDATE public.documents
  SET status = new_status, updated_at = timezone('utc', now())
  WHERE id = NEW.document_id;

  PERFORM public.write_audit_log(
    'document.reviewed',
    'documents',
    NEW.document_id,
    jsonb_build_object('decision', NEW.decision, 'version_id', NEW.document_version_id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS document_reviews_apply ON public.document_reviews;
CREATE TRIGGER document_reviews_apply
  AFTER INSERT ON public.document_reviews
  FOR EACH ROW EXECUTE FUNCTION public.trg_document_review_apply();

DROP TRIGGER IF EXISTS documents_set_updated_at ON public.documents;
CREATE TRIGGER documents_set_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS document_versions_set_updated_at ON public.document_versions;
CREATE TRIGGER document_versions_set_updated_at
  BEFORE UPDATE ON public.document_versions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_reviews ENABLE ROW LEVEL SECURITY;

