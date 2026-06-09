import { BriefcaseBusiness, ChevronsUpDown } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { useSidebar } from "#/components/ui/sidebar";
import { authClient } from "#/lib/auth-client";

export function TeamSwitcher() {
	const { isMobile } = useSidebar();
	const { data: activeOrg } = authClient.useActiveOrganization();
	const { data: organizations } = authClient.useListOrganizations();

	const currentOrg = activeOrg ?? organizations?.[0] ?? { name: "Acme Inc" };

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className="flex h-12 w-full items-center gap-2 px-4 text-left hover:bg-accent transition-colors rounded-lg"
				>
					<div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white">
						<BriefcaseBusiness className="size-4" />
					</div>
					<div className="min-w-0 flex-1">
						<div className="truncate text-sm font-medium leading-tight">
							{currentOrg.name}
						</div>
						<div className="truncate text-xs text-muted-foreground">
							Enterprise
						</div>
					</div>
					<ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
				</button>
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
				{(organizations ?? []).map((org) => (
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
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
