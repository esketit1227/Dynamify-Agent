/**
 * Outreach email provider abstraction.
 *
 * This module is the ONLY place in the codebase allowed to actually send an
 * email, and `sendApprovedOutreach` (in src/lib/pipeline/send-outreach.ts)
 * is the only caller — it refuses to call `send` unless the outreach draft
 * it's given already has status "approved" with an `approvedByEmail` set.
 * There is no code path that sends a draft straight from generation.
 *
 * EMAIL_PROVIDER=log (default) never contacts a real provider — it just
 * records what would have been sent, which is what you want until a
 * provider is actually approved for use (per the product spec: "an email
 * provider only after explicit human approval").
 */

export interface OutreachEmail {
  to: string;
  fromEmail: string;
  subject: string;
  bodyText: string;
}

export interface SendResult {
  providerMessageId: string;
  provider: "log" | "resend";
}

export interface EmailProvider {
  send(email: OutreachEmail): Promise<SendResult>;
}

class LogEmailProvider implements EmailProvider {
  async send(email: OutreachEmail): Promise<SendResult> {
    const id = `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    console.log(
      `[dynamify-scout] EMAIL_PROVIDER=log — recording outreach send instead of delivering it.\n` +
        `  to: ${email.to}\n  from: ${email.fromEmail}\n  subject: ${email.subject}\n` +
        `  body:\n${email.bodyText
          .split("\n")
          .map((l) => `    ${l}`)
          .join("\n")}\n  id: ${id}`,
    );
    return { providerMessageId: id, provider: "log" };
  }
}

class ResendEmailProvider implements EmailProvider {
  async send(email: OutreachEmail): Promise<SendResult> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "EMAIL_PROVIDER=resend but RESEND_API_KEY is not set. Set it in .env.local, " +
          "or switch EMAIL_PROVIDER back to log for development.",
      );
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: email.fromEmail,
        to: [email.to],
        subject: email.subject,
        text: email.bodyText,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Resend send failed: ${res.status} ${res.statusText} ${body}`);
    }
    const json = (await res.json()) as { id: string };
    return { providerMessageId: json.id, provider: "resend" };
  }
}

export function getEmailProvider(): EmailProvider {
  const kind = process.env.EMAIL_PROVIDER ?? "log";
  if (kind === "resend") return new ResendEmailProvider();
  return new LogEmailProvider();
}
