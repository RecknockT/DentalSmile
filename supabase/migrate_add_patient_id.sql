-- Migration: add patient_id to appointments and populate from patient name
BEGIN;

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS patient_id bigint;

-- Populate patient_id from existing patients by matching name
UPDATE public.appointments a
SET patient_id = p.id
FROM public.patients p
WHERE a.patient = p.name;

-- Note: review rows where patient_id is still NULL before enforcing NOT NULL
-- To enforce not null uncomment the next line after you verify data:
-- ALTER TABLE public.appointments ALTER COLUMN patient_id SET NOT NULL;

-- Add foreign key constraint (use ON DELETE SET NULL to avoid blocking deletes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.conname = 'appointments_patient_id_fkey'
      AND t.relname = 'appointments'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id)
      REFERENCES public.patients(id) ON DELETE SET NULL;
  END IF;
END$$;

COMMIT;
