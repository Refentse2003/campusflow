-- Add user_id to tutors table to link tutors to their accounts
ALTER TABLE public.tutors 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Link existing tutors to their user accounts (based on email matching)
-- These tutors need to have accounts created with these emails first
-- Update for Refentse Atlegang Mokoena
UPDATE public.tutors
SET user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'refentse@campusflow.com'
  LIMIT 1
)
WHERE name = 'Refentse Atlegang Mokoena';

-- Update for Wanda Giqo
UPDATE public.tutors
SET user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'wanda@campusflow.com'
  LIMIT 1
)
WHERE name = 'Wanda Giqo';

-- Update for Silindokuhle Ngqokoma
UPDATE public.tutors
SET user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'silindokuhle@campusflow.com'
  LIMIT 1
)
WHERE name = 'Silindokuhle Ngqokoma';

-- Update the RLS policy for tutors to view their bookings
DROP POLICY IF EXISTS "Tutors can view bookings for their sessions" ON public.bookings;

CREATE POLICY "Tutors can view bookings for their sessions"
ON public.bookings
FOR SELECT
USING (
  has_role(auth.uid(), 'tutor'::app_role) 
  AND tutor_id IN (
    SELECT id FROM public.tutors WHERE user_id = auth.uid()
  )
);

-- Update the attendance RLS policy to use the new tutor linking
DROP POLICY IF EXISTS "Tutors can manage attendance for their sessions" ON public.attendance;

CREATE POLICY "Tutors can manage attendance for their sessions"
ON public.attendance
FOR ALL
USING (
  has_role(auth.uid(), 'tutor'::app_role) 
  AND tutor_id IN (
    SELECT id FROM public.tutors WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'tutor'::app_role) 
  AND tutor_id IN (
    SELECT id FROM public.tutors WHERE user_id = auth.uid()
  )
);