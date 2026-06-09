import { describe, expect, it } from "vitest";
import { renderEmailTemplate } from "@/server/email/email.templates";

describe("renderEmailTemplate", () => {
  it("renders auth-owned URLs without storing or inventing tokens", () => {
    const template = renderEmailTemplate("password-reset", {
      brandName: "Acme",
      recipientName: "Ada",
      actionUrl: "https://app.example/reset?token=secret",
    });

    expect(template.subject).toContain("Reset");
    expect(template.text).toContain("https://app.example/reset?token=secret");
    expect(template.html).toContain("Reset password");
  });

  it("escapes lifecycle reason HTML", () => {
    const template = renderEmailTemplate("organization-suspended", {
      brandName: "Acme",
      organizationName: "Test Org",
      reason: "<script>bad()</script>",
    });

    expect(template.html).not.toContain("<script>");
    expect(template.html).toContain("&lt;script&gt;");
  });
});
