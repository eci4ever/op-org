import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ProtectedLayout } from "#/components/protected-layout";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { AdminOrganizationsDataTable } from "#/features/organizations/admin-organizations-data-table";
import {
	adminCreateOrganization,
	adminDeleteOrganization,
	listAllOrganizations,
	type OrgWithMeta,
} from "#/features/organizations/organization.functions";
import { useServerMutationToast } from "#/hooks/use-server-mutation-toast";

export const Route = createFileRoute("/_protected/admin/organizations")({
	component: RouteComponent,
	loader: async () => {
		const orgs = await listAllOrganizations();
		return orgs;
	},
});

function RouteComponent() {
	const orgs = Route.useLoaderData() as OrgWithMeta[];

	const [createOpen, setCreateOpen] = useState(false);
	const [createName, setCreateName] = useState("");
	const [createSlug, setCreateSlug] = useState("");
	const [slugEdited, setSlugEdited] = useState(false);
	const [ownerEmail, setOwnerEmail] = useState("");

	const [deleteTarget, setDeleteTarget] = useState<OrgWithMeta | null>(null);
	const [deleteConfirm, setDeleteConfirm] = useState("");

	const createOrganizationMutation = useServerMutationToast({
		mutationFn: (data: { name: string; slug: string; ownerEmail: string }) =>
			adminCreateOrganization({ data }),
		successMessage: "Organization created",
		errorMessage: "Failed to create organization",
		onSuccess: () => {
			setCreateOpen(false);
			setCreateName("");
			setCreateSlug("");
			setSlugEdited(false);
			setOwnerEmail("");
		},
	});

	const deleteOrganizationMutation = useServerMutationToast({
		mutationFn: (data: { organizationId: string }) =>
			adminDeleteOrganization({ data }),
		successMessage: "Organization deleted",
		errorMessage: "Failed to delete organization",
		onSuccess: () => {
			setDeleteTarget(null);
			setDeleteConfirm("");
		},
	});

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

		await createOrganizationMutation
			.mutateAsync({
				name: createName.trim(),
				slug: createSlug.trim(),
				ownerEmail: ownerEmail.trim(),
			})
			.catch(() => undefined);
	};

	const handleDelete = async () => {
		if (!deleteTarget) return;

		await deleteOrganizationMutation
			.mutateAsync({ organizationId: deleteTarget.id })
			.catch(() => undefined);
	};

	return (
		<ProtectedLayout
			breadcrumbs={[
				{ label: "Admin", href: "/admin" },
				{ label: "Organizations" },
			]}
		>
			<AdminOrganizationsDataTable
				organizations={orgs}
				onCreate={() => setCreateOpen(true)}
				onDelete={setDeleteTarget}
			/>

			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create organization</DialogTitle>
						<DialogDescription>
							Create a new organization and assign an owner.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleCreate}>
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="org-name">Name</FieldLabel>
								<Input
									id="org-name"
									placeholder="Acme Inc"
									value={createName}
									onChange={(e) => handleNameChange(e.target.value)}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="org-slug">Slug</FieldLabel>
								<Input
									id="org-slug"
									placeholder="acme-inc"
									value={createSlug}
									onChange={(e) => {
										setSlugEdited(true);
										setCreateSlug(e.target.value);
									}}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="owner-email">Owner email</FieldLabel>
								<Input
									id="owner-email"
									type="email"
									placeholder="owner@example.com"
									value={ownerEmail}
									onChange={(e) => setOwnerEmail(e.target.value)}
								/>
							</Field>
						</FieldGroup>
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
									createOrganizationMutation.isPending ||
									!createName.trim() ||
									!createSlug.trim() ||
									!ownerEmail.trim()
								}
							>
								{createOrganizationMutation.isPending
									? "Creating..."
									: "Create"}
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
							disabled={
								deleteOrganizationMutation.isPending ||
								deleteConfirm !== deleteTarget?.slug
							}
							onClick={handleDelete}
						>
							{deleteOrganizationMutation.isPending ? "Deleting..." : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</ProtectedLayout>
	);
}
