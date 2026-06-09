import type {
  EmailTemplate,
  EmailTemplateId,
  EmailTemplateParams,
} from "@/server/email/email.types";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function linkText(actionUrl?: string) {
  return actionUrl ? `\n\nOpen this link: ${actionUrl}` : "";
}

function buttonHtml(label: string, actionUrl?: string) {
  if (!actionUrl) return "";

  return `<p><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 14px;border-radius:6px">${escapeHtml(label)}</a></p>`;
}

export function renderEmailTemplate(
  id: EmailTemplateId,
  params: EmailTemplateParams,
): EmailTemplate {
  const brand = params.brandName;
  const org = params.organizationName ?? "your organization";
  const name = params.recipientName ? ` ${params.recipientName}` : "";
  const support = params.supportEmail
    ? `\n\nNeed help? Contact ${params.supportEmail}.`
    : "";

  if (id === "organization-invitation") {
    return {
      subject: `You have been invited to ${org}`,
      previewText: `Join ${org} on ${brand}.`,
      text: `Hello${name},\n\nYou have been invited to join ${org} on ${brand}.${linkText(params.actionUrl)}${support}`,
      html: `<p>Hello${escapeHtml(name)},</p><p>You have been invited to join <strong>${escapeHtml(org)}</strong> on ${escapeHtml(brand)}.</p>${buttonHtml("View invitation", params.actionUrl)}<p>${escapeHtml(support.trim())}</p>`,
    };
  }

  if (id === "email-verification") {
    return {
      subject: `Verify your ${brand} email`,
      previewText: "Confirm your email address.",
      text: `Hello${name},\n\nConfirm your email address for ${brand}.${linkText(params.actionUrl)}${support}`,
      html: `<p>Hello${escapeHtml(name)},</p><p>Confirm your email address for ${escapeHtml(brand)}.</p>${buttonHtml("Verify email", params.actionUrl)}<p>${escapeHtml(support.trim())}</p>`,
    };
  }

  if (id === "password-reset") {
    return {
      subject: `Reset your ${brand} password`,
      previewText: "Reset your password securely.",
      text: `Hello${name},\n\nUse the secure link to reset your ${brand} password.${linkText(params.actionUrl)}${support}`,
      html: `<p>Hello${escapeHtml(name)},</p><p>Use the secure link below to reset your ${escapeHtml(brand)} password.</p>${buttonHtml("Reset password", params.actionUrl)}<p>${escapeHtml(support.trim())}</p>`,
    };
  }

  const lifecycleLabel =
    id === "organization-suspended"
      ? "suspended"
      : id === "organization-reactivated"
        ? "reactivated"
        : id === "organization-archived"
          ? "archived"
          : "updated";

  if (id === "impersonation-started") {
    return {
      subject: `${brand} account access notification`,
      previewText: "A platform administrator started impersonation.",
      text: `Hello${name},\n\nA platform administrator started impersonation for support or operational purposes.\n\nReason: ${params.reason ?? "Not provided"}${support}`,
      html: `<p>Hello${escapeHtml(name)},</p><p>A platform administrator started impersonation for support or operational purposes.</p><p><strong>Reason:</strong> ${escapeHtml(params.reason ?? "Not provided")}</p><p>${escapeHtml(support.trim())}</p>`,
    };
  }

  return {
    subject: `${org} was ${lifecycleLabel}`,
    previewText: `Organization lifecycle changed on ${brand}.`,
    text: `Hello${name},\n\n${org} was ${lifecycleLabel} on ${brand}.\n\nReason: ${params.reason ?? "Not provided"}${support}`,
    html: `<p>Hello${escapeHtml(name)},</p><p><strong>${escapeHtml(org)}</strong> was ${escapeHtml(lifecycleLabel)} on ${escapeHtml(brand)}.</p><p><strong>Reason:</strong> ${escapeHtml(params.reason ?? "Not provided")}</p><p>${escapeHtml(support.trim())}</p>`,
  };
}

