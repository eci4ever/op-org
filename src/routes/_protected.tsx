import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getProtectedShellData } from "#/features/shell/shell.functions";

import { getSession } from "@/lib/auth.functions";

export const Route = createFileRoute("/_protected")({
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

		return {
			user: session.user,
		};
	},
	loader: async () => {
		return getProtectedShellData();
	},
	component: ProtectedLayout,
});

function ProtectedLayout() {
	return <Outlet />;
}
