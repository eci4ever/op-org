import { createFileRoute } from "@tanstack/react-router";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { ProtectedLayout } from "#/components/protected-layout";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/_protected/account")({
	component: RouteComponent,
});

type Session = {
	id: string;
	token: string;
	userId: string;
	expiresAt: Date;
	createdAt: Date;
	ipAddress?: string | null;
	userAgent?: string | null;
};

function RouteComponent() {
	const { data: session, isPending } = authClient.useSession();
	const [name, setName] = useState("");
	const [image, setImage] = useState("");
	const [profileSaved, setProfileSaved] = useState(false);
	const [profileError, setProfileError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	const [verificationSent, setVerificationSent] = useState(false);
	const [verificationSending, setVerificationSending] = useState(false);

	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [passwordChanged, setPasswordChanged] = useState(false);
	const [passwordError, setPasswordError] = useState<string | null>(null);
	const [changing, setChanging] = useState(false);

	const [sessions, setSessions] = useState<Session[]>([]);
	const [sessionsLoading, setSessionsLoading] = useState(false);
	const [revokingToken, setRevokingToken] = useState<string | null>(null);
	const [revokingOthers, setRevokingOthers] = useState(false);

	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [deletePassword, setDeletePassword] = useState("");
	const [deleteConfirmText, setDeleteConfirmText] = useState("");
	const [deleting, setDeleting] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);

	const [twoFactorStep, setTwoFactorStep] = useState<
		"idle" | "password" | "qr" | "verify" | "codes"
	>("idle");
	const [qrDataUrl, setQrDataUrl] = useState("");
	const [twoFactorCode, setTwoFactorCode] = useState("");
	const [backupCodes, setBackupCodes] = useState<string[]>([]);
	const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
	const [twoFactorLoading, setTwoFactorLoading] = useState(false);
	const [disablePassword, setDisablePassword] = useState("");
	const [setupPassword, setSetupPassword] = useState("");
	const [showDisableConfirm, setShowDisableConfirm] = useState(false);

	const [passkeyName, setPasskeyName] = useState("");
	const [addingPasskey, setAddingPasskey] = useState(false);
	const [deletingPasskeyId, setDeletingPasskeyId] = useState<string | null>(
		null,
	);
	const [passkeyError, setPasskeyError] = useState<string | null>(null);

	const { data: passkeys, refetch: refetchPasskeys } =
		authClient.useListPasskeys();

	const twoFactorEnabled = (session?.user as Record<string, unknown> | null)
		?.twoFactorEnabled as boolean | undefined;

	const currentSessionToken = session?.session?.token;

	useEffect(() => {
		if (session?.user) {
			setName(session.user.name);
			setImage(session.user.image ?? "");
		}
	}, [session]);

	useEffect(() => {
		if (session?.session?.token) {
			setSessionsLoading(true);
			authClient.listSessions().then(({ data }) => {
				setSessions(data ?? []);
				setSessionsLoading(false);
			});
		}
	}, [session]);

	if (isPending) {
		return (
			<ProtectedLayout
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard" },
					{ label: "Account" },
				]}
			>
				<div className="max-w-2xl" />
			</ProtectedLayout>
		);
	}

	const handleSendVerification = async () => {
		const userEmail = session?.user.email;
		if (!userEmail) return;

		setVerificationSending(true);
		setVerificationSent(false);

		const { error } = await authClient.sendVerificationEmail({
			email: userEmail,
			callbackURL: "/email-verified",
		});

		if (!error) {
			setVerificationSent(true);
		}

		setVerificationSending(false);
	};

	const handleProfileUpdate = async () => {
		setSaving(true);
		setProfileSaved(false);
		setProfileError(null);

		const { error } = await authClient.updateUser({ name, image });

		if (error) {
			setProfileError(error.message ?? "Failed to update profile");
		} else {
			setProfileSaved(true);
		}

		setSaving(false);
	};

	const handleRevokeSession = async (token: string) => {
		setRevokingToken(token);
		await authClient.revokeSession({ token });
		setSessions((prev) => prev.filter((s) => s.token !== token));
		setRevokingToken(null);
	};

	const handleRevokeOtherSessions = async () => {
		setRevokingOthers(true);
		await authClient.revokeOtherSessions();
		const { data } = await authClient.listSessions();
		setSessions(data ?? []);
		setRevokingOthers(false);
	};

	const handleDeleteAccount = async () => {
		if (deleteConfirmText !== "DELETE") return;

		setDeleting(true);
		setDeleteError(null);

		const { error } = await authClient.deleteUser({
			password: deletePassword,
			callbackURL: "/",
		});

		if (error) {
			setDeleteError(error.message ?? "Failed to delete account");
			setDeleting(false);
		}
	};

	const handleSetupTwoFactor = async () => {
		setSetupPassword("");
		setTwoFactorStep("password");
	};

	const handleGenerateTotpUri = async () => {
		if (!setupPassword) {
			setTwoFactorError("Password is required");
			return;
		}

		setTwoFactorLoading(true);
		setTwoFactorError(null);

		const { data, error } = await authClient.twoFactor.enable({
			password: setupPassword,
		});

		if (error) {
			setTwoFactorError(error.message ?? "Failed to set up two-factor");
			setTwoFactorLoading(false);
			return;
		}

		if (data?.totpURI) {
			const url = await QRCode.toDataURL(data.totpURI, {
				width: 200,
				margin: 2,
			});
			setQrDataUrl(url);
			setBackupCodes(data.backupCodes ?? []);
			setTwoFactorStep("qr");
		}

		setTwoFactorLoading(false);
	};

	const handleVerifyTwoFactor = async () => {
		setTwoFactorLoading(true);
		setTwoFactorError(null);

		const { data, error } = await authClient.twoFactor.verifyTotp({
			code: twoFactorCode,
		});

		if (error) {
			setTwoFactorError(error.message ?? "Invalid code");
			setTwoFactorLoading(false);
			return;
		}

		if (data) {
			setTwoFactorStep("codes");
		}

		setTwoFactorLoading(false);
	};

	const handleDisableTwoFactor = async () => {
		if (!disablePassword) {
			setTwoFactorError("Password is required");
			setTwoFactorLoading(false);
			return;
		}

		setTwoFactorLoading(true);
		setTwoFactorError(null);

		const { error } = await authClient.twoFactor.disable({
			password: disablePassword,
		});

		if (error) {
			setTwoFactorError(error.message ?? "Failed to disable two-factor");
			setTwoFactorLoading(false);
			return;
		}

		setShowDisableConfirm(false);
		setDisablePassword("");
		setTwoFactorStep("idle");
		setTwoFactorLoading(false);
	};

	const handleRegenerateBackupCodes = async () => {
		setTwoFactorLoading(true);
		const { data } = await authClient.twoFactor.generateBackupCodes({});
		setBackupCodes(data?.backupCodes ?? []);
		setTwoFactorStep("codes");
		setTwoFactorLoading(false);
	};

	const handleAddPasskey = async () => {
		setAddingPasskey(true);
		setPasskeyError(null);

		const { data, error } = await authClient.passkey.addPasskey({
			name: passkeyName || undefined,
		});

		if (error) {
			setPasskeyError(error.message ?? "Failed to register passkey");
			setAddingPasskey(false);
			return;
		}

		if (data) {
			setPasskeyName("");
			refetchPasskeys();
		}

		setAddingPasskey(false);
	};

	const handleDeletePasskey = async (id: string) => {
		setDeletingPasskeyId(id);
		setPasskeyError(null);

		try {
			const res = await fetch("/api/auth/passkey/delete-passkey", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id }),
			});
			const json = await res.json();

			if (!res.ok || json.error) {
				throw new Error(json.error?.message ?? "Failed to delete passkey");
			}

			refetchPasskeys();
		} catch (err) {
			setPasskeyError(
				err instanceof Error ? err.message : "Failed to delete passkey",
			);
		}

		setDeletingPasskeyId(null);
	};

	const handlePasswordChange = async () => {
		if (newPassword.length < 8) {
			setPasswordError("Password must be at least 8 characters");
			return;
		}

		setChanging(true);
		setPasswordChanged(false);
		setPasswordError(null);

		const { error } = await authClient.changePassword({
			currentPassword,
			newPassword,
		});

		if (error) {
			setPasswordError(error.message ?? "Failed to change password");
		} else {
			setPasswordChanged(true);
			setCurrentPassword("");
			setNewPassword("");
		}

		setChanging(false);
	};

	return (
		<ProtectedLayout
			breadcrumbs={[
				{ label: "Dashboard", href: "/dashboard" },
				{ label: "Account" },
			]}
		>
			<div className="max-w-2xl space-y-8">
				<Card>
					<CardHeader>
						<CardTitle>Profile</CardTitle>
						<CardDescription>Update your name and avatar</CardDescription>
					</CardHeader>
					<CardContent>
						<form
							onSubmit={(e) => {
								e.preventDefault();
								handleProfileUpdate();
							}}
						>
							<FieldGroup>
								<Field>
									<FieldLabel htmlFor="name">Name</FieldLabel>
									<Input
										id="name"
										value={name}
										onChange={(e) => setName(e.target.value)}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="image">Avatar URL</FieldLabel>
									<Input
										id="image"
										type="url"
										placeholder="https://example.com/avatar.jpg"
										value={image}
										onChange={(e) => setImage(e.target.value)}
									/>
								</Field>
								{profileError && (
									<p className="text-sm text-red-500">{profileError}</p>
								)}
								{profileSaved && (
									<p className="text-sm text-green-600">
										Profile updated successfully
									</p>
								)}
								<Button type="submit" disabled={saving}>
									{saving ? "Saving..." : "Save"}
								</Button>
							</FieldGroup>
						</form>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Email Verification</CardTitle>
						<CardDescription>
							Manage your email verification status
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium">Email</p>
								<p className="text-sm text-muted-foreground">
									{session?.user.email}
								</p>
							</div>
							<span
								className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${session?.user.emailVerified ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}
							>
								{session?.user.emailVerified ? "Verified" : "Not verified"}
							</span>
						</div>
						{!session?.user.emailVerified && (
							<Button
								onClick={handleSendVerification}
								disabled={verificationSending || verificationSent}
							>
								{verificationSending
									? "Sending..."
									: verificationSent
										? "Email sent"
										: "Send verification email"}
							</Button>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Password</CardTitle>
						<CardDescription>Change your password</CardDescription>
					</CardHeader>
					<CardContent>
						<form
							onSubmit={(e) => {
								e.preventDefault();
								handlePasswordChange();
							}}
						>
							<FieldGroup>
								<Field>
									<FieldLabel htmlFor="currentPassword">
										Current Password
									</FieldLabel>
									<Input
										id="currentPassword"
										type="password"
										value={currentPassword}
										onChange={(e) => setCurrentPassword(e.target.value)}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="newPassword">New Password</FieldLabel>
									<Input
										id="newPassword"
										type="password"
										value={newPassword}
										onChange={(e) => setNewPassword(e.target.value)}
									/>
								</Field>
								{passwordError && (
									<p className="text-sm text-red-500">{passwordError}</p>
								)}
								{passwordChanged && (
									<p className="text-sm text-green-600">
										Password changed successfully
									</p>
								)}
								<Button type="submit" disabled={changing}>
									{changing ? "Changing..." : "Change Password"}
								</Button>
							</FieldGroup>
						</form>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Sessions</CardTitle>
						<CardDescription>
							Manage your active sessions. Revoke any sessions you don't
							recognize.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{sessionsLoading ? (
							<p className="text-sm text-muted-foreground">
								Loading sessions...
							</p>
						) : sessions.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								No active sessions found.
							</p>
						) : (
							<div className="space-y-3">
								{sessions.map((s) => {
									const isCurrent = s.token === currentSessionToken;
									return (
										<div
											key={s.token}
											className="flex items-center justify-between rounded-lg border p-3"
										>
											<div className="space-y-1">
												<p className="text-sm font-medium">
													{s.userAgent ?? "Unknown device"}
												</p>
												<p className="text-xs text-muted-foreground">
													Created {new Date(s.createdAt).toLocaleDateString()}
													{s.ipAddress ? ` · ${s.ipAddress}` : ""}
												</p>
												{isCurrent && (
													<span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
														Current
													</span>
												)}
											</div>
											<Button
												variant="outline"
												size="sm"
												disabled={isCurrent || revokingToken === s.token}
												onClick={() => handleRevokeSession(s.token)}
											>
												{revokingToken === s.token ? "Revoking..." : "Revoke"}
											</Button>
										</div>
									);
								})}
							</div>
						)}
						{sessions.length > 1 && (
							<Button
								variant="destructive"
								size="sm"
								disabled={revokingOthers}
								onClick={handleRevokeOtherSessions}
							>
								{revokingOthers ? "Revoking..." : "Revoke all other sessions"}
							</Button>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Two-Factor Authentication</CardTitle>
						<CardDescription>
							Add an extra layer of security to your account using an
							authenticator app.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{twoFactorError && (
							<p className="text-sm text-red-500">{twoFactorError}</p>
						)}

						{twoFactorEnabled ? (
							<>
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium">Status</p>
										<p className="text-sm text-green-600">Enabled</p>
									</div>
									{showDisableConfirm ? (
										<div className="space-y-2">
											<Input
												type="password"
												placeholder="Enter your password"
												value={disablePassword}
												onChange={(e) => setDisablePassword(e.target.value)}
											/>
											<div className="flex gap-2">
												<Button
													variant="outline"
													size="sm"
													onClick={() => {
														setShowDisableConfirm(false);
														setDisablePassword("");
														setTwoFactorError(null);
													}}
												>
													Cancel
												</Button>
												<Button
													variant="destructive"
													size="sm"
													disabled={twoFactorLoading || !disablePassword}
													onClick={handleDisableTwoFactor}
												>
													{twoFactorLoading
														? "Disabling..."
														: "Confirm disable"}
												</Button>
											</div>
										</div>
									) : (
										<Button
											variant="outline"
											size="sm"
											onClick={() => setShowDisableConfirm(true)}
										>
											Disable
										</Button>
									)}
								</div>
								<Button
									variant="outline"
									size="sm"
									disabled={twoFactorLoading}
									onClick={handleRegenerateBackupCodes}
								>
									{twoFactorLoading
										? "Generating..."
										: "Regenerate backup codes"}
								</Button>
								{twoFactorStep === "codes" && backupCodes.length > 0 && (
									<div className="rounded-lg border bg-yellow-50 p-3">
										<p className="mb-2 text-sm font-medium text-yellow-800">
											Save these backup codes in a secure place. You won't be
											able to see them again.
										</p>
										<div className="space-y-1 font-mono text-sm">
											{backupCodes.map((code) => (
												<p key={code}>{code}</p>
											))}
										</div>
									</div>
								)}
							</>
						) : twoFactorStep === "qr" ? (
							<div className="space-y-4">
								<p className="text-sm text-muted-foreground">
									Scan this QR code with your authenticator app (e.g. Google
									Authenticator, Authy).
								</p>
								{qrDataUrl && (
									<div className="flex justify-center">
										<img
											src={qrDataUrl}
											alt="TOTP QR Code"
											className="rounded-lg"
										/>
									</div>
								)}
								<Field>
									<FieldLabel htmlFor="setup-code">
										Enter the 6-digit code from your authenticator app
									</FieldLabel>
									<Input
										id="setup-code"
										placeholder="000000"
										value={twoFactorCode}
										onChange={(e) => setTwoFactorCode(e.target.value)}
									/>
								</Field>
								<div className="flex gap-2">
								<Button
									variant="outline"
									onClick={() => {
										setTwoFactorStep("idle");
										setTwoFactorCode("");
										setTwoFactorError(null);
										setSetupPassword("");
									}}
								>
									Cancel
								</Button>
									<Button
										disabled={twoFactorLoading || twoFactorCode.length < 6}
										onClick={handleVerifyTwoFactor}
									>
										{twoFactorLoading ? "Verifying..." : "Verify"}
									</Button>
								</div>
							</div>
						) : twoFactorStep === "codes" && backupCodes.length > 0 ? (
							<div className="space-y-4">
								<div className="rounded-lg border bg-yellow-50 p-3">
									<p className="mb-2 text-sm font-medium text-yellow-800">
										Save these backup codes in a secure place. You won't be able
										to see them again.
									</p>
									<div className="space-y-1 font-mono text-sm">
										{backupCodes.map((code) => (
											<p key={code}>{code}</p>
										))}
									</div>
								</div>
								<Button onClick={() => setTwoFactorStep("idle")}>Done</Button>
							</div>
						) : twoFactorStep === "password" ? (
							<div className="space-y-4">
								<Field>
									<FieldLabel htmlFor="setup-password">
										Enter your password to continue
									</FieldLabel>
									<Input
										id="setup-password"
										type="password"
										placeholder="Password"
										value={setupPassword}
										onChange={(e) => setSetupPassword(e.target.value)}
									/>
								</Field>
								<div className="flex gap-2">
									<Button
										variant="outline"
										onClick={() => {
											setTwoFactorStep("idle");
											setSetupPassword("");
											setTwoFactorError(null);
										}}
									>
										Cancel
									</Button>
									<Button
										disabled={twoFactorLoading || !setupPassword}
										onClick={handleGenerateTotpUri}
									>
										{twoFactorLoading ? "Loading..." : "Continue"}
									</Button>
								</div>
							</div>
						) : (
							<Button
								disabled={twoFactorLoading}
								onClick={handleSetupTwoFactor}
							>
								{twoFactorLoading ? "Loading..." : "Set up two-factor"}
							</Button>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Passkeys</CardTitle>
						<CardDescription>
							Register a passkey to sign in quickly and securely without a
							password.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{passkeyError && (
							<p className="text-sm text-red-500">{passkeyError}</p>
						)}

						{passkeys && passkeys.length > 0 && (
							<div className="space-y-2">
								{passkeys.map((pk) => (
									<div
										key={pk.id}
										className="flex items-center justify-between rounded-lg border p-3"
									>
										<div className="space-y-1">
											<p className="text-sm font-medium">
												{pk.name ?? "Unnamed passkey"}
											</p>
											<p className="text-xs text-muted-foreground">
												{pk.backedUp
													? "Backed up"
													: "Not backed up"}
												{pk.createdAt
													? ` · Registered ${new Date(pk.createdAt).toLocaleDateString()}`
													: ""}
											</p>
										</div>
										<Button
											variant="destructive"
											size="sm"
											disabled={deletingPasskeyId === pk.id}
											onClick={() => handleDeletePasskey(pk.id)}
										>
											{deletingPasskeyId === pk.id ? "Removing..." : "Remove"}
										</Button>
									</div>
								))}
							</div>
						)}

						<div className="flex items-center gap-2">
							<Input
								placeholder="Passkey name (optional)"
								value={passkeyName}
								onChange={(e) => setPasskeyName(e.target.value)}
								className="flex-1"
							/>
							<Button
								disabled={addingPasskey}
								onClick={handleAddPasskey}
							>
								{addingPasskey ? "Registering..." : "Register passkey"}
							</Button>
						</div>
						{(!passkeys || passkeys.length === 0) && (
							<p className="text-sm text-muted-foreground">
								No passkeys registered yet. Add one above.
							</p>
						)}
					</CardContent>
				</Card>

				<Card className="border-red-200">
					<CardHeader>
						<CardTitle className="text-red-600">Danger Zone</CardTitle>
						<CardDescription>
							Once you delete your account, there is no going back. All your
							data will be permanently removed.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{!showDeleteConfirm ? (
							<Button
								variant="destructive"
								onClick={() => setShowDeleteConfirm(true)}
							>
								Delete Account
							</Button>
						) : (
							<div className="space-y-4 rounded-lg border border-red-200 bg-red-50 p-4">
								<p className="text-sm font-medium text-red-800">
									Are you absolutely sure?
								</p>
								<p className="text-sm text-red-600">
									This action cannot be undone. This will permanently delete
									your account and remove all associated data.
								</p>
								<FieldGroup>
									<Field>
										<FieldLabel htmlFor="delete-password">
											Enter your password
										</FieldLabel>
										<Input
											id="delete-password"
											type="password"
											value={deletePassword}
											onChange={(e) => setDeletePassword(e.target.value)}
										/>
									</Field>
									<Field>
										<FieldLabel htmlFor="delete-confirm">
											Type <span className="font-bold">DELETE</span> to confirm
										</FieldLabel>
										<Input
											id="delete-confirm"
											value={deleteConfirmText}
											onChange={(e) => setDeleteConfirmText(e.target.value)}
										/>
									</Field>
									{deleteError && (
										<p className="text-sm text-red-600">{deleteError}</p>
									)}
									<div className="flex gap-2">
										<Button
											variant="outline"
											onClick={() => {
												setShowDeleteConfirm(false);
												setDeletePassword("");
												setDeleteConfirmText("");
												setDeleteError(null);
											}}
										>
											Cancel
										</Button>
										<Button
											variant="destructive"
											disabled={
												deleting ||
												!deletePassword ||
												deleteConfirmText !== "DELETE"
											}
											onClick={handleDeleteAccount}
										>
											{deleting ? "Deleting..." : "Permanently delete account"}
										</Button>
									</div>
								</FieldGroup>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</ProtectedLayout>
	);
}
