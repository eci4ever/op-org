import { Building2, LayoutDashboard, Shield, Users, Mail, Settings } from "lucide-react";

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
import { authClient } from "#/lib/auth-client.ts";

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
];

const orgNavItems = [
	{
		title: "Overview",
		url: "/organization?tab=overview",
		icon: Building2,
	},
	{
		title: "Members",
		url: "/organization?tab=members",
		icon: Users,
	},
	{
		title: "Invitations",
		url: "/organization?tab=invitations",
		icon: Mail,
	},
	{
		title: "Settings",
		url: "/organization?tab=settings",
		icon: Settings,
	},
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const { data: session } = authClient.useSession();
	const { data: activeOrg } = authClient.useActiveOrganization();

	const user = session?.user
		? {
				name: session.user.name,
				email: session.user.email,
				avatar: session.user.image ?? "",
			}
		: { name: "User", email: "", avatar: "" };

	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<TeamSwitcher />
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={navMain} />
				{activeOrg && (
					<NavMain items={orgNavItems} label={activeOrg.name} />
				)}
				{session?.user?.role === "admin" && (
					<NavMain items={adminNav} label="Administration" />
				)}
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={user} />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
