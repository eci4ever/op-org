import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { ProtectedLayout } from "#/components/protected-layout";
import { Badge } from "#/components/ui/badge";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";

const protectedRoute = getRouteApi("/_protected");

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
	const { user } = protectedRoute.useLoaderData();
	const role = user.role;
	const name = user.name;

	return (
		<ProtectedLayout breadcrumbs={[{ label: "Dashboard" }]}>
			<Card>
				<CardHeader>
					<div className="flex items-center gap-3">
						<CardTitle>Welcome back{name ? `, ${name}` : ""}</CardTitle>
						{role && <Badge variant={roleVariant(role)}>{role}</Badge>}
					</div>
					<CardDescription>{user.email}</CardDescription>
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
