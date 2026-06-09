import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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
import { cn } from "#/lib/utils.ts";

export function LoginForm({
	className,
	redirect,
	...props
}: React.ComponentProps<"div"> & { redirect?: string }) {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setLoading(true);

		const { data, error } = await authClient.signIn.email({
			email,
			password,
			callbackURL: redirect ?? "/dashboard",
		});

		if (error) {
			setError(error.message ?? "An unexpected error occurred");
			setLoading(false);
			return;
		}

		if (data) {
			navigate({ to: redirect ?? "/dashboard" });
		} else {
			setError(
				"Please verify your email address before signing in. Check your inbox for the verification link.",
			);
			setLoading(false);
		}
	};

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card>
				<CardHeader>
					<CardTitle>Login to your account</CardTitle>
					<CardDescription>
						Enter your email below to login to your account
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
							<Field>
								<div className="flex items-center">
									<FieldLabel htmlFor="password">Password</FieldLabel>
									<Link
										to="/forgot-password"
										className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
									>
										Forgot your password?
									</Link>
								</div>
								<Input
									id="password"
									type="password"
									required
									value={password}
									onChange={(e) => setPassword(e.target.value)}
								/>
							</Field>
							{error && <p className="text-sm text-red-500">{error}</p>}
							<Field>
								<Button type="submit" disabled={loading}>
									{loading ? "Signing in..." : "Login"}
								</Button>
								<Button variant="outline" type="button">
									Login with Google
								</Button>
								<FieldDescription className="text-center">
									Don&apos;t have an account?{" "}
									<a
										href="/signup"
										onClick={(e) => {
											e.preventDefault();
											navigate({ to: "/signup" });
										}}
									>
										Sign up
									</a>
								</FieldDescription>
							</Field>
						</FieldGroup>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
