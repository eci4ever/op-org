import db from "#/db";
import { auth } from "#/lib/auth";

export async function requireSession(headers: Headers) {
	const session = await auth.api.getSession({ headers });

	if (!session) {
		throw new Error("Unauthorized");
	}

	return session;
}

export async function requireAdmin(headers: Headers) {
	const session = await requireSession(headers);

	if (session.user.role !== "admin") {
		throw new Error("Unauthorized");
	}

	return session;
}

export async function requireOrgAccess(
	headers: Headers,
	organizationId: string,
) {
	const session = await requireSession(headers);

	if (session.user.role === "admin") {
		const organization = await db.query.organization.findFirst({
			where: (org, { eq }) => eq(org.id, organizationId),
		});

		if (!organization) {
			throw new Error("Organization not found");
		}

		return { session, member: null };
	}

	const member = await db.query.member.findFirst({
		where: (m, { and, eq }) =>
			and(eq(m.organizationId, organizationId), eq(m.userId, session.user.id)),
	});

	if (!member) {
		throw new Error("Unauthorized");
	}

	return { session, member };
}

export async function ensureOrganizationAccess(
	headers: Headers,
	organizationId: string,
) {
	const { session } = await requireOrgAccess(headers, organizationId);

	return session;
}
