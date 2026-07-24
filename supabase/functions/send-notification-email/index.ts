import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  type: 'task' | 'booking' | 'reminder';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, html, type }: EmailRequest = await req.json();
    
    console.log(`📧 Sending ${type} email to:`, to);
    
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      console.error("❌ RESEND_API_KEY not configured");
      throw new Error("RESEND_API_KEY not configured");
    }

    if (!to || !subject || !html) {
      throw new Error("Missing required fields");
    }

    const resend = new Resend(apiKey);

    console.log("📤 Calling Resend API...");
    const { data, error } = await resend.emails.send({
      from: "CampusFlow <onboarding@resend.dev>",
      to: [to],
      subject: subject,
      html: html,
    });

    if (error) {
      console.error("❌ Resend API error:", error);
      throw new Error(`Resend error: ${error.message}`);
    }

    console.log("✅ Email sent successfully! ID:", data?.id);

    return new Response(JSON.stringify({ 
      success: true, 
      id: data?.id,
      message: "Email sent successfully" 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("❌ Error in send-notification-email:", error.message);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);