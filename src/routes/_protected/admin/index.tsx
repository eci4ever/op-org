import { useMutation } from "@tanstack/react-query";
import {
	createFileRoute,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ProtectedLayout } from "#/components/protected-layout";
import {
	AdminUserSessionsDialog,
	BanAdminUserDialog,
	CreateAdminUserDialog,
	DeleteAdminUserDialog,
} from "#/features/admin-users/admin-users.dialogs";
import {
	adminUsersSearchSchema,
	banAdminUser,
	createAdminUser,
	deleteAdminUser,
	impersonateAdminUser,
	listAdminUserSessions,
	listAdminUsers,
	revokeAdminUserSession,
	revokeAllAdminUserSessions,
	setAdminUserRole,
	unbanAdminUser,
} from "#/features/admin-users/admin-users.functions";
import type {
	AdminUser,
	AdminUserSession,
	AdminUsersSearch,
} from "#/features/admin-users/admin-users.types";
import { AdminUsersDataTable } from "#/features/admin-users/admin-users-data-table";

export const Route = createFileRoute("/_protected/admin/")({
	validateSearch: adminUsersSearchSchema,
	loaderDeps: ({ search }) => search,
	loader: async ({ deps }) => listAdminUsers({ data: deps }),
	component: RouteComponent,
});

function getErrorMessage(error: unknown, fallback: string) {
	return error instanceof Error ? error.message : fallback;
}

