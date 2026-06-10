import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import db from "@/db";
import { member, organization } from "@/db/schema";

export const getSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    return session;
  },
);

export const ensureSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session) {
      throw new Error("Unauthorized");
    }

    return session;
  },
);

export type OrgWithMeta = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  createdAt: Date;
  metadata: string | null;
  memberCount: number;
  ownerName: string | null;
  ownerEmail: string | null;
};

export const listAllOrganizations = createServerFn({ method: "GET" }).handler(
  async (): Promise<OrgWithMeta[]> => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session || session.user.role !== "admin") {
      throw new Error("Unauthorized");
    }

    const orgs = await db.query.organization.findMany({
      with: {
        members: {
          with: {
            user: true,
          },
        },
      },
      orderBy: (orgs, { desc }) => [desc(orgs.createdAt)],
    });

    return orgs.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo: org.logo,
      createdAt: org.createdAt,
      metadata: org.metadata,
      memberCount: org.members.length,
      ownerName: org.members.find((m) => m.role === "owner")?.user?.name ?? null,
      ownerEmail: org.members.find((m) => m.role === "owner")?.user?.email ?? null,
    }));
  },
);

export const adminCreateOrganization = createServerFn({ method: "POST" })
  .validator((d: { name: string; slug: string; ownerEmail: string }) => d)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session || session.user.role !== "admin") {
      throw new Error("Unauthorized");
    }

    const owner = await db.query.user.findFirst({
      where: (u, { eq }) => eq(u.email, data.ownerEmail),
    });

    if (!owner) {
      throw new Error("User not found");
    }

    const orgId = crypto.randomUUID();

    await db.insert(organization).values({
      id: orgId,
      name: data.name,
      slug: data.slug,
      createdAt: new Date(),
    });

    await db.insert(member).values({
      id: crypto.randomUUID(),
      organizationId: orgId,
      userId: owner.id,
      role: "owner",
      createdAt: new Date(),
    });

    return { success: true };
  });

export const adminDeleteOrganization = createServerFn({ method: "POST" })
  .validator((d: { organizationId: string }) => d)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session || session.user.role !== "admin") {
      throw new Error("Unauthorized");
    }

    await db.delete(organization).where(eq(organization.id, data.organizationId));

    return { success: true };
  });

export const addOrgOwner = createServerFn({ method: "POST" })
  .validator((d: { organizationId: string; email: string }) => d)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session || session.user.role !== "admin") {
      throw new Error("Unauthorized");
    }

    const targetUser = await db.query.user.findFirst({
      where: (user, { eq }) => eq(user.email, data.email),
    });

    if (!targetUser) {
      throw new Error("User not found");
    }

    const existingMember = await db.query.member.findFirst({
      where: (m, { and, eq }) =>
        and(eq(m.organizationId, data.organizationId), eq(m.userId, targetUser.id)),
    });

    if (existingMember) {
      throw new Error("User is already a member of this organization");
    }

    await db.insert(member).values({
      id: crypto.randomUUID(),
      organizationId: data.organizationId,
      userId: targetUser.id,
      role: "owner",
      createdAt: new Date(),
    });

    const callerMember = await db.query.member.findFirst({
      where: (m, { and, eq }) =>
        and(eq(m.organizationId, data.organizationId), eq(m.userId, session.user.id)),
    });

    if (callerMember) {
      await db.delete(member).where(eq(member.id, callerMember.id));
    }

    return { success: true };
  });
