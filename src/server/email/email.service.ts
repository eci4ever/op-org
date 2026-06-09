import 'dotenv/config';

import type {
  EmailTemplate,
  SendEmailInput,
  SendEmailResult,
} from "@/server/email/email.types";
import { renderEmailTemplate } from "@/server/email/email.templates";

type EmailEnv = {
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_REPLY_TO?: string;
  EMAIL_SUPPORT?: string;
  EMAIL_BRAND_NAME?: string;
  APP_BASE_URL?: string;
};

function getEmailEnv() {
  return process.env as unknown as EmailEnv;
}

export function getEmailBrandName() {
  return getEmailEnv().EMAIL_BRAND_NAME ?? "Platform";
}

export function getAppBaseUrl() {
  return getEmailEnv().APP_BASE_URL ?? "http://localhost:3000";
}

export function buildAuthUrl(path: string) {
  const base = getAppBaseUrl().replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const emailEnv = getEmailEnv();

  if (!emailEnv.RESEND_API_KEY || !emailEnv.EMAIL_FROM) {
    return { ok: false, error: "Email delivery is not configured." };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${emailEnv.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: emailEnv.EMAIL_FROM,
      to: input.to,
      reply_to: input.replyTo ?? emailEnv.EMAIL_REPLY_TO,
      subject: input.template.subject,
      text: input.template.text,
      html: input.template.html,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error(
      `Resend rejected email (status ${response.status}): ${detail}`,
    );
    return { ok: false, error: "Email provider rejected the message." };
  }

  const body = (await response.json().catch(() => null)) as
    | { id?: string }
    | null;

  return { ok: true, providerId: body?.id ?? null };
}

export function makeEmailTemplate(
  template: Parameters<typeof renderEmailTemplate>[0],
  params: Omit<Parameters<typeof renderEmailTemplate>[1], "brandName">,
): EmailTemplate {
  const emailEnv = getEmailEnv();

  return renderEmailTemplate(template, {
    brandName: getEmailBrandName(),
    supportEmail: emailEnv.EMAIL_SUPPORT,
    ...params,
  });
}
