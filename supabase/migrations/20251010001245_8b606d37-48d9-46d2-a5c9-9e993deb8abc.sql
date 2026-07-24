-- Create role enum
CREATE TYPE public.app_role AS ENUM ('student', 'tutor', 'admin');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Link existing tutors to their tutor accounts
-- This assumes the tutors have user accounts with these emails
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'tutor'::app_role
FROM public.profiles p
WHERE p.email IN (
  'refentse@campusflow.com',
  'wanda@campusflow.com', 
  'silindokuhle@campusflow.com'
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Create attendance table
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  student_id UUID NOT NULL,
  tutor_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'pending')),
  marked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (booking_id, student_id)
);

-- Enable RLS on attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Attendance RLS policies
CREATE POLICY "Tutors can manage attendance for their sessions"
  ON public.attendance
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'tutor') AND 
    tutor_id = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'tutor') AND 
    tutor_id = auth.uid()
  );

CREATE POLICY "Students can view their own attendance"
  ON public.attendance
  FOR SELECT
  USING (auth.uid() = student_id);

-- Update bookings RLS to allow tutors to view and update their bookings
CREATE POLICY "Tutors can view bookings for their sessions"
  ON public.bookings
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'tutor') AND
    tutor_id = (SELECT id FROM tutors WHERE tutors.id = bookings.tutor_id LIMIT 1)
  );

CREATE POLICY "Tutors can update booking status"
  ON public.bookings
  FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'tutor')
  );