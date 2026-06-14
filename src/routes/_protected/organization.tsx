import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Building2, LogOut, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ProtectedLayout } from "#/components/protected-layout";
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
import { OrganizationInvitationsTable } from "#/features/organizations/organization-invitations-table";
import { OrganizationMembersTable } from "#/features/organizations/organization-members-table";

export const Route = createFileRoute("/_protected/organization")({
	loader: async () => getActiveOrganizationManagement(),
	component: RouteComponent,
});

function getErrorMessage(error: unknown, fallback: string) {
	return error instanceof Error ? error.message : fallback;
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
							<UserPlus data-icon="inline-start" />
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
		<OrganizationMembersTable
			members={members}
			memberRole={memberRole}
			isPlatformAdmin={isPlatformAdmin}
			changingRole={changingRole}
			removing={removing}
			transferOpen={transferOpen}
			transferTarget={transferTarget}
			transferring={transferring}
			onTransferOpenChange={setTransferOpen}
			onTransferTargetChange={setTransferTarget}
			onRoleChange={handleRoleChange}
			onRemove={handleRemove}
			onTransfer={handleTransfer}
		/>
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

			<OrganizationInvitationsTable
				invitations={invitations}
				onCancel={handleCancel}
			/>
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
							<LogOut data-icon="inline-start" />
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
							<Trash2 data-icon="inline-start" />
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
