import { useMutation } from "@tanstack/react-query";
import {
	createFileRoute,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ProtectedLayout } from "#/components/protected-layout";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import {
	type AdminUser,
	type AdminUserSession,
	type AdminUsersSearch,
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
	const { users, total, currentUserId } = Route.useLoaderData();

	const [search, setSearch] = useState(searchParams.q);
	const [roleFilter, setRoleFilter] = useState<AdminUsersSearch["role"]>(
		searchParams.role,
	);

	const [banningId, setBanningId] = useState<string | null>(null);
	const [banReason, setBanReason] = useState("");
	const [banExpiresIn, setBanExpiresIn] = useState("");
	const [showBanDialog, setShowBanDialog] = useState<string | null>(null);

	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);

	const [creating, setCreating] = useState(false);
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [createName, setCreateName] = useState("");
	const [createEmail, setCreateEmail] = useState("");
	const [createPassword, setCreatePassword] = useState("");
	const [createRole, setCreateRole] = useState<"user" | "admin">("user");

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
				},
				replace: true,
			});
		}, 300);

		return () => window.clearTimeout(timeout);
	}, [navigate, roleFilter, search, searchParams.q, searchParams.role]);

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
			setBanReason("");
			setBanExpiresIn("");
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
			setCreateName("");
			setCreateEmail("");
			setCreatePassword("");
			setCreateRole("user");
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

	const handleSetRole = (userId: string, role: "user" | "admin") => {
		if (userId === currentUserId) {
			toast.error("You cannot change your own role");
			return;
		}
		setRoleMutation.mutate({ userId, role });
	};

	const handleBan = async (userId: string) => {
		if (userId === currentUserId) {
			toast.error("You cannot ban yourself");
			return;
		}
		setBanningId(userId);
		await banMutation
			.mutateAsync({
				userId,
				banReason: banReason || undefined,
				banExpiresIn: banExpiresIn ? Number(banExpiresIn) : undefined,
			})
			.catch(() => undefined);
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

	const handleCreateUser = async () => {
		if (!createName || !createEmail || !createPassword) {
			toast.error("Name, email, and password are required");
			return;
		}
		setCreating(true);
		await createUserMutation
			.mutateAsync({
				name: createName,
				email: createEmail,
				password: createPassword,
				role: createRole,
			})
			.catch(() => undefined);
		setCreating(false);
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
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">
							User Management
						</h1>
						<p className="text-sm text-muted-foreground">
							{total} user{total !== 1 ? "s" : ""} total
						</p>
					</div>
					<Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
						<DialogTrigger asChild>
							<Button>
								<UserPlus className="size-4" />
								Create User
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Create User</DialogTitle>
								<DialogDescription>
									Add a new user to the platform.
								</DialogDescription>
							</DialogHeader>
							<FieldGroup>
								<Field>
									<FieldLabel htmlFor="create-name">Name</FieldLabel>
									<Input
										id="create-name"
										value={createName}
										onChange={(event) => setCreateName(event.target.value)}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="create-email">Email</FieldLabel>
									<Input
										id="create-email"
										type="email"
										value={createEmail}
										onChange={(event) => setCreateEmail(event.target.value)}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="create-password">Password</FieldLabel>
									<Input
										id="create-password"
										type="password"
										value={createPassword}
										onChange={(event) => setCreatePassword(event.target.value)}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="create-role">Role</FieldLabel>
									<Select
										value={createRole}
										onValueChange={(value) =>
											setCreateRole(value as "user" | "admin")
										}
									>
										<SelectTrigger id="create-role">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="user">User</SelectItem>
											<SelectItem value="admin">Admin</SelectItem>
										</SelectContent>
									</Select>
								</Field>
							</FieldGroup>
							<DialogFooter>
								<Button
									variant="outline"
									onClick={() => setShowCreateDialog(false)}
								>
									Cancel
								</Button>
								<Button onClick={handleCreateUser} disabled={creating}>
									{creating ? "Creating..." : "Create"}
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</div>

				<AdminUsersDataTable
					users={users}
					total={total}
					currentUserId={currentUserId}
					search={search}
					roleFilter={roleFilter}
					setRolePending={setRoleMutation.isPending}
					unbanPending={unbanMutation.isPending}
					impersonatePending={impersonateMutation.isPending}
					onSearchChange={setSearch}
					onRoleFilterChange={setRoleFilter}
					onSetRole={handleSetRole}
					onOpenBan={setShowBanDialog}
					onUnban={handleUnban}
					onListSessions={handleListSessions}
					onImpersonate={handleImpersonate}
					onOpenDelete={setShowDeleteDialog}
				/>

				<Dialog
					open={!!sessionsUser}
					onOpenChange={(open) => {
						if (!open) setSessionsUser(null);
					}}
				>
					<DialogContent className="max-w-lg">
						<DialogHeader>
							<DialogTitle>
								Sessions — {sessionsUser?.name ?? "User"}
							</DialogTitle>
							<DialogDescription>
								{sessionsLoading
									? "Loading sessions..."
									: sessions.length === 1
										? "1 active session"
										: `${sessions.length} active sessions`}
							</DialogDescription>
						</DialogHeader>
						{sessionsLoading ? (
							<p className="py-8 text-center text-sm text-muted-foreground">
								Loading sessions...
							</p>
						) : sessions.length === 0 ? (
							<p className="py-8 text-center text-sm text-muted-foreground">
								No active sessions.
							</p>
						) : (
							<div className="space-y-3">
								{sessions.map((session) => (
									<div
										key={session.id}
										className="flex items-center justify-between rounded-lg border p-3"
									>
										<div className="space-y-1">
											<p className="text-sm font-medium">
												{session.userAgent ?? "Unknown device"}
											</p>
											<p className="text-xs text-muted-foreground">
												Created{" "}
												{new Date(session.createdAt).toLocaleDateString()}
												{session.ipAddress ? ` · ${session.ipAddress}` : ""}
											</p>
											{session.impersonatedBy && (
												<span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
													Impersonated
												</span>
											)}
										</div>
										<Button
											variant="outline"
											size="sm"
											disabled={
												revokingSessionToken === session.token ||
												session.userId === currentUserId
											}
											onClick={() => handleRevokeSession(session)}
										>
											{revokingSessionToken === session.token
												? "Revoking..."
												: session.userId === currentUserId
													? "Current"
													: "Revoke"}
										</Button>
									</div>
								))}
							</div>
						)}
						<DialogFooter>
							{sessions.length > 1 && sessionsUser?.id !== currentUserId && (
								<Button
									variant="destructive"
									disabled={revokingAll || sessionsLoading}
									onClick={() =>
										sessionsUser && handleRevokeAllSessions(sessionsUser.id)
									}
								>
									{revokingAll ? "Revoking all..." : "Revoke all sessions"}
								</Button>
							)}
							<Button variant="outline" onClick={() => setSessionsUser(null)}>
								Close
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				<BanUserDialog
					user={users.find((user) => user.id === showBanDialog) ?? null}
					banReason={banReason}
					banExpiresIn={banExpiresIn}
					banningId={banningId}
					onBan={handleBan}
					onCancel={() => {
						setShowBanDialog(null);
						setBanReason("");
						setBanExpiresIn("");
					}}
					onReasonChange={setBanReason}
					onExpiresChange={setBanExpiresIn}
				/>

				<DeleteUserDialog
					user={users.find((user) => user.id === showDeleteDialog) ?? null}
					deletingId={deletingId}
					onDelete={handleDelete}
					onCancel={() => setShowDeleteDialog(null)}
				/>
			</div>
		</ProtectedLayout>
	);
}

