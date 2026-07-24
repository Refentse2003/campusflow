-- Drop the existing check constraint that's causing issues
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_notification_type_check;

-- Add the correct check constraint for notification types
ALTER TABLE public.tasks ADD CONSTRAINT tasks_notification_type_check 
CHECK (notification_type IS NULL OR notification_type IN ('1hour', '1day', '2days', '1week'));

-- Drop the check constraint for bookings that might be causing issues
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_notification_type_check;

-- Add the correct check constraint for booking notification types
ALTER TABLE public.bookings ADD CONSTRAINT bookings_notification_type_check 
CHECK (notification_type IS NULL OR notification_type IN ('1hour', '1day', '2days', '1week'));