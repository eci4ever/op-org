import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import type { OrganizationInvitation } from "#/features/organizations/organization.functions";

type OrganizationInvitationsTableProps = {
	invitations: OrganizationInvitation[];
	onCancel: (invitationId: string) => void;
};

function roleBadgeVariant(role: string) {
	switch (role) {
		case "owner":
			return "default" as const;
		case "admin":
			return "secondary" as const;
		default:
			return "outline" as const;
	}
}

export function OrganizationInvitationsTable({
	invitations,
	onCancel,
}: OrganizationInvitationsTableProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Pending invitations</CardTitle>
				<CardDescription>
					{invitations.length} pending invitation
					{invitations.length !== 1 ? "s" : ""}
				</CardDescription>
			</CardHeader>
			<CardContent>
				{invitations.length > 0 ? (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Email</TableHead>
								<TableHead>Role</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Expires</TableHead>
								<TableHead className="w-20" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{invitations.map((invitation) => (
								<TableRow key={invitation.id}>
									<TableCell className="font-medium">
										{invitation.email}
									</TableCell>
									<TableCell>
										<Badge
											variant={roleBadgeVariant(invitation.role ?? "member")}
										>
											{invitation.role ?? "member"}
										</Badge>
									</TableCell>
									<TableCell className="capitalize">
										{invitation.status}
									</TableCell>
									<TableCell className="text-xs text-muted-foreground">
										{new Date(invitation.expiresAt).toLocaleDateString()}
									</TableCell>
									<TableCell>
										{invitation.status === "pending" && (
											<Button
												variant="ghost"
												size="sm"
												className="text-destructive"
												onClick={() => onCancel(invitation.id)}
											>
												Cancel
											</Button>
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				) : (
					<p className="text-sm text-muted-foreground">
						No pending invitations.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