function BanUserDialog({
	user,
	banReason,
	banExpiresIn,
	banningId,
	onBan,
	onCancel,
	onReasonChange,
	onExpiresChange,
}: {
	user: AdminUser | null;
	banReason: string;
	banExpiresIn: string;
	banningId: string | null;
	onBan: (userId: string) => void;
	onCancel: () => void;
	onReasonChange: (value: string) => void;
	onExpiresChange: (value: string) => void;
}) {
	if (!user) return null;

	return (
		<Dialog open onOpenChange={onCancel}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Ban User</DialogTitle>
					<DialogDescription>
						{user.name} will be banned from the platform.
					</DialogDescription>
				</DialogHeader>
				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="ban-reason">Reason (optional)</FieldLabel>
						<Input
							id="ban-reason"
							value={banReason}
							onChange={(event) => onReasonChange(event.target.value)}
							placeholder="Spamming"
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="ban-expires">
							Expires in seconds (optional)
						</FieldLabel>
						<Input
							id="ban-expires"
							type="number"
							value={banExpiresIn}
							onChange={(event) => onExpiresChange(event.target.value)}
							placeholder="604800 (7 days)"
						/>
					</Field>
				</FieldGroup>
				<DialogFooter>
					<Button variant="outline" onClick={onCancel}>
						Cancel
					</Button>
					<Button
						variant="destructive"
						disabled={banningId === user.id}
						onClick={() => onBan(user.id)}
					>
						{banningId === user.id ? "Banning..." : "Ban"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function DeleteUserDialog({
	user,
	deletingId,
	onDelete,
	onCancel,
}: {
	user: AdminUser | null;
	deletingId: string | null;
	onDelete: (userId: string) => void;
	onCancel: () => void;
}) {
	if (!user) return null;

	return (
		<Dialog open onOpenChange={onCancel}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete User</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete {user.name}? This action cannot be
						undone.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={onCancel}>
						Cancel
					</Button>
					<Button
						variant="destructive"
						disabled={deletingId === user.id}
						onClick={() => onDelete(user.id)}
					>
						{deletingId === user.id ? "Deleting..." : "Delete"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
