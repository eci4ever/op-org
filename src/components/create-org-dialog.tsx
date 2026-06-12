import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
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
import { createShellOrganization } from "#/features/shell/shell.functions";

export function CreateOrgDialog({
	onCreated,
	open,
	onOpenChange,
}: {
	onCreated?: () => void | Promise<void>;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [slugEdited, setSlugEdited] = useState(false);
	const [loading, setLoading] = useState(false);

	const createOrganizationMutation = useMutation({
		mutationFn: (data: { name: string; slug: string }) =>
			createShellOrganization({ data }),
		onSuccess: async () => {
			toast.success("Organization created");
			setName("");
			setSlug("");
			setSlugEdited(false);
			setLoading(false);
			onOpenChange(false);
			await onCreated?.();
		},
		onError: (error) => {
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to create organization",
			);
			setLoading(false);
		},
	});

	const handleNameChange = (value: string) => {
		setName(value);
		if (!slugEdited) {
			setSlug(
				value
					.toLowerCase()
					.replace(/[^a-z0-9-]+/g, "-")
					.replace(/^-|-$/g, ""),
			);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim() || !slug.trim()) return;

		setLoading(true);
		createOrganizationMutation.mutate({
			name: name.trim(),
			slug: slug.trim(),
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create organization</DialogTitle>
					<DialogDescription>
						Create a new workspace to collaborate with your team.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="grid gap-4">
						<div className="grid gap-2">
							<Label htmlFor="org-name">Name</Label>
							<Input
								id="org-name"
								placeholder="Acme Inc"
								value={name}
								onChange={(e) => handleNameChange(e.target.value)}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="org-slug">Slug</Label>
							<Input
								id="org-slug"
								placeholder="acme-inc"
								value={slug}
								onChange={(e) => {
									setSlugEdited(true);
									setSlug(e.target.value);
								}}
							/>
						</div>
					</div>
					<DialogFooter className="mt-6">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={loading || !name.trim() || !slug.trim()}
						>
							{loading ? "Creating..." : "Create"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
