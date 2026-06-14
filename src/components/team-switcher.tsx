import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import {
	BriefcaseBusiness,
	ChevronsUpDown,
	Plus,
	Settings,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CreateOrgDialog } from "#/components/create-org-dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { SidebarMenuButton, useSidebar } from "#/components/ui/sidebar";
import {
	type ShellOrganization,
	setActiveShellOrganization,
} from "#/features/shell/shell.functions";

export function TeamSwitcher({
	activeOrganization,
	isAdmin,
	organizations,
}: {
	activeOrganization: ShellOrganization | null;
	isAdmin: boolean;
	organizations: ShellOrganization[];
}) {
	const { isMobile } = useSidebar();
	const router = useRouter();
	const [createOpen, setCreateOpen] = useState(false);

	const setActiveMutation = useMutation({
		mutationFn: (data: { organizationId: string }) =>
			setActiveShellOrganization({ data }),
		onSuccess: async () => {
			await router.invalidate();
		},
		onError: (error) => {
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to switch organization",
			);
		},
	});

	const currentOrg = activeOrganization;

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<SidebarMenuButton
						size="lg"
						tooltip={currentOrg?.name ?? "No organization"}
						className="rounded-lg"
					>
						<div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white">
							<BriefcaseBusiness />
						</div>
						<div className="grid flex-1 text-left text-sm leading-tight">
							<span className="truncate font-medium">
								{currentOrg?.name ?? "No organization"}
							</span>
							<span className="truncate text-xs text-muted-foreground">
								{currentOrg ? "Enterprise" : "Select a workspace"}
							</span>
						</div>
						<ChevronsUpDown className="ml-auto shrink-0 text-muted-foreground" />
					</SidebarMenuButton>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
					align="start"
					side={isMobile ? "bottom" : "right"}
					sideOffset={4}
				>
					<DropdownMenuLabel className="text-xs text-muted-foreground">
						Workspaces
					</DropdownMenuLabel>
					{organizations.length > 0 ? (
						organizations.map((org) => (
							<DropdownMenuItem
								key={org.id}
								onClick={() =>
									setActiveMutation.mutate({ organizationId: org.id })
								}
								className="gap-2 p-2"
							>
								<div className="flex size-6 items-center justify-center rounded-md border">
									<BriefcaseBusiness className="shrink-0" />
								</div>
								{org.name}
							</DropdownMenuItem>
						))
					) : (
						<DropdownMenuItem
							disabled
							className="gap-2 p-2 text-muted-foreground"
						>
							No workspaces yet
						</DropdownMenuItem>
					)}
					<DropdownMenuSeparator />
					{isAdmin && (
						<DropdownMenuItem
							onClick={() => setCreateOpen(true)}
							className="gap-2 p-2"
						>
							<Plus />
							Create organization
						</DropdownMenuItem>
					)}
					{currentOrg && (
						<DropdownMenuItem
							onClick={() => (window.location.href = "/organization")}
							className="gap-2 p-2"
						>
							<Settings />
							Organization settings
						</DropdownMenuItem>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
			<CreateOrgDialog
				open={createOpen}
				onCreated={() => router.invalidate()}
				onOpenChange={setCreateOpen}
			/>
		</>
	);
}
