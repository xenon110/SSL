import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawEmail = typeof body.email === 'string' ? body.email : '';
    const rawError = typeof body.error === 'string' ? body.error : '';

    // Sanitize input strings to prevent log injection
    const email = rawEmail.replace(/[\r\n]/g, '').trim().substring(0, 255);
    const error = rawError.replace(/[\r\n]/g, '').trim().substring(0, 500);

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const timestamp = new Date().toISOString();
    const userAgent = (req.headers.get("user-agent") || "Unknown Browser").substring(0, 300);
    const forwardedFor = (req.headers.get("x-forwarded-for") || "Unknown IP").split(',')[0].trim().substring(0, 45);

    console.warn(`[SECURITY ALERT] Failed login attempt detected!`);
    console.warn(`Attempted Email: ${email}`);
    console.warn(`Time: ${timestamp}`);
    console.warn(`Error: ${error}`);
    console.warn(`IP / User Agent: ${forwardedFor} | ${userAgent}`);

    // Log to Supabase security audit logs table if exists or save as request log
    try {
      await supabaseAdmin.from("security_logs").insert([
        {
          event_type: "FAILED_LOGIN",
          attempted_email: email,
          error_message: error || "Invalid credentials",
          ip_address: forwardedFor,
          user_agent: userAgent,
          notify_recipient: "mayankrajdto@gmail.com",
          created_at: timestamp,
        }
      ]);
    } catch (dbErr) {
      // Non-blocking log insertion failure
    }

    // Attempt email dispatch via Formspree / Webhook endpoint if available
    try {
      await fetch("https://formspree.io/f/mayankrajdto@gmail.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: `🚨 Security Alert: Failed Login Attempt (${email})`,
          email: "security-alert@samridhisponge.com",
          message: `A failed login attempt was detected on Samridhi Prime Dashboard.\n\nAttempted Email: ${email}\nReason: ${error || "Invalid Credentials"}\nTime: ${timestamp}\nIP Address: ${forwardedFor}\nUser-Agent: ${userAgent}\nNotification Sent To: mayankrajdto@gmail.com`,
        }),
      });
    } catch (emailErr) {
      // Fallback
    }

    return NextResponse.json({
      success: true,
      message: "Security alert logged and notification dispatched to mayankrajdto@gmail.com",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
