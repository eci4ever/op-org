import { UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import type {
	AdminUser,
	AdminUserSession,
} from "#/features/admin-users/admin-users.types";

type CreateAdminUserInput = {
	name: string;
	email: string;
	password: string;
	role: "user" | "admin";
};

type CreateAdminUserDialogProps = {
	open: boolean;
	creating: boolean;
	onOpenChange: (open: boolean) => void;
	onCreate: (input: CreateAdminUserInput) => void;
};

export function CreateAdminUserDialog({
	open,
	creating,
	onOpenChange,
	onCreate,
}: CreateAdminUserDialogProps) {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [role, setRole] = useState<"user" | "admin">("user");

	useEffect(() => {
		if (!open) {
			setName("");
			setEmail("");
			setPassword("");
			setRole("user");
		}
	}, [open]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogTrigger asChild>
				<Button>
					<UserPlus data-icon="inline-start" />
					Create User
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create User</DialogTitle>
					<DialogDescription>Add a new user to the platform.</DialogDescription>
				</DialogHeader>
				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="create-name">Name</FieldLabel>
						<Input
							id="create-name"
							value={name}
							onChange={(event) => setName(event.target.value)}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="create-email">Email</FieldLabel>
						<Input
							id="create-email"
							type="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="create-password">Password</FieldLabel>
						<Input
							id="create-password"
							type="password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="create-role">Role</FieldLabel>
						<Select
							value={role}
							onValueChange={(value) => setRole(value as "user" | "admin")}
						>
							<SelectTrigger id="create-role">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="user">User</SelectItem>
								<SelectItem value="admin">Admin</SelectItem>
							</SelectContent>
						</Select>
					</Field>
				</FieldGroup>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						disabled={creating}
						onClick={() => onCreate({ name, email, password, role })}
					>
						{creating ? "Creating..." : "Create"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

type AdminUserSessionsDialogProps = {
	user: AdminUser | null;
	sessions: AdminUserSession[];
	loading: boolean;
	revokingSessionToken: string | null;
	revokingAll: boolean;
	currentUserId: string;
	onOpenChange: (open: boolean) => void;
	onRevokeSession: (session: AdminUserSession) => void;
	onRevokeAllSessions: (userId: string) => void;
};

export function AdminUserSessionsDialog({
	user,
	sessions,
	loading,
	revokingSessionToken,
	revokingAll,
	currentUserId,
	onOpenChange,
	onRevokeSession,
	onRevokeAllSessions,
}: AdminUserSessionsDialogProps) {
	return (
		<Dialog open={!!user} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Sessions — {user?.name ?? "User"}</DialogTitle>
					<DialogDescription>
						{loading
							? "Loading sessions..."
							: sessions.length === 1
								? "1 active session"
								: `${sessions.length} active sessions`}
					</DialogDescription>
				</DialogHeader>
				{loading ? (
					<p className="py-8 text-center text-sm text-muted-foreground">
						Loading sessions...
					</p>
				) : sessions.length === 0 ? (
					<p className="py-8 text-center text-sm text-muted-foreground">
						No active sessions.
					</p>
				) : (
					<div className="flex flex-col gap-3">
						{sessions.map((session) => (
							<div
								key={session.id}
								className="flex items-center justify-between rounded-lg border p-3"
							>
								<div className="flex flex-col gap-1">
									<p className="text-sm font-medium">
										{session.userAgent ?? "Unknown device"}
									</p>
									<p className="text-xs text-muted-foreground">
										Created {new Date(session.createdAt).toLocaleDateString()}
										{session.ipAddress ? ` · ${session.ipAddress}` : ""}
									</p>
									{session.impersonatedBy && (
										<Badge variant="secondary">Impersonated</Badge>
									)}
								</div>
								<Button
									variant="outline"
									size="sm"
									disabled={
										revokingSessionToken === session.token ||
										session.userId === currentUserId
									}
									onClick={() => onRevokeSession(session)}
								>
									{revokingSessionToken === session.token
										? "Revoking..."
										: session.userId === currentUserId
											? "Current"
											: "Revoke"}
								</Button>
							</div>
						))}
					</div>
				)}
				<DialogFooter>
					{sessions.length > 1 && user?.id !== currentUserId && (
						<Button
							variant="destructive"
							disabled={revokingAll || loading}
							onClick={() => user && onRevokeAllSessions(user.id)}
						>
							{revokingAll ? "Revoking all..." : "Revoke all sessions"}
						</Button>
					)}
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

type BanAdminUserDialogProps = {
	user: AdminUser | null;
	banning: boolean;
	onBan: (input: {
		userId: string;
		banReason?: string;
		banExpiresIn?: number;
	}) => void;
	onCancel: () => void;
};

export function BanAdminUserDialog({
	user,
	banning,
	onBan,
	onCancel,
}: BanAdminUserDialogProps) {
	const [banReason, setBanReason] = useState("");
	const [banExpiresIn, setBanExpiresIn] = useState("");

	if (!user) return null;

	return (
		<Dialog open onOpenChange={onCancel}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Ban User</DialogTitle>
					<DialogDescription>
						{user.name} will be banned from the platform.
					</DialogDescription>
				</DialogHeader>
				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="ban-reason">Reason (optional)</FieldLabel>
						<Input
							id="ban-reason"
							value={banReason}
							onChange={(event) => setBanReason(event.target.value)}
							placeholder="Spamming"
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="ban-expires">
							Expires in seconds (optional)
						</FieldLabel>
						<Input
							id="ban-expires"
							type="number"
							value={banExpiresIn}
							onChange={(event) => setBanExpiresIn(event.target.value)}
							placeholder="604800 (7 days)"
						/>
					</Field>
				</FieldGroup>
				<DialogFooter>
					<Button variant="outline" onClick={onCancel}>
						Cancel
					</Button>
					<Button
						variant="destructive"
						disabled={banning}
						onClick={() =>
							onBan({
								userId: user.id,
								banReason: banReason || undefined,
								banExpiresIn: banExpiresIn ? Number(banExpiresIn) : undefined,
							})
						}
					>
						{banning ? "Banning..." : "Ban"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

type DeleteAdminUserDialogProps = {
	user: AdminUser | null;
	deleting: boolean;
	onDelete: (userId: string) => void;
	onCancel: () => void;
};

export function DeleteAdminUserDialog({
	user,
	deleting,
	onDelete,
	onCancel,
}: DeleteAdminUserDialogProps) {
	if (!user) return null;

	return (
		<Dialog open onOpenChange={onCancel}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete User</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete {user.name}? This action cannot be
						undone.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={onCancel}>
						Cancel
					</Button>
					<Button
						variant="destructive"
						disabled={deleting}
						onClick={() => onDelete(user.id)}
					>
						{deleting ? "Deleting..." : "Delete"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
