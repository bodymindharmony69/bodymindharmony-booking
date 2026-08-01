-- One-time: align legacy booking_requests (README schema) with the app.
-- Safe to run multiple times (checks information_schema).

-- Rename legacy columns → app columns (only when target is missing)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'booking_requests' AND column_name = 'selected_date'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'booking_requests' AND column_name = 'booking_date'
  ) THEN
    ALTER TABLE public.booking_requests RENAME COLUMN selected_date TO booking_date;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'booking_requests' AND column_name = 'selected_time'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'booking_requests' AND column_name = 'booking_time'
  ) THEN
    ALTER TABLE public.booking_requests RENAME COLUMN selected_time TO booking_time;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'booking_requests' AND column_name = 'name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'booking_requests' AND column_name = 'client_name'
  ) THEN
    ALTER TABLE public.booking_requests RENAME COLUMN name TO client_name;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'booking_requests' AND column_name = 'email'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'booking_requests' AND column_name = 'client_email'
  ) THEN
    ALTER TABLE public.booking_requests RENAME COLUMN email TO client_email;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'booking_requests' AND column_name = 'phone'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'booking_requests' AND column_name = 'client_phone'
  ) THEN
    ALTER TABLE public.booking_requests RENAME COLUMN phone TO client_phone;
  END IF;
END $$;

-- booking_date: coerce text → date when needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'booking_requests'
      AND column_name = 'booking_date' AND data_type IN ('text', 'character varying')
  ) THEN
    ALTER TABLE public.booking_requests
      ALTER COLUMN booking_date TYPE date USING ((nullif(trim(booking_date::text), ''))::date);
  END IF;
END $$;

-- status for admin accept/decline
ALTER TABLE public.booking_requests ADD COLUMN IF NOT EXISTS status text;
UPDATE public.booking_requests SET status = 'pending' WHERE status IS NULL OR trim(status) = '';
ALTER TABLE public.booking_requests ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE public.booking_requests ALTER COLUMN status SET NOT NULL;
