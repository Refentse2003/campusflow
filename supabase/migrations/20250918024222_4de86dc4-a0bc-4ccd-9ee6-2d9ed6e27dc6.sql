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

-- Create a cron job to run our notification scheduler every minute
SELECT cron.schedule(
  'schedule-task-notifications',
  '* * * * *', -- every minute
  $$
  select
    net.http_post(
        url:='https://ciyrtjmzgxvpysmtftyt.supabase.co/functions/v1/schedule-task-notifications',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpeXJ0am16Z3h2cHlzbXRmdHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NTE1ODgsImV4cCI6MjA3MzUyNzU4OH0.2FRwGfkW88JoEe8bKiv2kJfQ--4KmghdxkTnHejV7Uk"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);