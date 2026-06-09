import { createFileRoute } from "@tanstack/react-router";
import { ProtectedLayout } from "#/components/protected-layout";

export const Route = createFileRoute("/_protected/dashboard")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<ProtectedLayout breadcrumbs={[{ label: "Dashboard" }]}>
			<div className="grid auto-rows-min gap-4 md:grid-cols-3">
				<div className="aspect-video rounded-xl bg-muted/50" />
				<div className="aspect-video rounded-xl bg-muted/50" />
				<div className="aspect-video rounded-xl bg-muted/50" />
			</div>
			<div className="min-h-screen flex-1 rounded-xl bg-muted/50 md:min-h-min" />
		</ProtectedLayout>
	);
}
