import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { Resend } from "resend";
import { getDb } from "../db/client.js";
import * as schema from "../db/schema/index.js";

type AuthEnvSource = {
  AUTH_FROM_EMAIL?: string;
  BETTER_AUTH_APP_NAME?: string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  RESEND_API_KEY?: string;
  ZERO_UPSTREAM_DB?: string;
};

type ResolvedAuthEnv = {
  appName: string;
  baseURL: string;
  fromEmail: string;
  githubClientID: string;
  githubClientSecret: string;
  resendAPIKey: string;
  secret: string;
  zeroUpstreamDB: string;
};

const DEFAULTS: ResolvedAuthEnv = {
  appName: "Napro Zero",
  baseURL: "http://localhost:5173",
  fromEmail: "auth@example.com",
  githubClientID: "github-client-id",
  githubClientSecret: "github-client-secret",
  resendAPIKey: "resend-api-key",
  secret: "development-only-better-auth-secret-123456",
  zeroUpstreamDB: "postgres://postgres:postgres@127.0.0.1:5432/postgres",
};

function getValue(
  env: AuthEnvSource,
  key: keyof AuthEnvSource,
  fallback: string,
  allowDefaults: boolean
): string {
  const value = env[key];
  if (value) {
    return value;
  }
  if (allowDefaults) {
    return fallback;
  }
  throw new Error(`required env var ${key}`);
}

function resolveAuthEnv(
  env: AuthEnvSource,
  allowDefaults: boolean
): ResolvedAuthEnv {
  return {
    appName: getValue(
      env,
      "BETTER_AUTH_APP_NAME",
      DEFAULTS.appName,
      allowDefaults
    ),
    baseURL: getValue(env, "BETTER_AUTH_URL", DEFAULTS.baseURL, allowDefaults),
    fromEmail: getValue(env, "AUTH_FROM_EMAIL", DEFAULTS.fromEmail, allowDefaults),
    githubClientID: getValue(
      env,
      "GITHUB_CLIENT_ID",
      DEFAULTS.githubClientID,
      allowDefaults
    ),
    githubClientSecret: getValue(
      env,
      "GITHUB_CLIENT_SECRET",
      DEFAULTS.githubClientSecret,
      allowDefaults
    ),
    resendAPIKey: getValue(
      env,
      "RESEND_API_KEY",
      DEFAULTS.resendAPIKey,
      allowDefaults
    ),
    secret: getValue(
      env,
      "BETTER_AUTH_SECRET",
      DEFAULTS.secret,
      allowDefaults
    ),
    zeroUpstreamDB: getValue(
      env,
      "ZERO_UPSTREAM_DB",
      DEFAULTS.zeroUpstreamDB,
      allowDefaults
    ),
  };
}

export function createAuth(env: AuthEnvSource, allowDefaults = false) {
  const resolved = resolveAuthEnv(env, allowDefaults);
  const resend = new Resend(resolved.resendAPIKey);

  return betterAuth({
    appName: resolved.appName,
    baseURL: resolved.baseURL,
    secret: resolved.secret,
    database: drizzleAdapter(getDb({ ZERO_UPSTREAM_DB: resolved.zeroUpstreamDB }, true), {
      provider: "pg",
      schema,
    }),
    trustedOrigins: [resolved.baseURL],
    advanced: {
      useSecureCookies: resolved.baseURL.startsWith("https://"),
    },
    socialProviders: {
      github: {
        clientId: resolved.githubClientID,
        clientSecret: resolved.githubClientSecret,
      },
    },
    plugins: [
      magicLink({
        disableSignUp: false,
        sendMagicLink: async ({ email, url }) => {
          await resend.emails.send({
            from: resolved.fromEmail,
            to: email,
            subject: `Sign in to ${resolved.appName}`,
            html: `<p>Use the link below to sign in to ${resolved.appName}.</p><p><a href="${url}">${url}</a></p>`,
          });
        },
      }),
      passkey(),
    ],
  });
}

export const auth = createAuth(process.env as AuthEnvSource, true);

export type Auth = ReturnType<typeof createAuth>;
export type AuthSession = NonNullable<Awaited<ReturnType<Auth["api"]["getSession"]>>>;
