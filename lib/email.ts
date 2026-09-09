// lib/email.ts
//
// Transactional email via Resend's HTTP API (no SDK dependency — a single
// fetch call keeps this file self-contained). Requires a RESEND_API_KEY
// env var; without it, sendEmail() logs and no-ops rather than throwing,
// so nothing else in the app breaks if email isn't configured yet (same
// "gracefully degrade when unconfigured" pattern as Supabase throughout
// this codebase).
//
// Sending as info@opennetrikkan.com additionally requires opennetrikkan.com
// to be verified as a sending domain in the Resend dashboard (a few DNS
// records) — that step has to happen outside this code.

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_ADDRESS = "Open Netrikkan <info@opennetrikkan.com>";

export const isEmailConfigured = Boolean(RESEND_API_KEY);

export async function sendEmail(input: { to: string; subject: string; html: string }): Promise<{ sent: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    console.warn(`[email] RESEND_API_KEY not set — skipping "${input.subject}" to ${input.to}`);
    return { sent: false, error: "not_configured" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM_ADDRESS, to: input.to, subject: input.subject, html: input.html }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`[email] Resend API error ${res.status}: ${text}`);
      return { sent: false, error: text };
    }
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[email] send failed:", message);
    return { sent: false, error: message };
  }
}

const WRAPPER = (title: string, body: string) => `
  <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto;">
    <div style="background: #4c1d95; color: white; padding: 20px 24px; border-radius: 8px 8px 0 0;">
      <span style="font-weight: 700; font-size: 16px;">Open Netrikkan</span>
    </div>
    <div style="border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; padding: 24px;">
      <h1 style="font-size: 18px; margin: 0 0 12px; color: #1e293b;">${title}</h1>
      ${body}
    </div>
    <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">Sent by MfgPlan &middot; Open Netrikkan</p>
  </div>
`;

export function inviteEmail(opts: { companyName: string; roleLabel: string; loginUrl: string }): { subject: string; html: string } {
  return {
    subject: `You've been invited to join ${opts.companyName} on MfgPlan`,
    html: WRAPPER(
      "You're invited",
      `<p style="color:#475569;font-size:14px;line-height:1.6;">
        You've been added to <strong>${opts.companyName}</strong> on MfgPlan as
        <strong>${opts.roleLabel}</strong>. Sign in with this same email address to get access
        automatically — no separate signup step needed.
      </p>
      <a href="${opts.loginUrl}" style="display:inline-block;margin-top:12px;background:#7c3aed;color:white;
        padding:10px 18px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">
        Sign in
      </a>`
    ),
  };
}

export function rfpStageHandoffEmail(opts: {
  projectName: string;
  stageLabel: string;
  actionUrl: string;
  note?: string;
}): { subject: string; html: string } {
  return {
    subject: `Action needed: "${opts.projectName}" is ready for ${opts.stageLabel}`,
    html: WRAPPER(
      `${opts.projectName} needs your input`,
      `<p style="color:#475569;font-size:14px;line-height:1.6;">
        This RFP has moved into the <strong>${opts.stageLabel}</strong> stage and is waiting on your team.
        ${opts.note ? `<br/><em>${opts.note}</em>` : ""}
      </p>
      <a href="${opts.actionUrl}" style="display:inline-block;margin-top:12px;background:#7c3aed;color:white;
        padding:10px 18px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">
        Open RFP
      </a>`
    ),
  };
}
