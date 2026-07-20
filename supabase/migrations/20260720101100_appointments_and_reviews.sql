-- STATUS: NOT APPLIED -- local proposal only. Requires explicit owner approval before remote apply.
DO $$ BEGIN
  CREATE TYPE public.appointment_status AS ENUM (
    'requested', 'confirmed', 'rescheduled', 'cancelled', 'completed', 'no_show'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.availability_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id uuid REFERENCES auth.users (id),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'Europe/Amsterdam',
  is_bookable boolean NOT NULL DEFAULT true,
  capacity integer NOT NULL DEFAULT 1 CHECK (capacity > 0),
  booked_count integer NOT NULL DEFAULT 0 CHECK (booked_count >= 0),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT availability_slots_range CHECK (ends_at > starts_at),
  CONSTRAINT availability_slots_capacity CHECK (booked_count <= capacity)
);

CREATE INDEX IF NOT EXISTS availability_slots_starts_at_idx ON public.availability_slots (starts_at);

CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_user_id uuid NOT NULL REFERENCES auth.users (id),
  staff_user_id uuid REFERENCES auth.users (id),
  slot_id uuid REFERENCES public.availability_slots (id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects (id) ON DELETE SET NULL,
  status public.appointment_status NOT NULL DEFAULT 'requested',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'Europe/Amsterdam',
  location text,
  meeting_url text,
  notes text,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT appointments_range CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS appointments_customer_user_id_idx ON public.appointments (customer_user_id);
CREATE INDEX IF NOT EXISTS appointments_starts_at_idx ON public.appointments (starts_at);
CREATE INDEX IF NOT EXISTS appointments_status_idx ON public.appointments (status);

-- Prevent double-booking beyond slot capacity (transactional booking belongs in edge function)
CREATE OR REPLACE FUNCTION public.trg_appointment_slot_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.slot_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.status IN ('requested', 'confirmed') THEN
    UPDATE public.availability_slots
    SET booked_count = booked_count + 1, updated_at = timezone('utc', now())
    WHERE id = NEW.slot_id
      AND booked_count < capacity
      AND is_bookable = true;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Slot unavailable';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.status IN ('requested', 'confirmed')
     AND NEW.status IN ('cancelled', 'no_show')
     AND NEW.slot_id IS NOT NULL THEN
    UPDATE public.availability_slots
    SET booked_count = GREATEST(booked_count - 1, 0), updated_at = timezone('utc', now())
    WHERE id = NEW.slot_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS appointments_slot_capacity ON public.appointments;
CREATE TRIGGER appointments_slot_capacity
  AFTER INSERT OR UPDATE OF status ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.trg_appointment_slot_capacity();

DO $$ BEGIN
  CREATE TYPE public.review_status AS ENUM (
    'draft', 'submitted', 'published', 'hidden', 'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users (id),
  project_id uuid REFERENCES public.projects (id) ON DELETE SET NULL,
  product_id uuid,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text,
  body text,
  status public.review_status NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  moderated_by uuid REFERENCES auth.users (id),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz
);

DO $$ BEGIN
  IF to_regclass('public.products') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_product_id_fkey') THEN
    ALTER TABLE public.reviews
      ADD CONSTRAINT reviews_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products (id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS reviews_author_id_idx ON public.reviews (author_id);
CREATE INDEX IF NOT EXISTS reviews_status_idx ON public.reviews (status);

DROP TRIGGER IF EXISTS availability_slots_set_updated_at ON public.availability_slots;
CREATE TRIGGER availability_slots_set_updated_at
  BEFORE UPDATE ON public.availability_slots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS appointments_set_updated_at ON public.appointments;
CREATE TRIGGER appointments_set_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS reviews_set_updated_at ON public.reviews;
CREATE TRIGGER reviews_set_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

