import { createFileRoute } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/email-verified")({
	component: RouteComponent,
});

function RouteComponent() {
	const { data: session } = authClient.useSession();

	return (
		<div className="flex min-h-svh items-center justify-center p-8">
			<div className="max-w-md space-y-6 text-center">
				<div className="flex justify-center">
					<div className="flex size-16 items-center justify-center rounded-full bg-green-100">
						<span className="text-3xl">✓</span>
					</div>
				</div>
				<h1 className="text-3xl font-bold tracking-tight">Email Verified!</h1>
				<p className="text-muted-foreground">
					Your email address has been successfully verified. You can now access
					all features of your account.
				</p>
				<div className="flex items-center justify-center gap-4">
					{session ? (
						<Button asChild>
							<a href="/dashboard">Go to Dashboard</a>
						</Button>
					) : (
						<>
							<Button asChild>
								<a href="/login">Sign in</a>
							</Button>
							<Button variant="outline" asChild>
								<a href="/">Home</a>
							</Button>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
