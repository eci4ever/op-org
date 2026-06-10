import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";

export const Route = createFileRoute("/check-email")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="flex min-h-svh items-center justify-center p-8">
			<div className="max-w-md space-y-6 text-center">
				<div className="flex justify-center">
					<div className="flex size-16 items-center justify-center rounded-full bg-blue-100">
						<span className="text-3xl">✉</span>
					</div>
				</div>
				<h1 className="text-3xl font-bold tracking-tight">Check your email</h1>
				<p className="text-muted-foreground">
					We've sent a verification link to your email address. Please check
					your inbox and click the link to verify your account before signing
					in.
				</p>
				<div className="flex items-center justify-center gap-4">
					<Button asChild>
						<Link to="/">Back to Home</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}