function RouteComponent() {
	const router = useRouter();
	const navigate = useNavigate();
	const searchParams = Route.useSearch();
	const { users, total, page, pageSize, totalPages, currentUserId } =
		Route.useLoaderData();

	const [search, setSearch] = useState(searchParams.q);
	const [roleFilter, setRoleFilter] = useState<AdminUsersSearch["role"]>(
		searchParams.role,
	);

	const [banningId, setBanningId] = useState<string | null>(null);
	const [showBanDialog, setShowBanDialog] = useState<string | null>(null);

	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);

	const [showCreateDialog, setShowCreateDialog] = useState(false);

	const [sessionsUser, setSessionsUser] = useState<AdminUser | null>(null);
	const [sessions, setSessions] = useState<AdminUserSession[]>([]);
	const [revokingSessionToken, setRevokingSessionToken] = useState<
		string | null
	>(null);
	const [revokingAll, setRevokingAll] = useState(false);

	const invalidateAdminUsers = async () => {
		await router.invalidate();
	};

	useEffect(() => {
		setSearch(searchParams.q);
		setRoleFilter(searchParams.role);
	}, [searchParams.q, searchParams.role]);

	useEffect(() => {
		if (search === searchParams.q && roleFilter === searchParams.role) {
			return;
		}

		const timeout = window.setTimeout(() => {
			navigate({
				to: "/admin",
				search: {
					q: search.trim(),
					role: roleFilter,
					page: 1,
					pageSize: searchParams.pageSize,
				},
				replace: true,
			});
		}, 300);

		return () => window.clearTimeout(timeout);
	}, [
		navigate,
		roleFilter,
		search,
		searchParams.pageSize,
		searchParams.q,
		searchParams.role,
	]);

	const setRoleMutation = useMutation({
		mutationFn: (data: { userId: string; role: "user" | "admin" }) =>
			setAdminUserRole({ data }),
		onSuccess: async () => {
			toast.success("Role updated");
			await invalidateAdminUsers();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error, "Failed to update role"));
		},
	});

	const banMutation = useMutation({
		mutationFn: (data: {
			userId: string;
			banReason?: string;
			banExpiresIn?: number;
		}) => banAdminUser({ data }),
		onSuccess: async () => {
			toast.success("User banned");
			setShowBanDialog(null);
			await invalidateAdminUsers();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error, "Failed to ban user"));
		},
	});

	const unbanMutation = useMutation({
		mutationFn: (data: { userId: string }) => unbanAdminUser({ data }),
		onSuccess: async () => {
			toast.success("User unbanned");
			await invalidateAdminUsers();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error, "Failed to unban user"));
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (data: { userId: string }) => deleteAdminUser({ data }),
		onSuccess: async () => {
			toast.success("User deleted");
			setShowDeleteDialog(null);
			await invalidateAdminUsers();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error, "Failed to delete user"));
		},
	});

	const impersonateMutation = useMutation({
		mutationFn: (data: { userId: string }) => impersonateAdminUser({ data }),
		onSuccess: () => {
			toast.success("Impersonating user");
			window.location.href = "/dashboard";
		},
		onError: (error) => {
			toast.error(getErrorMessage(error, "Failed to impersonate user"));
		},
	});

	const createUserMutation = useMutation({
		mutationFn: (data: {
			name: string;
			email: string;
			password: string;
			role: "user" | "admin";
		}) => createAdminUser({ data }),
		onSuccess: async () => {
			toast.success("User created");
			setShowCreateDialog(false);
			await invalidateAdminUsers();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error, "Failed to create user"));
		},
	});

	const listSessionsMutation = useMutation({
		mutationFn: (data: { userId: string }) => listAdminUserSessions({ data }),
		onSuccess: (data) => {
			setSessions(data);
		},
		onError: (error) => {
			toast.error(getErrorMessage(error, "Failed to fetch sessions"));
			setSessionsUser(null);
		},
	});

	const revokeSessionMutation = useMutation({
		mutationFn: (data: { sessionToken: string; sessionUserId: string }) =>
			revokeAdminUserSession({ data }),
		onSuccess: (_, data) => {
			toast.success("Session revoked");
			setSessions((prev) => prev.filter((s) => s.token !== data.sessionToken));
		},
		onError: (error) => {
			toast.error(getErrorMessage(error, "Failed to revoke session"));
		},
	});

	const revokeAllSessionsMutation = useMutation({
		mutationFn: (data: { userId: string }) =>
			revokeAllAdminUserSessions({ data }),
		onSuccess: () => {
			toast.success("All sessions revoked");
			setSessions([]);
		},
		onError: (error) => {
			toast.error(getErrorMessage(error, "Failed to revoke sessions"));
		},
	});

	const handlePageChange = (nextPage: number) => {
		navigate({
			to: "/admin",
			search: {
				q: searchParams.q,
				role: searchParams.role,
				page: nextPage,
				pageSize: searchParams.pageSize,
			},
			replace: true,
		});
	};

	const handlePageSizeChange = (nextPageSize: number) => {
		navigate({
			to: "/admin",
			search: {
				q: searchParams.q,
				role: searchParams.role,
				page: 1,
				pageSize: nextPageSize,
			},
			replace: true,
		});
	};

	const handleSetRole = (userId: string, role: "user" | "admin") => {
		if (userId === currentUserId) {
			toast.error("You cannot change your own role");
			return;
		}
		setRoleMutation.mutate({ userId, role });
	};

	const handleBan = async (data: {
		userId: string;
		banReason?: string;
		banExpiresIn?: number;
	}) => {
		const { userId } = data;
		if (userId === currentUserId) {
			toast.error("You cannot ban yourself");
			return;
		}
		setBanningId(userId);
		await banMutation.mutateAsync(data).catch(() => undefined);
		setBanningId(null);
	};

	const handleUnban = (userId: string) => {
		unbanMutation.mutate({ userId });
	};

	const handleDelete = async (userId: string) => {
		if (userId === currentUserId) {
			toast.error("You cannot delete yourself");
			return;
		}
		setDeletingId(userId);
		await deleteMutation.mutateAsync({ userId }).catch(() => undefined);
		setDeletingId(null);
	};

	const handleImpersonate = (userId: string) => {
		if (userId === currentUserId) {
			toast.error("You cannot impersonate yourself");
			return;
		}
		impersonateMutation.mutate({ userId });
	};

	const handleCreateUser = async (data: {
		name: string;
		email: string;
		password: string;
		role: "user" | "admin";
	}) => {
		if (!data.name || !data.email || !data.password) {
			toast.error("Name, email, and password are required");
			return;
		}
		await createUserMutation.mutateAsync(data).catch(() => undefined);
	};

	const handleListSessions = (user: AdminUser) => {
		setSessionsUser(user);
		setSessions([]);
		listSessionsMutation.mutate({ userId: user.id });
	};

	const handleRevokeSession = async (session: AdminUserSession) => {
		if (session.userId === currentUserId) {
			toast.error("You cannot revoke your own session");
			return;
		}
		setRevokingSessionToken(session.token);
		await revokeSessionMutation
			.mutateAsync({
				sessionToken: session.token,
				sessionUserId: session.userId,
			})
			.catch(() => undefined);
		setRevokingSessionToken(null);
	};

	const handleRevokeAllSessions = async (userId: string) => {
		if (userId === currentUserId) {
			toast.error("You cannot revoke your own sessions");
			return;
		}
		setRevokingAll(true);
		await revokeAllSessionsMutation
			.mutateAsync({ userId })
			.catch(() => undefined);
		setRevokingAll(false);
	};

	const sessionsLoading = listSessionsMutation.isPending;

	return (
		<ProtectedLayout
			breadcrumbs={[
				{ label: "Dashboard", href: "/dashboard" },
				{ label: "Admin" },
			]}
		>
			<div className="flex flex-col gap-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">
							User Management
						</h1>
						<p className="text-sm text-muted-foreground">
							{total} user{total !== 1 ? "s" : ""} total
						</p>
					</div>
					<CreateAdminUserDialog
						open={showCreateDialog}
						creating={createUserMutation.isPending}
						onOpenChange={setShowCreateDialog}
						onCreate={handleCreateUser}
					/>
				</div>

				<AdminUsersDataTable
					users={users}
					total={total}
					currentUserId={currentUserId}
					search={search}
					roleFilter={roleFilter}
					page={page}
					pageSize={pageSize}
					totalPages={totalPages}
					setRolePending={setRoleMutation.isPending}
					unbanPending={unbanMutation.isPending}
					impersonatePending={impersonateMutation.isPending}
					onSearchChange={setSearch}
					onRoleFilterChange={setRoleFilter}
					onPageChange={handlePageChange}
					onPageSizeChange={handlePageSizeChange}
					onSetRole={handleSetRole}
					onOpenBan={setShowBanDialog}
					onUnban={handleUnban}
					onListSessions={handleListSessions}
					onImpersonate={handleImpersonate}
					onOpenDelete={setShowDeleteDialog}
				/>

				<AdminUserSessionsDialog
					user={sessionsUser}
					sessions={sessions}
					loading={sessionsLoading}
					revokingSessionToken={revokingSessionToken}
					revokingAll={revokingAll}
					currentUserId={currentUserId}
					onOpenChange={(open) => {
						if (!open) setSessionsUser(null);
					}}
					onRevokeSession={handleRevokeSession}
					onRevokeAllSessions={handleRevokeAllSessions}
				/>

				<BanAdminUserDialog
					key={showBanDialog ?? "ban-dialog"}
					user={users.find((user) => user.id === showBanDialog) ?? null}
					banning={banningId === showBanDialog}
					onBan={handleBan}
					onCancel={() => setShowBanDialog(null)}
				/>

				<DeleteAdminUserDialog
					user={users.find((user) => user.id === showDeleteDialog) ?? null}
					deleting={deletingId === showDeleteDialog}
					onDelete={handleDelete}
					onCancel={() => setShowDeleteDialog(null)}
				/>
			</div>
		</ProtectedLayout>
	);
}
