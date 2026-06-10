import { createFileRoute } from "@tanstack/react-router";
import { ProtectedLayout } from "#/components/protected-layout";
import { authClient } from "#/lib/auth-client";
import { Badge } from "#/components/ui/badge";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";

export const Route = createFileRoute("/_protected/dashboard")({
	component: RouteComponent,
});

function roleVariant(role: string | null | undefined) {
	switch (role) {
		case "admin":
			return "admin" as const;
		default:
			return "secondary" as const;
	}
}

function RouteComponent() {
	const { data: session } = authClient.useSession();
	const role = session?.user?.role;
	const name = session?.user?.name;

	return (
		<ProtectedLayout breadcrumbs={[{ label: "Dashboard" }]}>
			<Card>
				<CardHeader>
					<div className="flex items-center gap-3">
						<CardTitle>Welcome back{name ? `, ${name}` : ""}</CardTitle>
						{role && <Badge variant={roleVariant(role)}>{role}</Badge>}
					</div>
					<CardDescription>{session?.user?.email}</CardDescription>
				</CardHeader>
			</Card>
			<div className="grid auto-rows-min gap-4 md:grid-cols-3">
				<div className="aspect-video rounded-xl bg-muted/50" />
				<div className="aspect-video rounded-xl bg-muted/50" />
				<div className="aspect-video rounded-xl bg-muted/50" />
			</div>
			<div className="min-h-screen flex-1 rounded-xl bg-muted/50 md:min-h-min" />
		</ProtectedLayout>
	);
}
