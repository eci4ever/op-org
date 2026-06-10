import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { getUserFirstOrganization } from "#/lib/auth.functions.ts";
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
	const [passkeyLoading, setPasskeyLoading] = useState(false);
	const [emailNotVerified, setEmailNotVerified] = useState(false);
	const [resendLoading, setResendLoading] = useState(false);
	const [resendSent, setResendSent] = useState(false);
	const [cooldown, setCooldown] = useState(0);

	useEffect(() => {
		if (cooldown <= 0) return;
		const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
		return () => clearInterval(timer);
	}, [cooldown]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setLoading(true);
		setEmailNotVerified(false);

		const { data, error } = await authClient.signIn.email({
			email,
			password,
		});

		if (error) {
			if (error.status === 403) {
				setEmailNotVerified(true);
				setError("Please verify your email before logging in.");
			} else {
				setError(error.message ?? "An unexpected error occurred");
			}
			setLoading(false);
			return;
		}

		if (data) {
			await trySetActiveOrg();
			navigate({ to: redirect ?? "/dashboard" });
		} else {
			setEmailNotVerified(true);
			setError(
				"Please verify your email before logging in.",
			);
			setLoading(false);
		}
	};

	const trySetActiveOrg = async () => {
		const org = await getUserFirstOrganization();
		if (org) {
			await authClient.organization.setActive({ organizationId: org.id });
		}
	};

	const handlePasskeySignIn = async () => {
		setPasskeyLoading(true);
		setError(null);

		const { data, error } = await authClient.signIn.passkey({
			autoFill: false,
		});

		if (error) {
			setError(error.message ?? "Passkey sign-in failed");
			setPasskeyLoading(false);
			return;
		}

		if (data) {
			await trySetActiveOrg();
			navigate({ to: redirect ?? "/dashboard" });
		}

		setPasskeyLoading(false);
	};

	const handleResendVerification = async () => {
		setResendLoading(true);

		const { error } = await authClient.sendVerificationEmail({
			email,
			callbackURL: "/email-verified",
		});

		if (error) {
			toast.error(error.message ?? "Failed to send verification email");
		} else {
			toast.success("Verification email sent");
			setResendSent(true);
			setCooldown(60);
		}

		setResendLoading(false);
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
							{emailNotVerified && !resendSent && (
								<Button
									variant="outline"
									type="button"
									disabled={resendLoading || cooldown > 0}
									onClick={handleResendVerification}
									className="w-full"
								>
									{resendLoading
										? "Sending..."
										: cooldown > 0
											? `Resend in ${cooldown}s`
											: "Resend verification email"}
								</Button>
							)}
							{resendSent && (
								<p className="text-sm text-green-600 text-center">
									Verification email sent. Check your inbox.{" "}
									{cooldown === 0 && (
										<button
											type="button"
											className="underline underline-offset-2 hover:text-green-700"
											disabled={resendLoading}
											onClick={handleResendVerification}
										>
											Send again
										</button>
									)}
								</p>
							)}
							<Field>
								<Button type="submit" disabled={loading}>
									{loading ? "Signing in..." : "Login"}
								</Button>
								<Button variant="outline" type="button">
									Login with Google
								</Button>
								<Button
									variant="outline"
									type="button"
									disabled={passkeyLoading}
									onClick={handlePasskeySignIn}
								>
									{passkeyLoading
										? "Checking..."
										: "Sign in with Passkey"}
								</Button>
								<FieldDescription className="text-center">
									Don&apos;t have an account?{" "}
									<Link
										to="/signup"
										onClick={(e) => {
											e.preventDefault();
											navigate({ to: "/signup" });
										}}
									>
										Sign up
									</Link>
								</FieldDescription>
							</Field>
						</FieldGroup>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
