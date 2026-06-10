import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button.tsx";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card.tsx";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "#/components/ui/field.tsx";
import { Input } from "#/components/ui/input.tsx";
import { authClient } from "#/lib/auth-client.ts";

export function SignupForm({
	redirect,
	...props
}: React.ComponentProps<typeof Card> & { redirect?: string }) {
	const navigate = useNavigate();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

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

		await authClient.signUp.email(
			{
				email,
				password,
				name,
				callbackURL: redirect ?? "/email-verified",
			},
			{
				onSuccess: async () => {
					toast.success(
						"Account created! Check your email to verify.",
					);
					navigate({ to: "/check-email" });
				},
				onError: (ctx) => {
					toast.error(
						ctx.error.message ?? "An unexpected error occurred",
					);
					setError(ctx.error.message ?? "An unexpected error occurred");
				},
			},
		);

		setLoading(false);
	};

	return (
		<Card {...props}>
			<CardHeader>
				<CardTitle>Create an account</CardTitle>
				<CardDescription>
					Enter your information below to create your account
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit}>
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="name">Full Name</FieldLabel>
							<Input
								id="name"
								type="text"
								placeholder="John Doe"
								required
								value={name}
								onChange={(e) => setName(e.target.value)}
							/>
						</Field>
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
							<FieldDescription>
								We&apos;ll use this to contact you. We will not share your email
								with anyone else.
							</FieldDescription>
						</Field>
						<Field>
							<FieldLabel htmlFor="password">Password</FieldLabel>
							<Input
								id="password"
								type="password"
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
							<FieldDescription>
								Must be at least 8 characters long.
							</FieldDescription>
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
							<FieldDescription>Please confirm your password.</FieldDescription>
						</Field>
						{error && <p className="text-sm text-red-500">{error}</p>}
						<FieldGroup>
							<Field>
								<Button type="submit" disabled={loading}>
									{loading ? "Creating account..." : "Create Account"}
								</Button>
								<Button variant="outline" type="button">
									Sign up with Google
								</Button>
								<FieldDescription className="px-6 text-center">
									Already have an account?{" "}
									<Link to="/login">
										Sign in
									</Link>
								</FieldDescription>
							</Field>
						</FieldGroup>
					</FieldGroup>
				</form>
			</CardContent>
		</Card>
	);
}
