import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import { getSession } from "@/lib/auth.functions";

export const Route = createFileRoute("/")({
	beforeLoad: async () => {
		const session = await getSession();
		if (session) {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: Home,
});

function Home() {
	return (
		<div className="flex min-h-svh items-center justify-center p-8">
			<div className="max-w-md flex flex-col gap-6 text-center">
				<h1 className="text-5xl font-bold tracking-tight">op-org</h1>
				<p className="text-lg text-muted-foreground">
					Manage your organizations, teams, and projects.
				</p>
				<div className="flex items-center justify-center gap-4">
					<Button asChild>
						<Link to="/login">Sign in</Link>
					</Button>
					<Button variant="outline" asChild>
						<Link to="/signup">Sign up</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}
