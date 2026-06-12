import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import db from "#/db";
import { auth } from "#/lib/auth";

export type ShellUser = {
	id: string;
	name: string;
	email: string;
	image: string | null;
	role: string | null;
};

export type ShellOrganization = {
	id: string;
	name: string;
	slug: string;
	logo: string | null;
};

export type ProtectedShellData = {
	user: ShellUser;
	isAdmin: boolean;
	isImpersonating: boolean;
	activeOrganization: ShellOrganization | null;
	organizations: ShellOrganization[];
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

async function ensureOrganizationAccess(
	headers: Headers,
	organizationId: string,
) {
	const session = await requireSession(headers);

	if (session.user.role === "admin") {
		const org = await db.query.organization.findFirst({
			where: (organization, { eq }) => eq(organization.id, organizationId),
		});

		if (!org) {
			throw new Error("Organization not found");
		}

		return session;
	}

	const membership = await db.query.member.findFirst({
		where: (member, { and, eq }) =>
			and(
				eq(member.organizationId, organizationId),
				eq(member.userId, session.user.id),
			),
	});

	if (!membership) {
		throw new Error("Unauthorized");
	}

	return session;
}

export const getProtectedShellData = createServerFn({ method: "GET" }).handler(
	async (): Promise<ProtectedShellData> => {
		const headers = getRequestHeaders();
		const session = await requireSession(headers);
		const activeOrganizationId = session.session.activeOrganizationId;
		const isAdmin = session.user.role === "admin";

		const memberships = await db.query.member.findMany({
			where: (member, { eq }) => eq(member.userId, session.user.id),
			with: {
				organization: true,
			},
			orderBy: (member, { asc }) => [asc(member.createdAt)],
		});

		const memberOrganizations = memberships.map((membership) => ({
			id: membership.organization.id,
			name: membership.organization.name,
			slug: membership.organization.slug,
			logo: membership.organization.logo,
		}));

		const activeFromMembership =
			memberOrganizations.find((org) => org.id === activeOrganizationId) ??
			null;

		const activeOrganization =
			activeFromMembership ??
			(isAdmin && activeOrganizationId
				? await db.query.organization
						.findFirst({
							where: (organization, { eq }) =>
								eq(organization.id, activeOrganizationId),
						})
						.then((org) =>
							org
								? {
										id: org.id,
										name: org.name,
										slug: org.slug,
										logo: org.logo,
									}
								: null,
						)
				: null);

		return {
			user: {
				id: session.user.id,
				name: session.user.name,
				email: session.user.email,
				image: session.user.image ?? null,
				role: session.user.role ?? null,
			},
			isAdmin,
			isImpersonating: !!session.session.impersonatedBy,
			activeOrganization,
			organizations: memberOrganizations,
		};
	},
);

export const setActiveShellOrganization = createServerFn({ method: "POST" })
	.validator((data: unknown) =>
		z.object({ organizationId: z.string().min(1) }).parse(data),
	)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		await ensureOrganizationAccess(headers, data.organizationId);

		await auth.api.setActiveOrganization({
			headers,
			body: {
				organizationId: data.organizationId,
			},
		});

		return { success: true };
	});

export const createShellOrganization = createServerFn({ method: "POST" })
	.validator((data: unknown) =>
		z
			.object({
				name: z.string().min(1),
				slug: z.string().min(1),
			})
			.parse(data),
	)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		await requireAdmin(headers);

		const organization = await auth.api.createOrganization({
			headers,
			body: {
				name: data.name,
				slug: data.slug,
			},
		});

		return {
			id: organization.id,
			name: organization.name,
			slug: organization.slug,
			logo: organization.logo ?? null,
		};
	});

export const stopImpersonatingShellUser = createServerFn({
	method: "POST",
}).handler(async () => {
	const headers = getRequestHeaders();
	const session = await requireSession(headers);

	if (!session.session.impersonatedBy) {
		throw new Error("You are not impersonating anyone");
	}

	await auth.api.stopImpersonating({
		headers,
	});

	return { success: true };
});
