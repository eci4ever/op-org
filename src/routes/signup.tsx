import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { SignupForm } from "#/components/signup-form";

export const Route = createFileRoute("/signup")({
	validateSearch: z.object({
		redirect: z.string().optional(),
	}),
	component: RouteComponent,
});

function RouteComponent() {
	const { redirect } = Route.useSearch();
	return (
		<div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
			<div className="w-full max-w-sm">
				<Link
					to="/"
					className="mb-6 inline-block text-sm text-muted-foreground transition-colors hover:text-foreground"
				>
					← Back to home
				</Link>
				<SignupForm redirect={redirect} />
			</div>
		</div>
	);
}
