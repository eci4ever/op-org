import { UserMinus } from "lucide-react";
import { cn } from "#/lib/utils";
import { Avatar, AvatarFallback } from "#/components/ui/avatar";
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
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import type { OrganizationMember } from "#/features/organizations/organization.functions";

type OrganizationMembersTableProps = {
	members: OrganizationMember[];
	memberRole: string;
	isPlatformAdmin: boolean;
	changingRole: string | null;
	removing: string | null;
	transferOpen: boolean;
	transferTarget: string | null;
	transferring: boolean;
	onTransferOpenChange: (open: boolean) => void;
	onTransferTargetChange: (memberId: string | null) => void;
	onRoleChange: (memberId: string, role: string) => void;
	onRemove: (memberIdOrEmail: string) => void;
	onTransfer: () => void;
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

function initials(name: string) {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

export function OrganizationMembersTable({
	members,
	memberRole,
	isPlatformAdmin,
	changingRole,
	removing,
	transferOpen,
	transferTarget,
	transferring,
	onTransferOpenChange,
	onTransferTargetChange,
	onRoleChange,
	onRemove,
	onTransfer,
}: OrganizationMembersTableProps) {
	const canManageMembers = memberRole === "owner" || isPlatformAdmin;
	const transferableMembers = members.filter(
		(member) => member.role !== "owner",
	);

	return (
		<>
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="text-base">Members</CardTitle>
							<CardDescription>
								{members.length} member{members.length !== 1 ? "s" : ""}
							</CardDescription>
						</div>
						{canManageMembers && members.length > 1 && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => onTransferOpenChange(true)}
							>
								Transfer ownership
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Member</TableHead>
								<TableHead>Role</TableHead>
								<TableHead className="w-40">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{members.map((member) => {
								const isOwner = member.role === "owner";

								return (
									<TableRow key={member.id}>
										<TableCell>
											<div className="flex items-center gap-3">
												<Avatar className="size-8">
													<AvatarFallback>
														{initials(
															member.user.name ?? member.user.email ?? "?",
														)}
													</AvatarFallback>
												</Avatar>
												<div>
													<p className="text-sm font-medium">
														{member.user.name ?? member.user.email}
													</p>
													{member.user.name && (
														<p className="text-xs text-muted-foreground">
															{member.user.email}
														</p>
													)}
												</div>
											</div>
										</TableCell>
										<TableCell>
											{isOwner ? (
												<Badge variant={roleBadgeVariant("owner")}>owner</Badge>
											) : canManageMembers ? (
												<Select
													value={member.role}
													onValueChange={(role) =>
														onRoleChange(member.id, role)
													}
													disabled={changingRole === member.id}
												>
													<SelectTrigger className="h-7 w-28 text-xs">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="admin">admin</SelectItem>
														<SelectItem value="member">member</SelectItem>
													</SelectContent>
												</Select>
											) : (
												<Badge variant={roleBadgeVariant(member.role)}>
													{member.role}
												</Badge>
											)}
										</TableCell>
										<TableCell>
											{!isOwner && canManageMembers && (
												<Button
													variant="ghost"
													size="sm"
													className="text-destructive"
													disabled={removing === member.id}
													onClick={() => onRemove(member.id)}
												>
													<UserMinus />
												</Button>
											)}
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			<Dialog open={transferOpen} onOpenChange={onTransferOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Transfer ownership</DialogTitle>
						<DialogDescription>
							Select a member to become the new owner. You will be demoted to
							admin.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-3">
						{transferableMembers.map((member) => (
							<label
								key={member.id}
								className={cn("flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted", transferTarget === member.id && "border-primary bg-muted")}
							>
								<input
									type="radio"
									name="transfer"
									value={member.id}
									checked={transferTarget === member.id}
									onChange={() => onTransferTargetChange(member.id)}
									className="size-4 accent-primary"
								/>
								<Avatar className="size-8">
									<AvatarFallback>
										{initials(member.user.name ?? member.user.email ?? "?")}
									</AvatarFallback>
								</Avatar>
								<div>
									<p className="text-sm font-medium">
										{member.user.name ?? member.user.email}
									</p>
									{member.user.name && (
										<p className="text-xs text-muted-foreground">
											{member.user.email}
										</p>
									)}
								</div>
							</label>
						))}
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => onTransferOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							disabled={!transferTarget || transferring}
							onClick={onTransfer}
						>
							{transferring ? "Transferring..." : "Transfer ownership"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
