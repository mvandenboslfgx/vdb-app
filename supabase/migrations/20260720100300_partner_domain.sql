-- STATUS: NOT APPLIED -- local proposal only. Requires explicit owner approval before remote apply.
DO $$ BEGIN
  CREATE TYPE public.partner_application_status AS ENUM (
    'draft', 'submitted', 'under_review', 'approved', 'rejected', 'suspended'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.partner_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name text NOT NULL,
  company_name text,
  email text NOT NULL,
  phone text,
  country text,
  experience text,
  sales_channel text,
  motivation text,
  accepted_partner_rules boolean NOT NULL DEFAULT false,
  accepted_privacy_policy boolean NOT NULL DEFAULT false,
  status public.partner_application_status NOT NULL DEFAULT 'draft',
  reviewed_by uuid REFERENCES auth.users (id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS partner_applications_user_id_idx ON public.partner_applications (user_id);
CREATE INDEX IF NOT EXISTS partner_applications_status_idx ON public.partner_applications (status);

CREATE TABLE IF NOT EXISTS public.partner_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  application_id uuid REFERENCES public.partner_applications (id),
  display_name text NOT NULL,
  company_name text,
  bio text,
  website text,
  is_active boolean NOT NULL DEFAULT true,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.partner_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partner_profiles (id) ON DELETE CASCADE,
  code text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  campaign text,
  max_uses integer,
  uses_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT partner_codes_code_unique UNIQUE (code),
  CONSTRAINT partner_codes_code_format CHECK (code ~ '^[A-Z0-9_-]{4,32}$')
);

CREATE INDEX IF NOT EXISTS partner_codes_partner_id_idx ON public.partner_codes (partner_id);

CREATE TABLE IF NOT EXISTS public.partner_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partner_profiles (id) ON DELETE CASCADE,
  code_id uuid REFERENCES public.partner_codes (id) ON DELETE SET NULL,
  slug text NOT NULL,
  destination_path text NOT NULL DEFAULT '/',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  is_active boolean NOT NULL DEFAULT true,
  click_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT partner_links_slug_unique UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS partner_links_partner_id_idx ON public.partner_links (partner_id);

DROP TRIGGER IF EXISTS partner_applications_set_updated_at ON public.partner_applications;
CREATE TRIGGER partner_applications_set_updated_at
  BEFORE UPDATE ON public.partner_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS partner_profiles_set_updated_at ON public.partner_profiles;
CREATE TRIGGER partner_profiles_set_updated_at
  BEFORE UPDATE ON public.partner_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS partner_codes_set_updated_at ON public.partner_codes;
CREATE TRIGGER partner_codes_set_updated_at
  BEFORE UPDATE ON public.partner_codes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS partner_links_set_updated_at ON public.partner_links;
CREATE TRIGGER partner_links_set_updated_at
  BEFORE UPDATE ON public.partner_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_links ENABLE ROW LEVEL SECURITY;

