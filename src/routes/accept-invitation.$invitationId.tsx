import { cn } from "#/lib/utils";
import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/accept-invitation/$invitationId")({
	component: RouteComponent,
});

function RouteComponent() {
	const { invitationId } = Route.useParams();
	const navigate = useNavigate();
	const { data: session, isPending: authLoading } = authClient.useSession();
	const [accepting, setAccepting] = useState(false);
	const [acceptState, setAcceptState] = useState<
		| "idle"
		| "success"
		| "error"
		| "expired"
		| "already-member"
		| "email-mismatch"
	>("idle");
	const [message, setMessage] = useState("");

	useEffect(() => {
		if (authLoading || !session || accepting || acceptState !== "idle") return;

		const accept = async () => {
			setAccepting(true);
			const { error } = await authClient.organization.acceptInvitation({
				invitationId,
			});
			if (error) {
				const msg = error.message ?? "";
				if (msg.toLowerCase().includes("expired")) {
					setAcceptState("expired");
					setMessage("This invitation has expired. Ask the inviter to send a new one.");
				} else if (
					msg.toLowerCase().includes("already") &&
					msg.toLowerCase().includes("member")
				) {
					setAcceptState("already-member");
					setMessage("You are already a member of this organization.");
				} else if (msg.toLowerCase().includes("email")) {
					setAcceptState("email-mismatch");
					setMessage(msg);
				} else {
					setAcceptState("error");
					setMessage(msg);
				}
				setAccepting(false);
				return;
			}
			setAcceptState("success");
			setMessage("You have joined the organization!");
			setAccepting(false);
			toast.success("Invitation accepted");
			setTimeout(() => navigate({ to: "/organization" }), 1500);
		};
		accept();
	}, [session, authLoading, invitationId, navigate, accepting, acceptState]);

	const redirectTo = `/accept-invitation/${invitationId}`;

	if (authLoading) {
		return (
			<div className="flex min-h-svh items-center justify-center p-8">
				<p className="text-muted-foreground">Loading...</p>
			</div>
		);
	}

	if (acceptState === "success") {
		return (
			<div className="flex min-h-svh items-center justify-center p-8">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<div className="flex justify-center">
							<div className="flex size-16 items-center justify-center rounded-full bg-muted">
								<span className="text-3xl">✓</span>
							</div>
						</div>
						<CardTitle>Invitation accepted!</CardTitle>
						<CardDescription>{message}</CardDescription>
					</CardHeader>
					<CardFooter className="justify-center">
						<Button asChild>
							<a href="/organization">Go to organization</a>
						</Button>
					</CardFooter>
				</Card>
			</div>
		);
	}

	if (acceptState === "already-member") {
		return (
			<div className="flex min-h-svh items-center justify-center p-8">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<CardTitle>Already a member</CardTitle>
						<CardDescription>{message}</CardDescription>
					</CardHeader>
					<CardFooter className="justify-center">
						<Button asChild>
							<a href="/organization">Go to organization</a>
						</Button>
					</CardFooter>
				</Card>
			</div>
		);
	}

	if (acceptState === "expired" || acceptState === "error") {
		return (
			<div className="flex min-h-svh items-center justify-center p-8">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<div className="flex justify-center">
							<div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
								<span className="text-3xl text-destructive">!</span>
							</div>
						</div>
						<CardTitle>Unable to accept invitation</CardTitle>
						<CardDescription>{message}</CardDescription>
					</CardHeader>
					<CardFooter className="justify-center">
						<Button variant="outline" asChild>
							<a href="/dashboard">Go to Dashboard</a>
						</Button>
					</CardFooter>
				</Card>
			</div>
		);
	}

	if (acceptState === "email-mismatch") {
		return (
			<div className="flex min-h-svh items-center justify-center p-8">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<div className="flex justify-center">
							<div className="flex size-16 items-center justify-center rounded-full bg-muted">
								<span className="text-3xl text-muted-foreground">!</span>
							</div>
						</div>
						<CardTitle>Email mismatch</CardTitle>
						<CardDescription>
							{message}
						</CardDescription>
					</CardHeader>
					<CardFooter className="flex justify-center gap-3">
						<Button
							variant="outline"
							onClick={() => authClient.signOut()}
						>
							Switch account
						</Button>
						<Button asChild>
							<a href="/dashboard">Dashboard</a>
						</Button>
					</CardFooter>
				</Card>
			</div>
		);
	}

	if (session && !accepting) {
		return (
			<div className="flex min-h-svh items-center justify-center p-8">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<CardTitle>Accepting invitation...</CardTitle>
						<CardDescription>
							Please wait while we process your invitation.
						</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	if (accepting) {
		return (
			<div className="flex min-h-svh items-center justify-center p-8">
				<p className="text-muted-foreground">Accepting invitation...</p>
			</div>
		);
	}

	return (
		<div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
			<div className="w-full max-w-sm">
				<Link
					to="/"
					className="mb-6 inline-block text-sm text-muted-foreground transition-colors hover:text-foreground"
				>
					← Back to home
				</Link>
				<Card>
					<CardHeader className="text-center">
						<div className="flex justify-center">
							<div className="flex size-16 items-center justify-center rounded-full bg-muted">
								<span className="text-3xl">✉</span>
							</div>
						</div>
						<CardTitle>You're invited!</CardTitle>
						<CardDescription>
							You have been invited to join an organization. Sign in or create
							an account to accept.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-3">
						<Button asChild className="w-full">
							<a href={`/login?redirect=${encodeURIComponent(redirectTo)}`}>
								Sign in
							</a>
						</Button>
						<Button variant="outline" asChild className="w-full">
							<a href={`/signup?redirect=${encodeURIComponent(redirectTo)}`}>
								Create an account
							</a>
						</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
