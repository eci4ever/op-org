import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Building2, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
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
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import {
	adminCreateOrganization,
	adminDeleteOrganization,
	listAllOrganizations,
	type OrgWithMeta,
} from "#/features/organizations/organization.functions";

export const Route = createFileRoute("/_protected/admin/organizations")({
	component: RouteComponent,
	loader: async () => {
		const orgs = await listAllOrganizations();
		return orgs;
	},
});

function RouteComponent() {
	const router = useRouter();
	const orgs = Route.useLoaderData() as OrgWithMeta[];
	const [search, setSearch] = useState("");

	const [createOpen, setCreateOpen] = useState(false);
	const [createName, setCreateName] = useState("");
	const [createSlug, setCreateSlug] = useState("");
	const [slugEdited, setSlugEdited] = useState(false);
	const [ownerEmail, setOwnerEmail] = useState("");
	const [creating, setCreating] = useState(false);

	const [deleteTarget, setDeleteTarget] = useState<OrgWithMeta | null>(null);
	const [deleteConfirm, setDeleteConfirm] = useState("");
	const [deleting, setDeleting] = useState(false);

	const filtered = search
		? orgs.filter(
				(org) =>
					org.name.toLowerCase().includes(search.toLowerCase()) ||
					org.slug.toLowerCase().includes(search.toLowerCase()),
			)
		: orgs;

	const handleNameChange = (value: string) => {
		setCreateName(value);
		if (!slugEdited) {
			setCreateSlug(
				value
					.toLowerCase()
					.replace(/[^a-z0-9-]+/g, "-")
					.replace(/^-|-$/g, ""),
			);
		}
	};

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!createName.trim() || !createSlug.trim() || !ownerEmail.trim()) return;
		setCreating(true);
		try {
			await adminCreateOrganization({
				data: {
					name: createName.trim(),
					slug: createSlug.trim(),
					ownerEmail: ownerEmail.trim(),
				},
			});
			toast.success("Organization created");
			setCreateOpen(false);
			setCreateName("");
			setCreateSlug("");
			setSlugEdited(false);
			setOwnerEmail("");
			await router.invalidate();
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to create organization",
			);
		}
		setCreating(false);
	};

	const handleDelete = async () => {
		if (!deleteTarget) return;
		setDeleting(true);
		try {
			await adminDeleteOrganization({
				data: { organizationId: deleteTarget.id },
			});
			toast.success("Organization deleted");
			setDeleteTarget(null);
			setDeleteConfirm("");
			await router.invalidate();
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to delete organization",
			);
		}
		setDeleting(false);
	};

	return (
		<ProtectedLayout
			breadcrumbs={[
				{ label: "Admin", href: "/admin" },
				{ label: "Organizations" },
			]}
		>
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Organizations</CardTitle>
							<CardDescription>
								{orgs.length} organization{orgs.length !== 1 ? "s" : ""} total
							</CardDescription>
						</div>
						<div className="flex items-center gap-3">
							<div className="relative w-64">
								<Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
								<Input
									placeholder="Search by name or slug..."
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className="pl-8"
								/>
							</div>
							<Button onClick={() => setCreateOpen(true)}>
								<Plus className="size-4" />
								Create
							</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Slug</TableHead>
								<TableHead className="w-20">Members</TableHead>
								<TableHead>Owner</TableHead>
								<TableHead className="w-28">Created</TableHead>
								<TableHead className="w-20" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{filtered.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={6}
										className="text-center text-muted-foreground"
									>
										{search
											? "No organizations match your search."
											: "No organizations found."}
									</TableCell>
								</TableRow>
							) : (
								filtered.map((org) => (
									<TableRow key={org.id}>
										<TableCell>
											<div className="flex items-center gap-3">
												<div className="flex size-8 items-center justify-center rounded-lg bg-neutral-900 text-white">
													<Building2 className="size-4" />
												</div>
												<span className="font-medium">{org.name}</span>
											</div>
										</TableCell>
										<TableCell className="font-mono text-sm text-muted-foreground">
											{org.slug}
										</TableCell>
										<TableCell>
											<Badge variant="secondary">{org.memberCount}</Badge>
										</TableCell>
										<TableCell className="text-sm">
											{org.ownerName ? (
												<div>
													<p className="font-medium">{org.ownerName}</p>
													<p className="text-xs text-muted-foreground">
														{org.ownerEmail}
													</p>
												</div>
											) : (
												<span className="text-muted-foreground">—</span>
											)}
										</TableCell>
										<TableCell className="text-sm text-muted-foreground">
											{new Date(org.createdAt).toLocaleDateString()}
										</TableCell>
										<TableCell>
											<Button
												variant="ghost"
												size="sm"
												className="text-destructive"
												onClick={() => setDeleteTarget(org)}
											>
												<Trash2 className="size-3.5" />
											</Button>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create organization</DialogTitle>
						<DialogDescription>
							Create a new organization and assign an owner.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleCreate}>
						<div className="grid gap-4">
							<div className="grid gap-2">
								<Label htmlFor="org-name">Name</Label>
								<Input
									id="org-name"
									placeholder="Acme Inc"
									value={createName}
									onChange={(e) => handleNameChange(e.target.value)}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="org-slug">Slug</Label>
								<Input
									id="org-slug"
									placeholder="acme-inc"
									value={createSlug}
									onChange={(e) => {
										setSlugEdited(true);
										setCreateSlug(e.target.value);
									}}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="owner-email">Owner email</Label>
								<Input
									id="owner-email"
									type="email"
									placeholder="owner@example.com"
									value={ownerEmail}
									onChange={(e) => setOwnerEmail(e.target.value)}
								/>
							</div>
						</div>
						<DialogFooter className="mt-6">
							<Button
								type="button"
								variant="outline"
								onClick={() => setCreateOpen(false)}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={
									creating ||
									!createName.trim() ||
									!createSlug.trim() ||
									!ownerEmail.trim()
								}
							>
								{creating ? "Creating..." : "Create"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog
				open={deleteTarget !== null}
				onOpenChange={(open) => {
					if (!open) {
						setDeleteTarget(null);
						setDeleteConfirm("");
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete organization</DialogTitle>
						<DialogDescription>
							This will permanently delete <strong>{deleteTarget?.name}</strong>{" "}
							and all members, invitations, and data. Type{" "}
							<strong>{deleteTarget?.slug}</strong> to confirm.
						</DialogDescription>
					</DialogHeader>
					<Input
						placeholder={deleteTarget?.slug ?? ""}
						value={deleteConfirm}
						onChange={(e) => setDeleteConfirm(e.target.value)}
					/>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setDeleteTarget(null);
								setDeleteConfirm("");
							}}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							disabled={deleting || deleteConfirm !== deleteTarget?.slug}
							onClick={handleDelete}
						>
							{deleting ? "Deleting..." : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</ProtectedLayout>
	);
}
