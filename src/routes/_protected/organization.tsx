import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Building2, LogOut, Trash2, UserMinus, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ProtectedLayout } from "#/components/protected-layout";
import { Avatar, AvatarFallback } from "#/components/ui/avatar";
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
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import {
	addOrgOwner,
	cancelOrganizationInvitation,
	deleteOrganization,
	getActiveOrganizationManagement,
	inviteOrganizationMember,
	leaveOrganization,
	type OrganizationInvitation,
	type OrganizationMember,
	removeOrganizationMember,
	transferOrganizationOwnership,
	updateOrganizationDetails,
	updateOrganizationMemberRole,
} from "#/features/organizations/organization.functions";

export const Route = createFileRoute("/_protected/organization")({
	loader: async () => getActiveOrganizationManagement(),
	component: RouteComponent,
});

function getErrorMessage(error: unknown, fallback: string) {
	return error instanceof Error ? error.message : fallback;
}

function roleBadgeVariant(role: string) {
	switch (role) {
		case "owner":
			return "default" as const;
		case "admin":
			return "secondary" as const;
		default:
			return "outline" as const;
	}
}

function initials(name: string) {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

// ─── Overview tab ─────────────────────────────────────────

function OverviewTab({
	org,
	orgId,
	members,
	isPlatformAdmin,
}: {
	org: { name: string; slug: string };
	orgId: string;
	members: OrganizationMember[];
	isPlatformAdmin: boolean;
}) {
	const router = useRouter();
	const [inviteEmail, setInviteEmail] = useState("");
	const [inviteRole, setInviteRole] = useState("member");
	const [inviting, setInviting] = useState(false);

	const inviteMutation = useMutation({
		mutationFn: (data: {
			organizationId: string;
			email: string;
			role: "admin" | "member";
		}) => inviteOrganizationMember({ data }),
		onSuccess: async () => {
			toast.success("Invitation sent");
			setInviteEmail("");
			await router.invalidate();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error, "Failed to send invitation"));
		},
	});

	const addOwnerMutation = useMutation({
		mutationFn: (data: { organizationId: string; email: string }) =>
			addOrgOwner({ data }),
		onSuccess: async () => {
			toast.success("Owner added");
			setInviteEmail("");
			await router.invalidate();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error, "Failed to add owner"));
		},
	});

	const handleInvite = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!inviteEmail.trim()) return;
		setInviting(true);

		if (inviteRole === "owner") {
			await addOwnerMutation
				.mutateAsync({ organizationId: orgId, email: inviteEmail.trim() })
				.catch(() => undefined);
		} else {
			await inviteMutation
				.mutateAsync({
					organizationId: orgId,
					email: inviteEmail.trim(),
					role: inviteRole as "admin" | "member",
				})
				.catch(() => undefined);
		}
		setInviting(false);
	};

	return (
		<div className="grid gap-6">
			<Card>
				<CardHeader>
					<div className="flex items-center gap-3">
						<Building2 className="size-5 text-muted-foreground" />
						<div>
							<CardTitle>{org.name}</CardTitle>
							<CardDescription>
								{org.slug} &middot; {members?.length ?? 0} member
								{members?.length !== 1 ? "s" : ""}
							</CardDescription>
						</div>
					</div>
				</CardHeader>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Invite member</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleInvite} className="flex items-end gap-3">
						<div className="flex-1 grid gap-1.5">
							<Label htmlFor="invite-email">Email address</Label>
							<Input
								id="invite-email"
								type="email"
								placeholder="colleague@example.com"
								value={inviteEmail}
								onChange={(e) => setInviteEmail(e.target.value)}
							/>
						</div>
						<div className="grid gap-1.5">
							<Label htmlFor="invite-role">Role</Label>
							<Select
								value={inviteRole}
								onValueChange={(v) => setInviteRole(v)}
							>
								<SelectTrigger id="invite-role" className="w-32">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="member">Member</SelectItem>
									<SelectItem value="admin">Admin</SelectItem>
									{isPlatformAdmin && (
										<SelectItem value="owner">Owner</SelectItem>
									)}
								</SelectContent>
							</Select>
						</div>
						<Button type="submit" disabled={inviting || !inviteEmail.trim()}>
							<UserPlus className="size-4" />
							{inviting ? "Sending..." : "Invite"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}

// ─── Members tab ──────────────────────────────────────────

