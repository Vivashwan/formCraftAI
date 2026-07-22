// Thin wrapper over the Resend REST API. No-ops (returns { skipped: true })
// when RESEND_API_KEY isn't configured, so the app works without email set up.
export async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) return { skipped: true };

  const from = process.env.RESEND_FROM || "onboarding@resend.dev";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      console.error("Resend error:", res.status, await res.text());
      return { error: true };
    }
    return { ok: true };
  } catch (e) {
    console.error("Email send failed:", e);
    return { error: true };
  }
}
