import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { getSession } from "@/lib/auth.functions";

export const Route = createFileRoute("/_protected/admin")({
	beforeLoad: async ({ location }) => {
		const session = await getSession();

		if (!session) {
			throw redirect({
				to: "/login",
				search: {
					redirect: location.href,
				},
			});
		}

		if (session.user.role !== "admin") {
			throw redirect({
				to: "/dashboard",
			});
		}

		return {
			user: session.user,
		};
	},
	component: AdminLayout,
});

function AdminLayout() {
	return <Outlet />;
}
