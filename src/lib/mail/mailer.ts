import "server-only";
import { env } from "@/lib/env";

/**
 * A one-method mail port with three adapters. The rest of the app only ever
 * sees `sendMail(...)`, so switching Resend ⇄ SMTP is an env change, and local
 * development needs no mail credentials at all (`console` prints the message).
 *
 * Provider SDKs are imported lazily inside their adapter so that a deployment
 * using SMTP never loads the Resend client, and vice versa.
 */

export interface MailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export type MailResult =
  | { ok: true; provider: string; id?: string }
  | { ok: false; provider: string; error: string };

async function sendViaResend(msg: MailMessage): Promise<MailResult> {
  const cfg = env();
  if (!cfg.RESEND_API_KEY) {
    return { ok: false, provider: "resend", error: "RESEND_API_KEY is not set" };
  }
  const { Resend } = await import("resend");
  const resend = new Resend(cfg.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: cfg.EMAIL_FROM,
    to: Array.isArray(msg.to) ? msg.to : [msg.to],
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
    ...(msg.replyTo ? { replyTo: msg.replyTo } : {}),
  });
  if (error) return { ok: false, provider: "resend", error: error.message };
  return { ok: true, provider: "resend", id: data?.id };
}

async function sendViaSmtp(msg: MailMessage): Promise<MailResult> {
  const cfg = env();
  if (!cfg.SMTP_HOST) {
    return { ok: false, provider: "smtp", error: "SMTP_HOST is not set" };
  }
  const nodemailer = (await import("nodemailer")).default;
  const transport = nodemailer.createTransport({
    host: cfg.SMTP_HOST,
    port: cfg.SMTP_PORT,
    secure: cfg.SMTP_SECURE,
    auth: cfg.SMTP_USER ? { user: cfg.SMTP_USER, pass: cfg.SMTP_PASSWORD } : undefined,
  });
  const info = await transport.sendMail({
    from: cfg.EMAIL_FROM,
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
    replyTo: msg.replyTo,
  });
  return { ok: true, provider: "smtp", id: info.messageId };
}

function sendViaConsole(msg: MailMessage): MailResult {
  const to = Array.isArray(msg.to) ? msg.to.join(", ") : msg.to;
  console.info(
    [
      "",
      "──────────── ✉  email (EMAIL_PROVIDER=console) ────────────",
      `To:      ${to}`,
      `Subject: ${msg.subject}`,
      msg.replyTo ? `Reply-To: ${msg.replyTo}` : "",
      "",
      msg.text,
      "───────────────────────────────────────────────────────────",
      "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
  return { ok: true, provider: "console" };
}

/**
 * Never throws. Notification mail is a side effect of an RSVP; a bounced
 * notification must not lose the guest's response, so failures are reported to
 * the caller (and logged) rather than propagated.
 */
export async function sendMail(msg: MailMessage): Promise<MailResult> {
  const provider = env().EMAIL_PROVIDER;
  try {
    switch (provider) {
      case "resend":
        return await sendViaResend(msg);
      case "smtp":
        return await sendViaSmtp(msg);
      default:
        return sendViaConsole(msg);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[mail] ${provider} delivery failed:`, message);
    return { ok: false, provider, error: message };
  }
}
