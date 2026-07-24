-- Drop functions with CASCADE to remove all dependent triggers
DROP FUNCTION IF EXISTS call_booking_email_webhook() CASCADE;
DROP FUNCTION IF EXISTS resend_booking_confirmation(uuid) CASCADE;
DROP FUNCTION IF EXISTS send_booking_confirmation_email() CASCADE;
