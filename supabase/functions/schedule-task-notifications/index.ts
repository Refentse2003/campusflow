import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function getNotificationTime(dueDate: Date, notificationType: string): Date {
  const notificationTime = new Date(dueDate);
  
  switch (notificationType) {
    case '1hour':
      notificationTime.setHours(notificationTime.getHours() - 1);
      break;
    case '1day':
      notificationTime.setDate(notificationTime.getDate() - 1);
      break;
    case '2days':
      notificationTime.setDate(notificationTime.getDate() - 2);
      break;
    case '1week':
      notificationTime.setDate(notificationTime.getDate() - 7);
      break;
    default:
      // Default to 1 day before
      notificationTime.setDate(notificationTime.getDate() - 1);
  }
  
  return notificationTime;
}

function getNotificationMessage(type: string, timeText: string): string {
  if (type === 'booking') {
    return `your tutorial session is ${timeText} from now`;
  }
  return `your task is due ${timeText} from now`;
}

function getTimeText(notificationType: string): string {
  switch (notificationType) {
    case '1hour':
      return 'in an hour';
    case '1day':
      return 'in a day';
    case '2days':
      return 'in 2 days';
    case '1week':
      return 'in a week';
    default:
      return 'soon';
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if this is a manual trigger (from task/booking creation)
    const body = await req.text();
    let requestData = null;
    
    try {
      requestData = body ? JSON.parse(body) : null;
    } catch (e) {
      // Ignore parsing errors for cron jobs
    }

    const now = new Date();

    // If this is a manual trigger for a specific task/booking
    if (requestData && (requestData.task_id || requestData.booking_id)) {
      if (requestData.task_id) {
        // Schedule task notification
        const timeText = getTimeText(requestData.notification_type);
        const message = getNotificationMessage('task', timeText);
        
        await supabase.functions.invoke('send-notification-email', {
          body: {
            to: requestData.user_email,
            subject: `Task Notification Scheduled: ${requestData.task_title}`,
            html: `
              <h1>Task Notification Scheduled</h1>
              <p>You will receive a reminder that ${message}.</p>
              <p><strong>Task:</strong> ${requestData.task_title}</p>
              <p><strong>Due Date:</strong> ${new Date(requestData.due_date).toLocaleString()}</p>
              <p><strong>Priority:</strong> ${requestData.priority}</p>
              <p><strong>Subject:</strong> ${requestData.subject || 'Not specified'}</p>
              <p><strong>Reminder:</strong> ${timeText}</p>
            `,
            type: 'task'
          }
        });
      }
      
      if (requestData.booking_id) {
        // Schedule booking notification
        const timeText = getTimeText(requestData.notification_type);
        const message = getNotificationMessage('booking', timeText);
        
        await supabase.functions.invoke('send-notification-email', {
          body: {
            to: requestData.user_email,
            subject: `Tutorial Session Notification Scheduled with ${requestData.tutor_name}`,
            html: `
              <h1>Tutorial Session Notification Scheduled</h1>
              <p>You will receive a reminder that ${message}.</p>
              <p><strong>Tutor:</strong> ${requestData.tutor_name}</p>
              <p><strong>Date:</strong> ${requestData.session_date}</p>
              <p><strong>Time:</strong> ${requestData.session_time}</p>
              <p><strong>Subject:</strong> ${requestData.subject}</p>
              <p><strong>Reminder:</strong> ${timeText}</p>
            `,
            type: 'booking'
          }
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Notification scheduled',
        scheduled_at: now.toISOString()
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    // Regular cron job - check for due notifications
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    // Check for tasks that need notifications
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*, profiles!inner(email)')
      .eq('completed', false)
      .not('notification_type', 'is', null)
      .not('due_date', 'is', null);

    if (tasksError) {
      throw tasksError;
    }

    // Check for bookings that need notifications
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*, profiles!inner(email), tutors!inner(name)')
      .eq('status', 'confirmed')
      .not('notification_type', 'is', null);

    if (bookingsError) {
      throw bookingsError;
    }

    let notificationsSent = 0;

    // Process task notifications
    for (const task of tasks || []) {
      if (task.due_date && task.notification_type) {
        const dueDate = new Date(task.due_date);
        const notificationTime = getNotificationTime(dueDate, task.notification_type);
        
        // Check if the notification should be sent now (within the next 5 minutes)
        if (notificationTime <= fiveMinutesFromNow && notificationTime > now) {
          try {
            const timeText = getTimeText(task.notification_type);
            
            // Send email notification
            await supabase.functions.invoke('send-notification-email', {
              body: {
                to: task.profiles.email,
                subject: `Task Reminder: ${task.title}`,
                html: `
                  <h1>Task Reminder</h1>
                  <p>This is a reminder that ${getNotificationMessage('task', timeText)}.</p>
                  <p><strong>Task:</strong> ${task.title}</p>
                  <p><strong>Due Date:</strong> ${dueDate.toLocaleString()}</p>
                  <p><strong>Priority:</strong> ${task.priority}</p>
                  <p><strong>Subject:</strong> ${task.subject || 'Not specified'}</p>
                `,
                type: 'reminder'
              }
            });

            // Create in-app notification
            await supabase
              .from('notifications')
              .insert({
                user_id: task.user_id,
                title: 'Task Reminder',
                message: `Your task "${task.title}" is due ${timeText}`,
                type: 'reminder',
                task_id: task.id
              });

            notificationsSent++;
          } catch (error) {
            console.error(`Failed to send notification for task ${task.id}:`, error);
          }
        }
      }
    }

    // Process booking notifications
    for (const booking of bookings || []) {
      if (booking.session_date && booking.session_time && booking.notification_type) {
        // Combine session_date and session_time
        const sessionDateTime = new Date(`${booking.session_date}T${booking.session_time}`);
        const notificationTime = getNotificationTime(sessionDateTime, booking.notification_type);
        
        // Check if the notification should be sent now (within the next 5 minutes)
        if (notificationTime <= fiveMinutesFromNow && notificationTime > now) {
          try {
            const tutorName = booking.tutors?.name || 'Your tutor';
            const timeText = getTimeText(booking.notification_type);
            
            // Send email notification
            await supabase.functions.invoke('send-notification-email', {
              body: {
                to: booking.profiles.email,
                subject: `Tutorial Session Reminder with ${tutorName}`,
                html: `
                  <h1>Tutorial Session Reminder</h1>
                  <p>This is a reminder that ${getNotificationMessage('booking', timeText)}.</p>
                  <p><strong>Tutor:</strong> ${tutorName}</p>
                  <p><strong>Date:</strong> ${booking.session_date}</p>
                  <p><strong>Time:</strong> ${booking.session_time}</p>
                  <p><strong>Subject:</strong> ${booking.subject}</p>
                `,
                type: 'reminder'
              }
            });

            // Create in-app notification
            await supabase
              .from('notifications')
              .insert({
                user_id: booking.user_id,
                title: 'Tutorial Session Reminder',
                message: `Your tutorial session with ${tutorName} is ${timeText}`,
                type: 'reminder'
              });

            notificationsSent++;
          } catch (error) {
            console.error(`Failed to send notification for booking ${booking.id}:`, error);
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      notifications_sent: notificationsSent,
      checked_at: now.toISOString()
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in schedule-task-notifications function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);