import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://ciyrtjmzgxvpysmtftyt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpeXJ0am16Z3h2cHlzbXRmdHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NTE1ODgsImV4cCI6MjA3MzUyNzU4OH0.2FRwGfkW88JoEe8bKiv2kJfQ--4KmghdxkTnHejV7Uk";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});