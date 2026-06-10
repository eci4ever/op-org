import { createFileRoute } from "@tanstack/react-router";
import { Search, UserPlus } from "lucide-react";
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
	const [users, setUsers] = useState<User[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [searchField, setSearchField] = useState<"name" | "email">("name");

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

	const fetchUsers = async () => {
		setLoading(true);
		const { data, error } = await authClient.admin.listUsers({
			query: {
				searchValue: search || undefined,
				searchField: search ? searchField : undefined,
				searchOperator: "contains",
				limit: 50,
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

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		fetchUsers();
	};

	const handleSetRole = async (userId: string, role: "user" | "admin") => {
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
						<form onSubmit={handleSearch} className="flex gap-2">
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
							<Button type="submit">Search</Button>
						</form>

						{loading ? (
							<p className="py-8 text-center text-sm text-muted-foreground">
								Loading users...
							</p>
						) : users.length === 0 ? (
							<p className="py-8 text-center text-sm text-muted-foreground">
								No users found.
							</p>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<thead>
										<tr className="border-b text-left text-muted-foreground">
											<th className="pb-3 font-medium">Name</th>
											<th className="pb-3 font-medium">Email</th>
											<th className="pb-3 font-medium">Role</th>
											<th className="pb-3 font-medium">Status</th>
											<th className="pb-3 font-medium">Actions</th>
										</tr>
									</thead>
									<tbody>
										{users.map((user) => (
											<tr key={user.id} className="border-b last:border-0">
												<td className="py-3 pr-4">
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
												</td>
												<td className="py-3 pr-4 text-muted-foreground">
													{user.email}
												</td>
												<td className="py-3 pr-4">
													<Select
														value={user.role ?? "user"}
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
												</td>
												<td className="py-3 pr-4">
													{user.banned ? (
														<Badge variant="destructive">Banned</Badge>
													) : (
														<Badge variant="default">Active</Badge>
													)}
												</td>
												<td className="py-3">
													<div className="flex flex-wrap gap-1.5">
														{user.banned ? (
															<Button
																variant="outline"
																size="xs"
																onClick={() => handleUnban(user.id)}
															>
																Unban
															</Button>
														) : (
															<Button
																variant="outline"
																size="xs"
																onClick={() => setShowBanDialog(user.id)}
															>
																Ban
															</Button>
														)}
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
															onClick={() => setShowDeleteDialog(user.id)}
														>
															Delete
														</Button>
													</div>

													{showBanDialog === user.id && (
														<Dialog
															open
															onOpenChange={() => setShowBanDialog(null)}
														>
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
													)}

													{showDeleteDialog === user.id && (
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
													)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</ProtectedLayout>
	);
}
