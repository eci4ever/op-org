import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/forgot-password")({
	component: RouteComponent,
});

function RouteComponent() {
	const [email, setEmail] = useState("");
	const [sent, setSent] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setLoading(true);

		const { error } = await authClient.requestPasswordReset({
			email,
			redirectTo: "/reset-password",
		});

		if (error) {
			setError(error.message ?? "An unexpected error occurred");
			setLoading(false);
			return;
		}

		setSent(true);
		setLoading(false);
	};

	if (sent) {
		return (
			<div className="flex min-h-svh items-center justify-center p-8">
				<Card className="w-full max-w-sm">
					<CardHeader>
						<CardTitle>Check your email</CardTitle>
						<CardDescription>
							If an account with that email exists, we've sent a password reset
							link. Please check your inbox.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button asChild className="w-full">
							<Link to="/login">Back to sign in</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="flex min-h-svh items-center justify-center p-8">
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle>Forgot your password?</CardTitle>
					<CardDescription>
						Enter your email address and we'll send you a link to reset your
						password.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit}>
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="email">Email</FieldLabel>
								<Input
									id="email"
									type="email"
									placeholder="m@example.com"
									required
									value={email}
									onChange={(e) => setEmail(e.target.value)}
								/>
							</Field>
							{error && <p className="text-sm text-red-500">{error}</p>}
							<Field>
								<Button type="submit" disabled={loading} className="w-full">
									{loading ? "Sending..." : "Send reset link"}
								</Button>
							</Field>
							<p className="text-center text-sm text-muted-foreground">
								Remember your password?{" "}
								<Link
									to="/login"
									className="underline underline-offset-4 hover:text-foreground"
								>
									Sign in
								</Link>
							</p>
						</FieldGroup>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
