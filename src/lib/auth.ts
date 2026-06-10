import "dotenv/config";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, organization, twoFactor } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import db from "@/db";
import { makeEmailTemplate, sendEmail } from "#/server/email/email.service";
import * as schema from "@/db/schema";

export const auth = betterAuth({
	baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
	appName: "op-org",
	database: drizzleAdapter(db, {
		provider: "pg",
		schema,
	}),
	user: {
		deleteUser: {
			enabled: true,
		},
	},
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
		sendResetPassword: async ({ user, url }) => {
			const template = makeEmailTemplate("password-reset", {
				recipientName: user.name,
				actionUrl: url,
			});

			await sendEmail({ to: user.email, template });
		},
	},
	emailVerification: {
		sendVerificationEmail: async ({ user, url }) => {
			const template = makeEmailTemplate("email-verification", {
				recipientName: user.name,
				actionUrl: url,
			});

			await sendEmail({ to: user.email, template });
		},
		sendOnSignUp: true,
		autoSignInAfterVerification: true,
	},
	plugins: [
		admin(),
		organization({
			allowUserToCreateOrganization: async (user) => {
				return user.role === "admin";
			},
			invitationExpiresIn: 7 * 24 * 60 * 60,
			cancelPendingInvitationsOnReInvite: true,
			sendInvitationEmail: async ({ email, organization, inviter, id }) => {
				const inviteLink = `${process.env.BETTER_AUTH_URL ?? "http://localhost:3000"}/accept-invitation/${id}`;
				const template = makeEmailTemplate("organization-invitation", {
					recipientName: inviter.user.name,
					organizationName: organization.name,
					actionUrl: inviteLink,
				});

				await sendEmail({ to: email, template });
			},
		}),
		twoFactor(),
		passkey({
			rpID: new URL(
				process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
			).hostname,
			rpName: "op-org",
		}),
		tanstackStartCookies(),
	],
});
