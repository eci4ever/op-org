import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import db from "#/db";
import { member, organization } from "#/db/schema";
import { auth } from "#/lib/auth";

const assignableOrganizationRoleSchema = z.enum(["admin", "member"]);

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

export type OrganizationMember = {
	id: string;
	userId: string;
	role: string;
	user: {
		id: string;
		name: string;
		email: string;
		image?: string | null;
	};
};

export type OrganizationInvitation = {
	id: string;
	email: string;
	role: string | null;
	status: string;
	expiresAt: Date;
};

export type OrganizationManagementData = {
	organization: {
		id: string;
		name: string;
		slug: string;
	} | null;
	members: OrganizationMember[];
	invitations: OrganizationInvitation[];
	currentMemberRole: string;
	isPlatformAdmin: boolean;
};

async function requireSession(headers: Headers) {
	const session = await auth.api.getSession({ headers });

	if (!session) {
		throw new Error("Unauthorized");
	}

	return session;
}

async function requireAdmin(headers: Headers) {
	const session = await requireSession(headers);

	if (session.user.role !== "admin") {
		throw new Error("Unauthorized");
	}

	return session;
}

async function requireOrgAccess(headers: Headers, organizationId: string) {
	const session = await requireSession(headers);

	if (session.user.role === "admin") {
		return { session, member: null };
	}

	const memberRecord = await db.query.member.findFirst({
		where: (m, { and, eq }) =>
			and(eq(m.organizationId, organizationId), eq(m.userId, session.user.id)),
	});

	if (!memberRecord) {
		throw new Error("Unauthorized");
	}

	return { session, member: memberRecord };
}

export const listAllOrganizations = createServerFn({ method: "GET" }).handler(
	async (): Promise<OrgWithMeta[]> => {
		const headers = getRequestHeaders();
		await requireAdmin(headers);

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
			ownerName:
				org.members.find((m) => m.role === "owner")?.user?.name ?? null,
			ownerEmail:
				org.members.find((m) => m.role === "owner")?.user?.email ?? null,
		}));
	},
);

export const adminCreateOrganization = createServerFn({ method: "POST" })
	.validator((data: unknown) =>
		z
			.object({
				name: z.string().min(1),
				slug: z.string().min(1),
				ownerEmail: z.email(),
			})
			.parse(data),
	)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		await requireAdmin(headers);

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
	.validator((data: unknown) =>
		z.object({ organizationId: z.string().min(1) }).parse(data),
	)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		await requireAdmin(headers);

		await db
			.delete(organization)
			.where(eq(organization.id, data.organizationId));

		return { success: true };
	});

export const getActiveOrganizationManagement = createServerFn({
	method: "GET",
}).handler(async (): Promise<OrganizationManagementData> => {
	const headers = getRequestHeaders();
	const session = await requireSession(headers);
	const activeOrganizationId = session.session.activeOrganizationId;
	const isPlatformAdmin = session.user.role === "admin";

	if (!activeOrganizationId) {
		return {
			organization: null,
			members: [],
			invitations: [],
			currentMemberRole: "member",
			isPlatformAdmin,
		};
	}

	const org = await db.query.organization.findFirst({
		where: (o, { eq }) => eq(o.id, activeOrganizationId),
		with: {
			members: {
				with: {
					user: true,
				},
			},
			invitations: true,
		},
	});

	if (!org) {
		return {
			organization: null,
			members: [],
			invitations: [],
			currentMemberRole: "member",
			isPlatformAdmin,
		};
	}

	const currentMember = org.members.find((m) => m.userId === session.user.id);

	if (!isPlatformAdmin && !currentMember) {
		throw new Error("Unauthorized");
	}

	return {
		organization: {
			id: org.id,
			name: org.name,
			slug: org.slug,
		},
		members: org.members.map((orgMember) => ({
			id: orgMember.id,
			userId: orgMember.userId,
			role: orgMember.role,
			user: {
				id: orgMember.user.id,
				name: orgMember.user.name,
				email: orgMember.user.email,
				image: orgMember.user.image,
			},
		})),
		invitations: org.invitations.map((orgInvitation) => ({
			id: orgInvitation.id,
			email: orgInvitation.email,
			role: orgInvitation.role,
			status: orgInvitation.status,
			expiresAt: orgInvitation.expiresAt,
		})),
		currentMemberRole: currentMember?.role ?? "member",
		isPlatformAdmin,
	};
});

async function requireOrganizationManager(
	headers: Headers,
	organizationId: string,
) {
	const access = await requireOrgAccess(headers, organizationId);

	if (
		access.session.user.role !== "admin" &&
		access.member?.role !== "owner" &&
		access.member?.role !== "admin"
	) {
		throw new Error("Unauthorized");
	}

	return access;
}

async function requireOrganizationOwner(
	headers: Headers,
	organizationId: string,
) {
	const access = await requireOrgAccess(headers, organizationId);

	if (access.session.user.role !== "admin" && access.member?.role !== "owner") {
		throw new Error("Unauthorized");
	}

	return access;
}

