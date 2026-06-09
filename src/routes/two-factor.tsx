import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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

export const Route = createFileRoute("/two-factor")({
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = useNavigate();
	const [code, setCode] = useState("");
	const [trustDevice, setTrustDevice] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [useBackup, setUseBackup] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setLoading(true);

		if (useBackup) {
			const { data, error } = await authClient.twoFactor.verifyBackupCode({
				code,
			});

			if (error) {
				setError(error.message ?? "Invalid backup code");
				setLoading(false);
				return;
			}

			if (data) {
				navigate({ to: "/dashboard" });
			}
		} else {
			const { data, error } = await authClient.twoFactor.verifyTotp({
				code,
				trustDevice,
			});

			if (error) {
				setError(error.message ?? "Invalid code");
				setLoading(false);
				return;
			}

			if (data) {
				navigate({ to: "/dashboard" });
			}
		}
	};

	return (
		<div className="flex min-h-svh items-center justify-center p-8">
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle>Two-factor authentication</CardTitle>
					<CardDescription>
						{useBackup
							? "Enter a backup code to sign in."
							: "Enter the code from your authenticator app."}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit}>
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="code">
									{useBackup ? "Backup code" : "Authentication code"}
								</FieldLabel>
								<Input
									id="code"
									placeholder={useBackup ? "XXXXX-XXXXX" : "000000"}
									value={code}
									onChange={(e) => setCode(e.target.value)}
								/>
							</Field>
							{!useBackup && (
								<label className="flex items-center gap-2 text-sm">
									<input
										type="checkbox"
										checked={trustDevice}
										onChange={(e) => setTrustDevice(e.target.checked)}
										className="h-4 w-4 rounded border-gray-300"
									/>
									Trust this device for 30 days
								</label>
							)}
							{error && <p className="text-sm text-red-500">{error}</p>}
							<Button
								type="submit"
								disabled={loading || !code}
								className="w-full"
							>
								{loading
									? "Verifying..."
									: useBackup
										? "Verify backup code"
										: "Verify"}
							</Button>
							<button
								type="button"
								onClick={() => {
									setUseBackup(!useBackup);
									setCode("");
									setError(null);
								}}
								className="w-full text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
							>
								{useBackup
									? "Use authenticator app instead"
									: "Use a backup code instead"}
							</button>
						</FieldGroup>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
