export type AdminUsersRoleFilter = "all" | "user" | "admin";

export type AdminUsersSearch = {
	q: string;
	role: AdminUsersRoleFilter;
	page: number;
	pageSize: number;
};

export type AdminUser = {
	id: string;
	name: string;
	email: string;
	role: string | null;
	banned: boolean | null;
	banReason: string | null;
	banExpires: string | null;
	createdAt: string;
	emailVerified: boolean | null;
	image: string | null;
};

export type AdminUserSession = {
	id: string;
	token: string;
	userId: string;
	expiresAt: string;
	createdAt: string;
	ipAddress?: string | null;
	userAgent?: string | null;
	impersonatedBy?: string | null;
};

export type AdminUsersResult = {
	users: AdminUser[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
	currentUserId: string;
};