export const inviteOrganizationMember = createServerFn({ method: "POST" })
	.validator((data: unknown) =>
		z
			.object({
				organizationId: z.string().min(1),
				email: z.email(),
				role: assignableOrganizationRoleSchema,
			})
			.parse(data),
	)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		await requireOrganizationManager(headers, data.organizationId);

		await auth.api.createInvitation({
			headers,
			body: data,
		});

		return { success: true };
	});

export const addOrgOwner = createServerFn({ method: "POST" })
	.validator((data: unknown) =>
		z
			.object({
				organizationId: z.string().min(1),
				email: z.email(),
			})
			.parse(data),
	)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		const session = await requireAdmin(headers);

		const targetUser = await db.query.user.findFirst({
			where: (user, { eq }) => eq(user.email, data.email),
		});

		if (!targetUser) {
			throw new Error("User not found");
		}

		const existingMember = await db.query.member.findFirst({
			where: (m, { and, eq }) =>
				and(
					eq(m.organizationId, data.organizationId),
					eq(m.userId, targetUser.id),
				),
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
				and(
					eq(m.organizationId, data.organizationId),
					eq(m.userId, session.user.id),
				),
		});

		if (callerMember) {
			await db.delete(member).where(eq(member.id, callerMember.id));
		}

		return { success: true };
	});

export const updateOrganizationMemberRole = createServerFn({ method: "POST" })
	.validator((data: unknown) =>
		z
			.object({
				organizationId: z.string().min(1),
				memberId: z.string().min(1),
				role: assignableOrganizationRoleSchema,
			})
			.parse(data),
	)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		await requireOrganizationOwner(headers, data.organizationId);

		await auth.api.updateMemberRole({
			headers,
			body: data,
		});

		return { success: true };
	});

export const removeOrganizationMember = createServerFn({ method: "POST" })
	.validator((data: unknown) =>
		z
			.object({
				organizationId: z.string().min(1),
				memberIdOrEmail: z.string().min(1),
			})
			.parse(data),
	)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		await requireOrganizationOwner(headers, data.organizationId);

		await auth.api.removeMember({
			headers,
			body: data,
		});

		return { success: true };
	});

export const transferOrganizationOwnership = createServerFn({ method: "POST" })
	.validator((data: unknown) =>
		z
			.object({
				organizationId: z.string().min(1),
				targetMemberId: z.string().min(1),
			})
			.parse(data),
	)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		await requireOrganizationOwner(headers, data.organizationId);

		const targetMember = await db.query.member.findFirst({
			where: (m, { and, eq }) =>
				and(
					eq(m.id, data.targetMemberId),
					eq(m.organizationId, data.organizationId),
				),
		});

		if (!targetMember) {
			throw new Error("Member not found");
		}

		const currentOwner = await db.query.member.findFirst({
			where: (m, { and, eq }) =>
				and(eq(m.organizationId, data.organizationId), eq(m.role, "owner")),
		});

		await db
			.update(member)
			.set({ role: "owner" })
			.where(eq(member.id, targetMember.id));

		if (currentOwner && currentOwner.id !== targetMember.id) {
			await db
				.update(member)
				.set({ role: "admin" })
				.where(eq(member.id, currentOwner.id));
		}

		return { success: true };
	});

export const cancelOrganizationInvitation = createServerFn({ method: "POST" })
	.validator((data: unknown) =>
		z
			.object({
				organizationId: z.string().min(1),
				invitationId: z.string().min(1),
			})
			.parse(data),
	)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		await requireOrganizationManager(headers, data.organizationId);

		await auth.api.cancelInvitation({
			headers,
			body: { invitationId: data.invitationId },
		});

		return { success: true };
	});

export const updateOrganizationDetails = createServerFn({ method: "POST" })
	.validator((data: unknown) =>
		z
			.object({
				organizationId: z.string().min(1),
				name: z.string().min(1),
				slug: z.string().min(1),
			})
			.parse(data),
	)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		await requireOrganizationOwner(headers, data.organizationId);

		await auth.api.updateOrganization({
			headers,
			body: {
				organizationId: data.organizationId,
				data: {
					name: data.name,
					slug: data.slug,
				},
			},
		});

		return { success: true };
	});

export const leaveOrganization = createServerFn({ method: "POST" })
	.validator((data: unknown) =>
		z.object({ organizationId: z.string().min(1) }).parse(data),
	)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		await requireOrgAccess(headers, data.organizationId);

		await auth.api.leaveOrganization({
			headers,
			body: data,
		});

		return { success: true };
	});

export const deleteOrganization = createServerFn({ method: "POST" })
	.validator((data: unknown) =>
		z.object({ organizationId: z.string().min(1) }).parse(data),
	)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		await requireOrganizationOwner(headers, data.organizationId);

		await auth.api.deleteOrganization({
			headers,
			body: data,
		});

		return { success: true };
	});
