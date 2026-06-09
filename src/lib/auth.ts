import 'dotenv/config';
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, organization } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import db from "#/db";
import { makeEmailTemplate, sendEmail } from "#/server/email/email.service";
import * as schema from "@/db/schema";

export const auth = betterAuth({
	baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
	database: drizzleAdapter(db, {
		provider: "pg",
		schema,
	}),
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
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
		autoSignInAfterVerification: false,
	},
	plugins: [admin(), organization(), tanstackStartCookies()],
});