function MembersTab({
	orgId,
	members,
	memberRole,
	isPlatformAdmin,
}: {
	orgId: string;
	members: OrganizationMember[];
	memberRole: string;
	isPlatformAdmin: boolean;
}) {
	const router = useRouter();
	const [changingRole, setChangingRole] = useState<string | null>(null);
	const [removing, setRemoving] = useState<string | null>(null);
	const [transferOpen, setTransferOpen] = useState(false);
	const [transferTarget, setTransferTarget] = useState<string | null>(null);
	const [transferring, setTransferring] = useState(false);

	const updateRoleMutation = useMutation({
		mutationFn: (data: {
			organizationId: string;
			memberId: string;
			role: "admin" | "member";
		}) => updateOrganizationMemberRole({ data }),
		onSuccess: async () => {
			toast.success("Role updated");
			await router.invalidate();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error, "Failed to update role"));
		},
	});

	const removeMemberMutation = useMutation({
		mutationFn: (data: { organizationId: string; memberIdOrEmail: string }) =>
			removeOrganizationMember({ data }),
		onSuccess: async () => {
			toast.success("Member removed");
			await router.invalidate();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error, "Failed to remove member"));
		},
	});

	const transferOwnershipMutation = useMutation({
		mutationFn: (data: { organizationId: string; targetMemberId: string }) =>
			transferOrganizationOwnership({ data }),
		onSuccess: async () => {
			toast.success("Ownership transferred");
			setTransferOpen(false);
			setTransferTarget(null);
			await router.invalidate();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error, "Failed to transfer ownership"));
		},
	});

	const handleRoleChange = async (memberId: string, role: string) => {
		setChangingRole(memberId);
		await updateRoleMutation
			.mutateAsync({
				memberId,
				role: role as "admin" | "member",
				organizationId: orgId,
			})
			.catch(() => undefined);
		setChangingRole(null);
	};

	const handleRemove = async (memberIdOrEmail: string) => {
		setRemoving(memberIdOrEmail);
		await removeMemberMutation
			.mutateAsync({ memberIdOrEmail, organizationId: orgId })
			.catch(() => undefined);
		setRemoving(null);
	};

	const handleTransfer = async () => {
		if (!transferTarget) return;
		setTransferring(true);
		await transferOwnershipMutation
			.mutateAsync({ organizationId: orgId, targetMemberId: transferTarget })
			.catch(() => undefined);
		setTransferring(false);
	};

	return (
		<>
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="text-base">Members</CardTitle>
							<CardDescription>
								{members?.length ?? 0} member{members?.length !== 1 ? "s" : ""}
							</CardDescription>
						</div>
						{(memberRole === "owner" || isPlatformAdmin) &&
							members &&
							members.length > 1 && (
								<Button
									variant="outline"
									size="sm"
									onClick={() => setTransferOpen(true)}
								>
									Transfer ownership
								</Button>
							)}
					</div>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Member</TableHead>
								<TableHead>Role</TableHead>
								<TableHead className="w-40">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{members?.map((member) => {
								const isOwner = member.role === "owner";

								return (
									<TableRow key={member.id}>
										<TableCell>
											<div className="flex items-center gap-3">
												<Avatar className="size-8">
													<AvatarFallback>
														{initials(
															member.user.name ?? member.user.email ?? "?",
														)}
													</AvatarFallback>
												</Avatar>
												<div>
													<p className="text-sm font-medium">
														{member.user.name ?? member.user.email}
													</p>
													{member.user.name && (
														<p className="text-xs text-muted-foreground">
															{member.user.email}
														</p>
													)}
												</div>
											</div>
										</TableCell>
										<TableCell>
											{isOwner ? (
												<Badge variant={roleBadgeVariant("owner")}>owner</Badge>
											) : memberRole === "owner" || isPlatformAdmin ? (
												<Select
													value={member.role}
													onValueChange={(role) =>
														handleRoleChange(member.id, role)
													}
													disabled={changingRole === member.id}
												>
													<SelectTrigger className="h-7 w-28 text-xs">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="admin">admin</SelectItem>
														<SelectItem value="member">member</SelectItem>
													</SelectContent>
												</Select>
											) : (
												<Badge variant={roleBadgeVariant(member.role)}>
													{member.role}
												</Badge>
											)}
										</TableCell>
										<TableCell>
											{!isOwner &&
												(memberRole === "owner" || isPlatformAdmin) && (
													<Button
														variant="ghost"
														size="sm"
														className="text-destructive"
														disabled={removing === member.id}
														onClick={() => handleRemove(member.id)}
													>
														<UserMinus className="size-4" />
													</Button>
												)}
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			<Dialog open={transferOpen} onOpenChange={setTransferOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Transfer ownership</DialogTitle>
						<DialogDescription>
							Select a member to become the new owner. You will be demoted to
							admin.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-3">
						{members
							?.filter((m) => m.role !== "owner")
							.map((m) => (
								<label
									key={m.id}
									className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted ${
										transferTarget === m.id ? "border-primary bg-muted" : ""
									}`}
								>
									<input
										type="radio"
										name="transfer"
										value={m.id}
										checked={transferTarget === m.id}
										onChange={() => setTransferTarget(m.id)}
										className="size-4 accent-primary"
									/>
									<Avatar className="size-8">
										<AvatarFallback>
											{initials(m.user.name ?? m.user.email ?? "?")}
										</AvatarFallback>
									</Avatar>
									<div>
										<p className="text-sm font-medium">
											{m.user.name ?? m.user.email}
										</p>
										{m.user.name && (
											<p className="text-xs text-muted-foreground">
												{m.user.email}
											</p>
										)}
									</div>
								</label>
							))}
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setTransferOpen(false)}>
							Cancel
						</Button>
						<Button
							disabled={!transferTarget || transferring}
							onClick={handleTransfer}
						>
							{transferring ? "Transferring..." : "Transfer ownership"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

// ─── Invitations tab ──────────────────────────────────────

function InvitationsTab({
	orgId,
	invitations,
	isPlatformAdmin,
}: {
	orgId: string;
	invitations: OrganizationInvitation[];
	isPlatformAdmin: boolean;
}) {
	const router = useRouter();
	const pendingInvitations = invitations;
	const [inviteEmail, setInviteEmail] = useState("");
	const [inviteRole, setInviteRole] = useState("member");
	const [inviting, setInviting] = useState(false);

	const inviteMutation = useMutation({
		mutationFn: (data: {
			organizationId: string;
			email: string;
			role: "admin" | "member";
		}) => inviteOrganizationMember({ data }),
		onSuccess: async () => {
			toast.success("Invitation sent");
			setInviteEmail("");
			await router.invalidate();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error, "Failed to send invitation"));
		},
	});

	const addOwnerMutation = useMutation({
		mutationFn: (data: { organizationId: string; email: string }) =>
			addOrgOwner({ data }),
		onSuccess: async () => {
			toast.success("Owner added");
			setInviteEmail("");
			await router.invalidate();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error, "Failed to add owner"));
		},
	});

	const cancelInvitationMutation = useMutation({
		mutationFn: (data: { organizationId: string; invitationId: string }) =>
			cancelOrganizationInvitation({ data }),
		onSuccess: async () => {
			toast.success("Invitation cancelled");
			await router.invalidate();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error, "Failed to cancel invitation"));
		},
	});

	const handleInvite = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!inviteEmail.trim()) return;
		setInviting(true);

		if (inviteRole === "owner") {
			await addOwnerMutation
				.mutateAsync({ organizationId: orgId, email: inviteEmail.trim() })
				.catch(() => undefined);
		} else {
			await inviteMutation
				.mutateAsync({
					organizationId: orgId,
					email: inviteEmail.trim(),
					role: inviteRole as "admin" | "member",
				})
				.catch(() => undefined);
		}
		setInviting(false);
	};

	const handleCancel = async (invitationId: string) => {
		cancelInvitationMutation.mutate({ organizationId: orgId, invitationId });
	};

	return (
		<div className="grid gap-6">
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Send invitation</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleInvite} className="flex items-end gap-3">
						<div className="flex-1 grid gap-1.5">
							<Label htmlFor="inv-email">Email address</Label>
							<Input
								id="inv-email"
								type="email"
								placeholder="colleague@example.com"
								value={inviteEmail}
								onChange={(e) => setInviteEmail(e.target.value)}
							/>
						</div>
						<div className="grid gap-1.5">
							<Label htmlFor="inv-role">Role</Label>
							<Select
								value={inviteRole}
								onValueChange={(v) => setInviteRole(v)}
							>
								<SelectTrigger id="inv-role" className="w-32">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="member">Member</SelectItem>
									<SelectItem value="admin">Admin</SelectItem>
									{isPlatformAdmin && (
										<SelectItem value="owner">Owner</SelectItem>
									)}
								</SelectContent>
							</Select>
						</div>
						<Button type="submit" disabled={inviting || !inviteEmail.trim()}>
							{inviting ? "Sending..." : "Send invitation"}
						</Button>
					</form>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Pending invitations</CardTitle>
					<CardDescription>
						{pendingInvitations?.length ?? 0} pending invitation
						{pendingInvitations?.length !== 1 ? "s" : ""}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{pendingInvitations && pendingInvitations.length > 0 ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Email</TableHead>
									<TableHead>Role</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Expires</TableHead>
									<TableHead className="w-20" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{pendingInvitations.map((inv) => (
									<TableRow key={inv.id}>
										<TableCell className="font-medium">{inv.email}</TableCell>
										<TableCell>
											<Badge variant={roleBadgeVariant(inv.role ?? "member")}>
												{inv.role ?? "member"}
											</Badge>
										</TableCell>
										<TableCell className="capitalize">{inv.status}</TableCell>
										<TableCell className="text-xs text-muted-foreground">
											{new Date(inv.expiresAt).toLocaleDateString()}
										</TableCell>
										<TableCell>
											{inv.status === "pending" && (
												<Button
													variant="ghost"
													size="sm"
													className="text-destructive"
													onClick={() => handleCancel(inv.id)}
												>
													Cancel
												</Button>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					) : (
						<p className="text-sm text-muted-foreground">
							No pending invitations.
						</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

// ─── Settings tab ─────────────────────────────────────────

function SettingsTab({
	org,
	orgId,
	memberRole,
	isPlatformAdmin,
}: {
	org: { name: string; slug: string };
	orgId: string;
	memberRole: string;
	isPlatformAdmin: boolean;
}) {
	const router = useRouter();
	const isOwner = memberRole === "owner";
	const [name, setName] = useState(org.name);
	const [slug, setSlug] = useState(org.slug);
	const [saving, setSaving] = useState(false);

	const [leaveOpen, setLeaveOpen] = useState(false);
	const [leaving, setLeaving] = useState(false);

	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleteConfirm, setDeleteConfirm] = useState("");
	const [deleting, setDeleting] = useState(false);

	const updateDetailsMutation = useMutation({
		mutationFn: (data: {
			organizationId: string;
			name: string;
			slug: string;
		}) => updateOrganizationDetails({ data }),
		onSuccess: async () => {
			toast.success("Organization updated");
			await router.invalidate();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error, "Failed to update organization"));
		},
	});

	const leaveMutation = useMutation({
		mutationFn: (data: { organizationId: string }) =>
			leaveOrganization({ data }),
		onSuccess: () => {
			toast.success("Left organization");
			setLeaveOpen(false);
			window.location.href = "/dashboard";
		},
		onError: (error) => {
			toast.error(getErrorMessage(error, "Failed to leave organization"));
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (data: { organizationId: string }) =>
			deleteOrganization({ data }),
		onSuccess: () => {
			toast.success("Organization deleted");
			setDeleteOpen(false);
			window.location.href = "/dashboard";
		},
		onError: (error) => {
			toast.error(getErrorMessage(error, "Failed to delete organization"));
		},
	});

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		await updateDetailsMutation
			.mutateAsync({
				organizationId: orgId,
				name: name.trim(),
				slug: slug.trim(),
			})
			.catch(() => undefined);
		setSaving(false);
	};

	const handleLeave = async () => {
		setLeaving(true);
		await leaveMutation
			.mutateAsync({ organizationId: orgId })
			.catch(() => undefined);
		setLeaving(false);
	};

	const handleDelete = async () => {
		setDeleting(true);
		await deleteMutation
			.mutateAsync({ organizationId: orgId })
			.catch(() => undefined);
		setDeleting(false);
	};

	return (
		<div className="grid gap-6">
			<Card>
				<CardHeader>
					<CardTitle className="text-base">General</CardTitle>
					<CardDescription>Update your organization details</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSave} className="grid gap-4 max-w-sm">
						<div className="grid gap-1.5">
							<Label htmlFor="org-name">Name</Label>
							<Input
								id="org-name"
								value={name}
								onChange={(e) => setName(e.target.value)}
							/>
						</div>
						<div className="grid gap-1.5">
							<Label htmlFor="org-slug">Slug</Label>
							<Input
								id="org-slug"
								value={slug}
								onChange={(e) => setSlug(e.target.value)}
							/>
						</div>
						<Button
							type="submit"
							disabled={
								saving ||
								(name === org.name && slug === org.slug) ||
								!name.trim() ||
								!slug.trim()
							}
							className="w-fit"
						>
							{saving ? "Saving..." : "Save"}
						</Button>
					</form>
				</CardContent>
			</Card>

			{!isOwner && !isPlatformAdmin && (
				<Card className="border-destructive/50">
					<CardHeader>
						<CardTitle className="text-base text-destructive">
							Leave organization
						</CardTitle>
						<CardDescription>
							Once you leave, you'll lose access to this organization's
							resources.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button variant="destructive" onClick={() => setLeaveOpen(true)}>
							<LogOut className="size-4" />
							Leave organization
						</Button>
					</CardContent>
				</Card>
			)}

			{(isOwner || isPlatformAdmin) && (
				<Card className="border-destructive/50">
					<CardHeader>
						<CardTitle className="text-base text-destructive">
							Delete organization
						</CardTitle>
						<CardDescription>
							Permanently delete this organization and all of its data. This
							action cannot be undone.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button variant="destructive" onClick={() => setDeleteOpen(true)}>
							<Trash2 className="size-4" />
							Delete organization
						</Button>
					</CardContent>
				</Card>
			)}

			<Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Leave organization</DialogTitle>
						<DialogDescription>
							Are you sure you want to leave? You'll need a new invitation to
							rejoin.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setLeaveOpen(false)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							disabled={leaving}
							onClick={handleLeave}
						>
							{leaving ? "Leaving..." : "Leave"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete organization</DialogTitle>
						<DialogDescription>
							This will permanently delete <strong>{org.name}</strong> and all
							members, invitations, and data. Type <strong>{org.slug}</strong>{" "}
							to confirm.
						</DialogDescription>
					</DialogHeader>
					<Input
						placeholder={org.slug}
						value={deleteConfirm}
						onChange={(e) => setDeleteConfirm(e.target.value)}
					/>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setDeleteOpen(false);
								setDeleteConfirm("");
							}}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							disabled={deleting || deleteConfirm !== org.slug}
							onClick={handleDelete}
						>
							{deleting ? "Deleting..." : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

// ─── No org state ─────────────────────────────────────────

function NoOrgState() {
	return (
		<div className="grid gap-6">
			<Card>
				<CardHeader>
					<CardTitle>No organization selected</CardTitle>
					<CardDescription>
						Create a new organization from the sidebar or select an existing one
						to manage it here.
					</CardDescription>
				</CardHeader>
			</Card>
		</div>
	);
}

// ─── Route component ──────────────────────────────────────

function RouteComponent() {
	const {
		organization: activeOrg,
		members,
		invitations,
		currentMemberRole: memberRole,
		isPlatformAdmin,
	} = Route.useLoaderData();

	if (!activeOrg) {
		return (
			<ProtectedLayout breadcrumbs={[{ label: "Organization" }]}>
				<NoOrgState />
			</ProtectedLayout>
		);
	}

	return (
		<ProtectedLayout
			breadcrumbs={[
				{ label: "Organization", href: "/organization" },
				{ label: activeOrg.name },
			]}
		>
			<Tabs defaultValue="overview" className="w-full">
				<TabsList>
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="members">Members</TabsTrigger>
					<TabsTrigger value="invitations">Invitations</TabsTrigger>
					<TabsTrigger value="settings">Settings</TabsTrigger>
				</TabsList>
				<TabsContent value="overview">
					<OverviewTab
						org={activeOrg}
						orgId={activeOrg.id}
						members={members}
						isPlatformAdmin={isPlatformAdmin}
					/>
				</TabsContent>
				<TabsContent value="members">
					<MembersTab
						orgId={activeOrg.id}
						members={members}
						memberRole={memberRole}
						isPlatformAdmin={isPlatformAdmin}
					/>
				</TabsContent>
				<TabsContent value="invitations">
					<InvitationsTab
						orgId={activeOrg.id}
						invitations={invitations}
						isPlatformAdmin={isPlatformAdmin}
					/>
				</TabsContent>
				<TabsContent value="settings">
					<SettingsTab
						org={activeOrg}
						orgId={activeOrg.id}
						memberRole={memberRole}
						isPlatformAdmin={isPlatformAdmin}
					/>
				</TabsContent>
			</Tabs>
		</ProtectedLayout>
	);
}
