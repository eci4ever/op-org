import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
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

export const Route = createFileRoute("/reset-password")({
	validateSearch: z.object({
		token: z.string(),
	}),
	component: RouteComponent,
});

function RouteComponent() {
	const { token } = Route.useSearch();
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [reset, setReset] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		if (password !== confirmPassword) {
			setError("Passwords do not match");
			return;
		}

		if (password.length < 8) {
			setError("Password must be at least 8 characters");
			return;
		}

		setLoading(true);

		const { error } = await authClient.resetPassword({
			newPassword: password,
			token,
		});

		if (error) {
			setError(error.message ?? "An unexpected error occurred");
			setLoading(false);
			return;
		}

		setReset(true);
		setLoading(false);
	};

	if (reset) {
		return (
			<div className="flex min-h-svh items-center justify-center p-8">
				<Card className="w-full max-w-sm">
					<CardHeader>
						<CardTitle>Password reset</CardTitle>
						<CardDescription>
							Your password has been successfully reset. You can now sign in
							with your new password.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button asChild className="w-full">
							<Link to="/login">Sign in</Link>
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
					<CardTitle>Set new password</CardTitle>
					<CardDescription>Enter your new password below.</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit}>
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="password">New Password</FieldLabel>
								<Input
									id="password"
									type="password"
									required
									value={password}
									onChange={(e) => setPassword(e.target.value)}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="confirm-password">
									Confirm Password
								</FieldLabel>
								<Input
									id="confirm-password"
									type="password"
									required
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
								/>
							</Field>
							{error && <p className="text-sm text-red-500">{error}</p>}
							<Field>
								<Button type="submit" disabled={loading} className="w-full">
									{loading ? "Resetting..." : "Reset password"}
								</Button>
							</Field>
						</FieldGroup>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
