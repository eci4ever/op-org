import { createFileRoute } from "@tanstack/react-router";
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

function RouteComponent() {
	const { data: session, isPending } = authClient.useSession();
	const [name, setName] = useState("");
	const [image, setImage] = useState("");
	const [profileSaved, setProfileSaved] = useState(false);
	const [profileError, setProfileError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [passwordChanged, setPasswordChanged] = useState(false);
	const [passwordError, setPasswordError] = useState<string | null>(null);
	const [changing, setChanging] = useState(false);

	useEffect(() => {
		if (session?.user) {
			setName(session.user.name);
			setImage(session.user.image ?? "");
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
			</div>
		</ProtectedLayout>
	);
}
