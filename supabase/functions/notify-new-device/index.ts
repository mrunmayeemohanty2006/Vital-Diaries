// Supabase Edge Function: notify-new-device
// Invoked when an untrusted device creates a login approval request.
//
// Security & Zero-Knowledge Invariants:
// 1. Authenticates caller via Supabase JWT (Authorization header).
// 2. Recipient email is strictly obtained from the authenticated user session (user.email).
// 3. Payload MUST NOT accept or process medical data, report titles, DEKs, KEKs, passwords, or recovery secrets.
// 4. Email is an informational alert ONLY. It does NOT contain direct approval links or bypass tokens.
// 5. Uses RESEND_API_KEY from Supabase Edge Function Secrets (never exposed in frontend code).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // 1. Authenticate the caller using user JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || !user.email) {
      return new Response(
        JSON.stringify({ error: "Unauthorized user session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Parse and validate security metadata
    const body = await req.json();
    const { device_name, browser, platform, timestamp } = body;

    // Reject if any medical or secret keys are sent in payload
    const forbiddenKeys = [
      "password", "passwordHash", "dek", "wrappedDek", "kek",
      "recoverySecret", "diagnosis", "report", "medicalNotes", "encryptedData"
    ];
    for (const k of forbiddenKeys) {
      if (body[k] !== undefined) {
        return new Response(
          JSON.stringify({ error: `Forbidden field '${k}' detected in security notification` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const safeDeviceName = String(device_name || "Unknown Device").slice(0, 100);
    const safeBrowser = String(browser || "Unknown Browser").slice(0, 100);
    const safePlatform = String(platform || "Unknown OS").slice(0, 100);
    const formattedTime = timestamp ? new Date(timestamp).toUTCString() : new Date().toUTCString();

    // 3. If Resend API key is not configured, return safe unconfigured notice (does not block client)
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          warning: "RESEND_API_KEY secret is not configured in Supabase Edge Functions. Email skipped.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Dispatch security email via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Vital Diaries Security <security@vitaldiaries.app>",
        to: [user.email],
        subject: "New Vital Diaries login request",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background-color: #FAF9F6; color: #1c1917; border-radius: 16px; border: 1px solid #e7e5e4;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #065f46; font-size: 20px; font-weight: 800; letter-spacing: 2px; margin: 0;">VITAL DIARIES</h1>
              <p style="color: #78716c; font-size: 12px; margin: 4px 0 0 0;">Zero-Knowledge Personal Health Records</p>
            </div>

            <div style="background-color: #ffffff; padding: 20px; border-radius: 12px; border: 1px solid #e7e5e4; margin-bottom: 20px;">
              <h2 style="font-size: 16px; font-weight: 700; color: #1c1917; margin: 0 0 12px 0;">New Sign-In Attempt Detected</h2>
              <p style="font-size: 13px; line-height: 1.5; color: #44403c; margin: 0 0 16px 0;">
                A new device is attempting to sign in to your Vital Diaries account. For your security, access to your encrypted health vault is currently locked on that device pending authorization.
              </p>

              <table style="width: 100%; font-size: 12px; border-collapse: collapse; margin-bottom: 16px;">
                <tr>
                  <td style="padding: 6px 0; color: #78716c; font-weight: 600;">Device:</td>
                  <td style="padding: 6px 0; color: #1c1917; font-weight: 700;">${safeDeviceName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #78716c; font-weight: 600;">Browser:</td>
                  <td style="padding: 6px 0; color: #1c1917;">${safeBrowser}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #78716c; font-weight: 600;">Platform:</td>
                  <td style="padding: 6px 0; color: #1c1917;">${safePlatform}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #78716c; font-weight: 600;">Time:</td>
                  <td style="padding: 6px 0; color: #1c1917;">${formattedTime}</td>
                </tr>
              </table>

              <div style="background-color: #fef3c7; border-left: 4px solid #d97706; padding: 12px; border-radius: 6px; font-size: 12px; color: #92400e; line-height: 1.4;">
                <strong>Action Required:</strong> Open Vital Diaries on an already trusted device (such as your primary computer or phone) to <strong>Approve</strong> or <strong>Deny</strong> this sign-in request.
              </div>
            </div>

            <p style="font-size: 11px; color: #a8a29e; text-align: center; margin: 0; line-height: 1.4;">
              If this was not you, no action is needed. The new device cannot unlock or view your encrypted health records without your explicit approval on an authorized device.
            </p>
          </div>
        `,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      return new Response(
        JSON.stringify({ success: false, error: `Resend API error: ${errText}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendData = await resendRes.json();
    return new Response(
      JSON.stringify({ success: true, id: resendData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
