import { createFileRoute } from "@tanstack/react-router";
import {
	type ColumnDef,
	type SortingState,
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronLeft, ChevronRight, Search, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ProtectedLayout } from "#/components/protected-layout";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/_protected/admin/")({
	component: RouteComponent,
});

type User = {
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

function RouteComponent() {
	const { data: currentSession } = authClient.useSession();
	const currentUserId = currentSession?.user?.id;

	const [users, setUsers] = useState<User[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [searchField, setSearchField] = useState<"name" | "email">("name");
	const [roleFilter, setRoleFilter] = useState<string>("all");

	const [sorting, setSorting] = useState<SortingState>([]);
	const [pageSize, setPageSize] = useState(10);

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

	const [sessionsUser, setSessionsUser] = useState<User | null>(null);
	const [sessions, setSessions] = useState<{
		id: string;
		token: string;
		userId: string;
		expiresAt: Date;
		createdAt: Date;
		ipAddress?: string | null;
		userAgent?: string | null;
		impersonatedBy?: string | null;
	}[]>([]);
	const [sessionsLoading, setSessionsLoading] = useState(false);
	const [revokingSessionToken, setRevokingSessionToken] = useState<string | null>(null);
	const [revokingAll, setRevokingAll] = useState(false);

	const fetchUsers = async () => {
		setLoading(true);
		const { data, error } = await authClient.admin.listUsers({
			query: {
				searchValue: search || undefined,
				searchField: search ? searchField : undefined,
				searchOperator: "contains",
				filterField: roleFilter !== "all" ? "role" : undefined,
				filterValue: roleFilter !== "all" ? roleFilter : undefined,
				filterOperator: roleFilter !== "all" ? "eq" : undefined,
				limit: 100,
			},
		});
		if (error) {
			toast.error(error.message ?? "Failed to fetch users");
		} else if (data) {
			setUsers((data.users ?? []) as User[]);
			setTotal(data.total ?? 0);
		}
		setLoading(false);
	};

	useEffect(() => {
		fetchUsers();
	}, []);

	const handleSetRole = async (userId: string, role: "user" | "admin") => {
		if (userId === currentUserId) {
			toast.error("You cannot change your own role");
			return;
		}
		const { error } = await authClient.admin.setRole({ userId, role });
		if (error) {
			toast.error(error.message ?? "Failed to update role");
		} else {
			toast.success("Role updated");
			setUsers((prev) =>
				prev.map((u) => (u.id === userId ? { ...u, role } : u)),
			);
		}
	};

	const handleBan = async (userId: string) => {
		if (userId === currentUserId) {
			toast.error("You cannot ban yourself");
			return;
		}
		setBanningId(userId);
		const { error } = await authClient.admin.banUser({
			userId,
			banReason: banReason || undefined,
			banExpiresIn: banExpiresIn ? Number(banExpiresIn) : undefined,
		});
		if (error) {
			toast.error(error.message ?? "Failed to ban user");
		} else {
			toast.success("User banned");
			setUsers((prev) =>
				prev.map((u) =>
					u.id === userId
						? { ...u, banned: true, banReason: banReason || null }
						: u,
				),
			);
			setShowBanDialog(null);
			setBanReason("");
			setBanExpiresIn("");
		}
		setBanningId(null);
	};

	const handleUnban = async (userId: string) => {
		const { error } = await authClient.admin.unbanUser({ userId });
		if (error) {
			toast.error(error.message ?? "Failed to unban user");
		} else {
			toast.success("User unbanned");
			setUsers((prev) =>
				prev.map((u) => (u.id === userId ? { ...u, banned: false, banReason: null } : u)),
			);
		}
	};

	const handleDelete = async (userId: string) => {
		if (userId === currentUserId) {
			toast.error("You cannot delete yourself");
			return;
		}
		setDeletingId(userId);
		const { error } = await authClient.admin.removeUser({ userId });
		if (error) {
			toast.error(error.message ?? "Failed to delete user");
		} else {
			toast.success("User deleted");
			setUsers((prev) => prev.filter((u) => u.id !== userId));
			setShowDeleteDialog(null);
		}
		setDeletingId(null);
	};

	const handleImpersonate = async (userId: string) => {
		if (userId === currentUserId) {
			toast.error("You cannot impersonate yourself");
			return;
		}
		const { data, error } = await authClient.admin.impersonateUser({ userId });
		if (error) {
			toast.error(error.message ?? "Failed to impersonate user");
		} else if (data) {
			toast.success(`Impersonating user`);
			window.location.href = "/dashboard";
		}
	};

	const handleCreateUser = async () => {
		if (!createName || !createEmail || !createPassword) {
			toast.error("Name, email, and password are required");
			return;
		}
		setCreating(true);
		const { error } = await authClient.admin.createUser({
			name: createName,
			email: createEmail,
			password: createPassword,
			role: createRole as "user" | "admin",
		});
		if (error) {
			toast.error(error.message ?? "Failed to create user");
		} else {
			toast.success("User created");
			setShowCreateDialog(false);
			setCreateName("");
			setCreateEmail("");
			setCreatePassword("");
			setCreateRole("user");
			fetchUsers();
		}
		setCreating(false);
	};

	const handleListSessions = async (user: User) => {
		setSessionsUser(user);
		setSessionsLoading(true);
		const { data, error } = await authClient.admin.listUserSessions({
			userId: user.id,
		});
		if (error) {
			toast.error(error.message ?? "Failed to fetch sessions");
			setSessionsUser(null);
		} else {
			setSessions(data?.sessions ?? []);
		}
		setSessionsLoading(false);
	};

	const handleRevokeSession = async (token: string) => {
		const session = sessions.find((s) => s.token === token);
		if (session?.userId === currentUserId) {
			toast.error("You cannot revoke your own session");
			return;
		}
		setRevokingSessionToken(token);
		const { error } = await authClient.admin.revokeUserSession({
			sessionToken: token,
		});
		if (error) {
			toast.error(error.message ?? "Failed to revoke session");
		} else {
			toast.success("Session revoked");
			setSessions((prev) => prev.filter((s) => s.token !== token));
		}
		setRevokingSessionToken(null);
	};

	const handleRevokeAllSessions = async (userId: string) => {
		if (userId === currentUserId) {
			toast.error("You cannot revoke your own sessions");
			return;
		}
		setRevokingAll(true);
		const { error } = await authClient.admin.revokeUserSessions({ userId });
		if (error) {
			toast.error(error.message ?? "Failed to revoke sessions");
		} else {
			toast.success("All sessions revoked");
			setSessions([]);
		}
		setRevokingAll(false);
	};

	const columns: ColumnDef<User>[] = [
		{
			accessorKey: "name",
			header: ({ column }) => (
				<button
					type="button"
					className="inline-flex items-center gap-1 font-medium"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					Name
					<ArrowUpDown className="size-3.5" />
				</button>
			),
			cell: ({ row }) => {
				const user = row.original;
				return (
					<div className="flex items-center gap-2">
						{user.image ? (
							<img
								src={user.image}
								alt=""
								className="size-7 rounded-full object-cover"
							/>
						) : (
							<div className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
								{user.name.charAt(0).toUpperCase()}
							</div>
						)}
						<span className="font-medium">{user.name}</span>
					</div>
				);
			},
		},
		{
			accessorKey: "email",
			header: ({ column }) => (
				<button
					type="button"
					className="inline-flex items-center gap-1 font-medium"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					Email
					<ArrowUpDown className="size-3.5" />
				</button>
			),
			cell: ({ row }) => (
				<span className="text-muted-foreground">{row.original.email}</span>
			),
		},
		{
			accessorKey: "role",
			header: ({ column }) => (
				<button
					type="button"
					className="inline-flex items-center gap-1 font-medium"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					Role
					<ArrowUpDown className="size-3.5" />
				</button>
			),
			cell: ({ row }) => {
				const user = row.original;
				const isSelf = user.id === currentUserId;
				return (
					<Select
						value={user.role ?? "user"}
						disabled={isSelf}
						onValueChange={(role) =>
							handleSetRole(user.id, role as "user" | "admin")
						}
					>
						<SelectTrigger className="h-8 w-24">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="user">User</SelectItem>
							<SelectItem value="admin">Admin</SelectItem>
						</SelectContent>
					</Select>
				);
			},
		},
		{
			accessorKey: "banned",
			header: "Status",
			cell: ({ row }) => {
				const banned = row.original.banned;
				return banned ? (
					<Badge variant="destructive">Banned</Badge>
				) : (
					<Badge variant="default">Active</Badge>
				);
			},
		},
		{
			id: "actions",
			header: "Actions",
			cell: ({ row }) => {
				const user = row.original;
				const isSelf = user.id === currentUserId;
				return (
					<>
						<div className="flex flex-wrap gap-1.5">
							{user.banned ? (
								<Button
									variant="outline"
									size="xs"
									disabled={isSelf}
									onClick={() => handleUnban(user.id)}
								>
									Unban
								</Button>
							) : (
								<Button
									variant="outline"
									size="xs"
									disabled={isSelf}
									onClick={() => setShowBanDialog(user.id)}
								>
									Ban
								</Button>
							)}
							<Button
								variant="outline"
								size="xs"
								onClick={() => handleListSessions(user)}
							>
								Sessions
							</Button>
							<Button
								variant="outline"
								size="xs"
								onClick={() => handleImpersonate(user.id)}
							>
								Impersonate
							</Button>
							<Button
								variant="destructive"
								size="xs"
								disabled={isSelf}
								onClick={() => setShowDeleteDialog(user.id)}
							>
								Delete
							</Button>
						</div>
					</>
				);
			},
		},
	];

	const table = useReactTable({
		data: users,
		columns,
		state: {
			sorting,
		},
		onSortingChange: setSorting,
		initialState: {
			pagination: {
				pageSize,
			},
		},
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
	});

	const pageIndex = table.getState().pagination.pageIndex;
	const pageCount = table.getPageCount();

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
										onChange={(e) => setCreateName(e.target.value)}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="create-email">Email</FieldLabel>
									<Input
										id="create-email"
										type="email"
										value={createEmail}
										onChange={(e) => setCreateEmail(e.target.value)}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="create-password">Password</FieldLabel>
									<Input
										id="create-password"
										type="password"
										value={createPassword}
										onChange={(e) => setCreatePassword(e.target.value)}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="create-role">Role</FieldLabel>
									<Select
										value={createRole}
										onValueChange={(v) =>
											setCreateRole(v as "user" | "admin")
										}
									>	<SelectTrigger id="create-role">
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

				<Card>
					<CardHeader>
						<CardTitle>Users</CardTitle>
						<CardDescription>
							Manage all registered users. Search, filter, and perform admin
							actions.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex gap-2">
							<div className="relative flex-1">
								<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									placeholder={`Search by ${searchField}...`}
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className="pl-9"
								/>
							</div>
							<Select
								value={searchField}
								onValueChange={(v) => setSearchField(v as "name" | "email")}
							>
								<SelectTrigger className="w-32">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="name">Name</SelectItem>
									<SelectItem value="email">Email</SelectItem>
								</SelectContent>
							</Select>
							<Select value={roleFilter} onValueChange={setRoleFilter}>
								<SelectTrigger className="w-32">
									<SelectValue placeholder="Role" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All roles</SelectItem>
									<SelectItem value="admin">Admin</SelectItem>
									<SelectItem value="user">User</SelectItem>
								</SelectContent>
							</Select>
							<Button onClick={fetchUsers}>Search</Button>
						</div>

						{loading ? (
							<p className="py-8 text-center text-sm text-muted-foreground">
								Loading users...
							</p>
						) : users.length === 0 ? (
							<p className="py-8 text-center text-sm text-muted-foreground">
								No users found.
							</p>
						) : (
							<>
								<div className="overflow-x-auto">
									<Table>
										<TableHeader>
											{table.getHeaderGroups().map((headerGroup) => (
												<TableRow key={headerGroup.id}>
													{headerGroup.headers.map((header) => (
														<TableHead key={header.id}>
															{header.isPlaceholder
																? null
																: flexRender(
																		header.column.columnDef.header,
																		header.getContext(),
																	)}
														</TableHead>
													))}
												</TableRow>
											))}
										</TableHeader>
										<TableBody>
											{table.getRowModel().rows.map((row) => (
												<TableRow key={row.id}>
													{row.getVisibleCells().map((cell) => (
														<TableCell key={cell.id}>
															{flexRender(
																cell.column.columnDef.cell,
																cell.getContext(),
															)}
														</TableCell>
													))}
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<span className="text-sm text-muted-foreground">
											Rows per page
										</span>
										<Select
											value={String(pageSize)}
											onValueChange={(v) => {
												setPageSize(Number(v));
												table.setPageSize(Number(v));
											}}
										>
											<SelectTrigger className="h-8 w-16">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="10">10</SelectItem>
												<SelectItem value="25">25</SelectItem>
												<SelectItem value="50">50</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className="flex items-center gap-2">
										<span className="text-sm text-muted-foreground">
											Page {pageIndex + 1} of {pageCount}
										</span>
										<div className="flex gap-1">
											<Button
												variant="outline"
												size="xs"
												onClick={() => table.previousPage()}
												disabled={!table.getCanPreviousPage()}
											>
												<ChevronLeft className="size-4" />
											</Button>
											<Button
												variant="outline"
												size="xs"
												onClick={() => table.nextPage()}
												disabled={!table.getCanNextPage()}
											>
												<ChevronRight className="size-4" />
											</Button>
										</div>
									</div>
								</div>
							</>
						)}
					</CardContent>
				</Card>

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
								{sessions.map((s) => (
									<div
										key={s.id}
										className="flex items-center justify-between rounded-lg border p-3"
									>
										<div className="space-y-1">
											<p className="text-sm font-medium">
												{s.userAgent ?? "Unknown device"}
											</p>
											<p className="text-xs text-muted-foreground">
												Created{" "}
												{new Date(s.createdAt).toLocaleDateString()}
												{s.ipAddress
													? ` · ${s.ipAddress}`
													: ""}
											</p>
											{s.impersonatedBy && (
												<span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
													Impersonated
												</span>
											)}
										</div>
										<Button
											variant="outline"
											size="sm"
											disabled={
												revokingSessionToken === s.token ||
												s.userId === currentUserId
											}
											onClick={() =>
												handleRevokeSession(s.token)
											}
										>
											{revokingSessionToken === s.token
												? "Revoking..."
												: s.userId === currentUserId
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
										sessionsUser &&
										handleRevokeAllSessions(sessionsUser.id)
									}
								>
									{revokingAll
										? "Revoking all..."
										: "Revoke all sessions"}
								</Button>
							)}
							<Button
								variant="outline"
								onClick={() => setSessionsUser(null)}
							>
								Close
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				{(() => {
					const user = users.find((u) => u.id === showBanDialog);
					if (!user) return null;
					return (
						<Dialog open onOpenChange={() => setShowBanDialog(null)}>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Ban User</DialogTitle>
									<DialogDescription>
										{user.name} will be banned from the
										platform.
									</DialogDescription>
								</DialogHeader>
								<FieldGroup>
									<Field>
										<FieldLabel htmlFor="ban-reason">
											Reason (optional)
										</FieldLabel>
										<Input
											id="ban-reason"
											value={banReason}
											onChange={(e) =>
												setBanReason(e.target.value)
											}
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
											onChange={(e) =>
												setBanExpiresIn(e.target.value)
											}
											placeholder="604800 (7 days)"
										/>
									</Field>
								</FieldGroup>
								<DialogFooter>
									<Button
										variant="outline"
										onClick={() => {
											setShowBanDialog(null);
											setBanReason("");
											setBanExpiresIn("");
										}}
									>
										Cancel
									</Button>
									<Button
										variant="destructive"
										disabled={banningId === user.id}
										onClick={() => handleBan(user.id)}
									>
										{banningId === user.id
											? "Banning..."
											: "Ban"}
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>
					);
				})()}

				{(() => {
					const user = users.find(
						(u) => u.id === showDeleteDialog,
					);
					if (!user) return null;
					return (
						<Dialog
							open
							onOpenChange={() => setShowDeleteDialog(null)}
						>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Delete User</DialogTitle>
									<DialogDescription>
										Are you sure you want to delete{" "}
										{user.name}? This action cannot be
										undone.
									</DialogDescription>
								</DialogHeader>
								<DialogFooter>
									<Button
										variant="outline"
										onClick={() =>
											setShowDeleteDialog(null)
										}
									>
										Cancel
									</Button>
									<Button
										variant="destructive"
										disabled={deletingId === user.id}
										onClick={() => handleDelete(user.id)}
									>
										{deletingId === user.id
											? "Deleting..."
											: "Delete"}
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>
					);
				})()}
			</div>
		</ProtectedLayout>
	);
}
