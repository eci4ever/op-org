import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import db from "@/db";
import { auth } from "@/lib/auth";

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

export const getUserFirstOrganization = createServerFn({
	method: "GET",
}).handler(async () => {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	if (!session) return null;

	const memberRecord = await db.query.member.findFirst({
		where: (m, { eq }) => eq(m.userId, session.user.id),
		with: { organization: true },
		orderBy: (m, { asc }) => [asc(m.createdAt)],
	});

	return memberRecord?.organization ?? null;
});
