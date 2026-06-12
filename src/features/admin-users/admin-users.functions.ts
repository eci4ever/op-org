import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { z } from "zod";
import db from "#/db";
import { user as userTable } from "#/db/schema";
import { auth } from "#/lib/auth";

const adminRoleSchema = z.enum(["user", "admin"]);

export const adminUsersSearchSchema = z.object({
	q: z.string().catch(""),
	role: z.enum(["all", "user", "admin"]).catch("all"),
});

const userIdSchema = z.object({
	userId: z.string().min(1),
});

export type AdminUsersSearch = z.infer<typeof adminUsersSearchSchema>;

export type AdminUser = {
	id: string;
	name: string;
	email: string;
	role: string | null;
	banned: boolean | null;
	banReason: string | null;
	banExpires: Date | null;
	createdAt: Date;
	emailVerified: boolean | null;
	image: string | null;
};

export type AdminUserSession = {
	id: string;
	token: string;
	userId: string;
	expiresAt: Date;
	createdAt: Date;
	ipAddress?: string | null;
	userAgent?: string | null;
	impersonatedBy?: string | null;
};

export type AdminUsersResult = {
	users: AdminUser[];
	total: number;
	currentUserId: string;
};

function mapAdminUser(user: AdminUser): AdminUser {
	return {
		id: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
		banned: user.banned,
		banReason: user.banReason,
		banExpires: user.banExpires,
		createdAt: user.createdAt,
		emailVerified: user.emailVerified,
		image: user.image,
	};
}

function assertNotSelf(
	targetUserId: string,
	currentUserId: string,
	message: string,
) {
	if (targetUserId === currentUserId) {
		throw new Error(message);
	}
}

async function requireAdmin(headers: Headers) {
	const session = await auth.api.getSession({ headers });

	if (!session || session.user.role !== "admin") {
		throw new Error("Unauthorized");
	}

	return session;
}

export const listAdminUsers = createServerFn({ method: "GET" })
	.validator((data: unknown) => adminUsersSearchSchema.parse(data))
	.handler(async ({ data }): Promise<AdminUsersResult> => {
		const headers = getRequestHeaders();
		const session = await requireAdmin(headers);
		const filters: SQL[] = [];
		const query = data.q.trim();

		if (query) {
			const searchFilter = or(
				ilike(userTable.name, `%${query}%`),
				ilike(userTable.email, `%${query}%`),
			);

			if (searchFilter) {
				filters.push(searchFilter);
			}
		}

		if (data.role !== "all") {
			filters.push(eq(userTable.role, data.role));
		}

		const whereClause = filters.length > 0 ? and(...filters) : undefined;
		const [users, totalRows] = await Promise.all([
			db
				.select({
					id: userTable.id,
					name: userTable.name,
					email: userTable.email,
					role: userTable.role,
					banned: userTable.banned,
					banReason: userTable.banReason,
					banExpires: userTable.banExpires,
					createdAt: userTable.createdAt,
					emailVerified: userTable.emailVerified,
					image: userTable.image,
				})
				.from(userTable)
				.where(whereClause)
				.orderBy(desc(userTable.createdAt))
				.limit(100),
			db.select({ value: count() }).from(userTable).where(whereClause),
		]);

		return {
			users: users.map((user) => mapAdminUser(user)),
			total: totalRows[0]?.value ?? 0,
			currentUserId: session.user.id,
		};
	});

export const setAdminUserRole = createServerFn({ method: "POST" })
	.validator((data: unknown) =>
		z.object({ userId: z.string().min(1), role: adminRoleSchema }).parse(data),
	)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		const session = await requireAdmin(headers);
		assertNotSelf(
			data.userId,
			session.user.id,
			"You cannot change your own role",
		);

		await auth.api.setRole({
			headers,
			body: data,
		});

		return { success: true };
	});

export const banAdminUser = createServerFn({ method: "POST" })
	.validator((data: unknown) =>
		z
			.object({
				userId: z.string().min(1),
				banReason: z.string().optional(),
				banExpiresIn: z.number().optional(),
			})
			.parse(data),
	)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		const session = await requireAdmin(headers);
		assertNotSelf(data.userId, session.user.id, "You cannot ban yourself");

		await auth.api.banUser({
			headers,
			body: data,
		});

		return { success: true };
	});

export const unbanAdminUser = createServerFn({ method: "POST" })
	.validator((data: unknown) => userIdSchema.parse(data))
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		await requireAdmin(headers);

		await auth.api.unbanUser({
			headers,
			body: data,
		});

		return { success: true };
	});

export const deleteAdminUser = createServerFn({ method: "POST" })
	.validator((data: unknown) => userIdSchema.parse(data))
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		const session = await requireAdmin(headers);
		assertNotSelf(data.userId, session.user.id, "You cannot delete yourself");

		await auth.api.removeUser({
			headers,
			body: data,
		});

		return { success: true };
	});

export const impersonateAdminUser = createServerFn({ method: "POST" })
	.validator((data: unknown) => userIdSchema.parse(data))
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		const session = await requireAdmin(headers);
		assertNotSelf(
			data.userId,
			session.user.id,
			"You cannot impersonate yourself",
		);

		await auth.api.impersonateUser({
			headers,
			body: data,
		});

		return { success: true };
	});

export const createAdminUser = createServerFn({ method: "POST" })
	.validator((data: unknown) =>
		z
			.object({
				name: z.string().min(1),
				email: z.email(),
				password: z.string().min(1),
				role: adminRoleSchema,
			})
			.parse(data),
	)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		await requireAdmin(headers);

		await auth.api.createUser({
			headers,
			body: data,
		});

		return { success: true };
	});

export const listAdminUserSessions = createServerFn({ method: "GET" })
	.validator((data: unknown) => userIdSchema.parse(data))
	.handler(async ({ data }): Promise<AdminUserSession[]> => {
		const headers = getRequestHeaders();
		await requireAdmin(headers);

		const result = await auth.api.listUserSessions({
			headers,
			body: data,
		});

		return (result.sessions ?? []) as AdminUserSession[];
	});

export const revokeAdminUserSession = createServerFn({ method: "POST" })
	.validator((data: unknown) =>
		z
			.object({
				sessionToken: z.string().min(1),
				sessionUserId: z.string().min(1),
			})
			.parse(data),
	)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		const session = await requireAdmin(headers);
		assertNotSelf(
			data.sessionUserId,
			session.user.id,
			"You cannot revoke your own session",
		);

		await auth.api.revokeUserSession({
			headers,
			body: { sessionToken: data.sessionToken },
		});

		return { success: true };
	});

export const revokeAllAdminUserSessions = createServerFn({ method: "POST" })
	.validator((data: unknown) => userIdSchema.parse(data))
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		const session = await requireAdmin(headers);
		assertNotSelf(
			data.userId,
			session.user.id,
			"You cannot revoke your own sessions",
		);

		await auth.api.revokeUserSessions({
			headers,
			body: data,
		});

		return { success: true };
	});
