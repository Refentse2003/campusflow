import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const now = new Date()
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)

    // Check for tasks due in 1 day
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        *,
        profiles!inner(email, full_name)
      `)
      .eq('completed', false)
      .gte('due_date', now.toISOString())
      .lte('due_date', oneDayFromNow.toISOString())
      .not('notification_type', 'is', null)

    // Check for tutorial sessions due in 1 day
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        *,
        profiles!inner(email, full_name)
      `)
      .eq('status', 'confirmed')
      .gte('session_date', now.toISOString().split('T')[0])
      .lte('session_date', oneDayFromNow.toISOString().split('T')[0])

    // Send task reminder emails
    if (tasks && tasks.length > 0) {
      for (const task of tasks) {
        await supabase.functions.invoke('send-notification-email', {
          body: {
            to: task.profiles.email,
            subject: `Task Reminder: ${task.title}`,
            html: `
              <h2>Task Reminder</h2>
              <p>Hi ${task.profiles.full_name},</p>
              <p>This is a reminder that your task "<strong>${task.title}</strong>" is due soon.</p>
              <p><strong>Due Date:</strong> ${new Date(task.due_date).toLocaleDateString()}</p>
              <p><strong>Priority:</strong> ${task.priority}</p>
              ${task.subject ? `<p><strong>Subject:</strong> ${task.subject}</p>` : ''}
              <p>Don't forget to complete it on time!</p>
              <br>
              <p>Best regards,<br>CampusFlow Team</p>
            `,
            type: 'reminder'
          }
        })

        // Create in-app notification
        await supabase
          .from('notifications')
          .insert({
            user_id: task.user_id,
            title: `Task Reminder: ${task.title}`,
            message: `Your task "${task.title}" is due soon`,
            type: 'task',
            task_id: task.id
          })
      }
    }

    // Send booking reminder emails
    if (bookings && bookings.length > 0) {
      for (const booking of bookings) {
        await supabase.functions.invoke('send-notification-email', {
          body: {
            to: booking.profiles.email,
            subject: `Tutorial Session Reminder: ${booking.subject}`,
            html: `
              <h2>Tutorial Session Reminder</h2>
              <p>Hi ${booking.profiles.full_name},</p>
              <p>This is a reminder about your upcoming tutorial session.</p>
              <p><strong>Subject:</strong> ${booking.subject}</p>
              <p><strong>Date:</strong> ${new Date(booking.session_date).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${booking.session_time}</p>
              <p>Don't forget to attend your session!</p>
              <br>
              <p>Best regards,<br>CampusFlow Team</p>
            `,
            type: 'reminder'
          }
        })

        // Create in-app notification
        await supabase
          .from('notifications')
          .insert({
            user_id: booking.user_id,
            title: `Tutorial Session Reminder: ${booking.subject}`,
            message: `Your tutorial session is scheduled for today`,
            type: 'tutor'
          })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        taskReminders: tasks?.length || 0,
        bookingReminders: bookings?.length || 0
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in schedule-notifications:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);