import { Building2, Globe, LayoutDashboard, Shield } from "lucide-react";

import { NavMain } from "#/components/nav-main.tsx";
import { NavUser } from "#/components/nav-user.tsx";
import { TeamSwitcher } from "#/components/team-switcher.tsx";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuItem,
	SidebarRail,
} from "#/components/ui/sidebar.tsx";
import type { ProtectedShellData } from "#/features/shell/shell.functions";

const navMain = [
	{
		title: "Dashboard",
		url: "/dashboard",
		icon: LayoutDashboard,
		isActive: true,
	},
];

const adminNav = [
	{
		title: "Users",
		url: "/admin",
		icon: Shield,
	},
	{
		title: "Organizations",
		url: "/admin/organizations",
		icon: Globe,
	},
];

const orgNavItems = [
	{
		title: "Organization",
		url: "/organization",
		icon: Building2,
	},
];

export function AppSidebar({
	shellData,
	...props
}: React.ComponentProps<typeof Sidebar> & {
	shellData: ProtectedShellData;
}) {
	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<TeamSwitcher
							activeOrganization={shellData.activeOrganization}
							isAdmin={shellData.isAdmin}
							organizations={shellData.organizations}
						/>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={navMain} />
				{shellData.activeOrganization && (
					<NavMain
						items={orgNavItems}
						label={shellData.activeOrganization.name}
					/>
				)}
				{shellData.isAdmin && (
					<NavMain items={adminNav} label="Administration" />
				)}
			</SidebarContent>
			<SidebarFooter>
				<NavUser
					user={{
						name: shellData.user.name,
						email: shellData.user.email,
						avatar: shellData.user.image ?? "",
					}}
				/>
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
