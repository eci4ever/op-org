import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { z } from "zod";
import db from "#/db";
import { user as userTable } from "#/db/schema";
import type {
	AdminUser,
	AdminUserSession,
	AdminUsersResult,
} from "#/features/admin-users/admin-users.types";
import { auth } from "#/lib/auth";
import { requireAdmin } from "#/lib/server/auth-guards";

const adminRoleSchema = z.enum(["user", "admin"]);

export const adminUsersSearchSchema = z.object({
	q: z.string().catch(""),
	role: z.enum(["all", "user", "admin"]).catch("all"),
	page: z.coerce.number().int().min(1).catch(1),
	pageSize: z.coerce.number().int().min(1).max(100).catch(10),
});

const userIdSchema = z.object({
	userId: z.string().min(1),
});

type AdminUserRow = Omit<AdminUser, "banExpires" | "createdAt"> & {
	banExpires: Date | string | null;
	createdAt: Date | string;
};

type AdminUserSessionRow = Omit<AdminUserSession, "expiresAt" | "createdAt"> & {
	expiresAt: Date | string;
	createdAt: Date | string;
};

function toIsoString(value: Date | string): string {
	return value instanceof Date ? value.toISOString() : value;
}

function toNullableIsoString(value: Date | string | null): string | null {
	return value ? toIsoString(value) : null;
}

function mapAdminUser(user: AdminUserRow): AdminUser {
	return {
		id: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
		banned: user.banned,
		banReason: user.banReason,
		banExpires: toNullableIsoString(user.banExpires),
		createdAt: toIsoString(user.createdAt),
		emailVerified: user.emailVerified,
		image: user.image,
	};
}

function mapAdminUserSession(session: AdminUserSessionRow): AdminUserSession {
	return {
		id: session.id,
		token: session.token,
		userId: session.userId,
		expiresAt: toIsoString(session.expiresAt),
		createdAt: toIsoString(session.createdAt),
		ipAddress: session.ipAddress ?? null,
		userAgent: session.userAgent ?? null,
		impersonatedBy: session.impersonatedBy ?? null,
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
		const totalRows = await db
			.select({ value: count() })
			.from(userTable)
			.where(whereClause);
		const total = totalRows[0]?.value ?? 0;
		const totalPages = Math.ceil(total / data.pageSize);
		const page = totalPages === 0 ? 1 : Math.min(data.page, totalPages);
		const offset = (page - 1) * data.pageSize;
		const users = await db
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
			.limit(data.pageSize)
			.offset(offset);

		return {
			users: users.map((user) => mapAdminUser(user)),
			total,
			page,
			pageSize: data.pageSize,
			totalPages,
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

		return (result.sessions ?? []).map((session) =>
			mapAdminUserSession(session as AdminUserSessionRow),
		);
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
