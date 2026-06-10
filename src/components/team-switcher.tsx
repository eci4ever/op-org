import { useState } from "react";
import { BriefcaseBusiness, ChevronsUpDown, Plus, Settings } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { SidebarMenuButton, useSidebar } from "#/components/ui/sidebar";
import { authClient } from "#/lib/auth-client";
import { CreateOrgDialog } from "#/components/create-org-dialog";

export function TeamSwitcher() {
	const { isMobile } = useSidebar();
	const { data: activeOrg } = authClient.useActiveOrganization();
	const { data: organizations } = authClient.useListOrganizations();
	const [createOpen, setCreateOpen] = useState(false);

	const currentOrg = activeOrg ?? null;
	const orgs = organizations ?? [];

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
							<BriefcaseBusiness className="size-4" />
						</div>
						<div className="grid flex-1 text-left text-sm leading-tight">
							<span className="truncate font-medium">
								{currentOrg?.name ?? "No organization"}
							</span>
							<span className="truncate text-xs text-muted-foreground">
								{currentOrg ? "Enterprise" : "Select a workspace"}
							</span>
						</div>
						<ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
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
					{orgs.length > 0 ? (
						orgs.map((org) => (
							<DropdownMenuItem
								key={org.id}
								onClick={() =>
									authClient.organization.setActive({ organizationId: org.id })
								}
								className="gap-2 p-2"
							>
								<div className="flex size-6 items-center justify-center rounded-md border">
									<BriefcaseBusiness className="size-3.5 shrink-0" />
								</div>
								{org.name}
							</DropdownMenuItem>
						))
					) : (
						<DropdownMenuItem disabled className="gap-2 p-2 text-muted-foreground">
							No workspaces yet
						</DropdownMenuItem>
					)}
					<DropdownMenuSeparator />
					<DropdownMenuItem
						onClick={() => setCreateOpen(true)}
						className="gap-2 p-2"
					>
						<Plus className="size-3.5" />
						Create organization
					</DropdownMenuItem>
					{currentOrg && (
						<DropdownMenuItem
							onClick={() => (window.location.href = "/organization")}
							className="gap-2 p-2"
						>
							<Settings className="size-3.5" />
							Organization settings
						</DropdownMenuItem>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
			<CreateOrgDialog open={createOpen} onOpenChange={setCreateOpen} />
		</>
	);
}
