import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const seconds = z.coerce.number().int().positive();
const hasDuplicates = (values: string[]) => new Set(values).size !== values.length;

const keySchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
  secret: z.string().min(32),
  activatedAt: seconds,
  lastIssuedAt: seconds.optional(),
  acceptUntil: seconds.optional(),
});

const env = z
  .object({
    PORT: seconds.default(5000),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    MONGO_URI: z.string().min(1),
    SUBSCRIPTION_PAYMENT_INSTRUCTIONS: z.string().trim().max(4000).default(''),
    REDIS_URI: z.string().min(1),
    APP_ID: z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .default('urt'),
    AUTH_NAMESPACE: z
      .string()
      .regex(/^[a-zA-Z0-9_-]+$/)
      .default('v2'),
    CSRF_NAMESPACE: z
      .string()
      .regex(/^[a-zA-Z0-9_-]+$/)
      .default('v2'),
    ACCESS_KEYS: z.string(),
    REFRESH_KEYS: z.string(),
    SESSION_KEYS: z.string(),
    JWT_SIGNING_VERSIONS: z.string().default('[{"id":"v1","issuer":"urt","audience":"urt-web"}]'),
    JWT_SIGNING_VERSION: z.string().default('v1'),
    ACCESS_TTL: seconds.default(900),
    REFRESH_TTL: seconds.default(2592000),
    SESSION_TTL: seconds.default(7776000),
    CSRF_TTL: seconds.default(86400),
    REFRESH_GRACE: seconds.max(60).default(10),
    CLOCK_SKEW: z.coerce.number().int().min(0).max(60).default(5),
    KEY_ROTATION_DAYS: seconds.default(90),
    COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    COOKIE_SECURE: z.enum(['true', 'false']).optional(),
    ALLOWED_ORIGINS: z.string().default('http://localhost:5173,http://localhost:3000'),
    TRUST_PROXY: z.string().default('false'),
    MAIL_ENABLED: z.enum(['true', 'false']).default('false'),
    R2_ACCOUNT_ID: z.string().trim().regex(/^[a-f0-9]{32}$/).or(z.literal('')).default(''),
    R2_ACCESS_KEY_ID: z.string().trim().default(''),
    R2_SECRET_ACCESS_KEY: z.string().trim().default(''),
    R2_BUCKET_NAME: z.string().trim().default(''),
    GOOGLE_CLIENT_ID: z
      .string()
      .trim()
      .refine((value) => !value || /^\d+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(value), {
        message: 'GOOGLE_CLIENT_ID must be a Google OAuth web client ID',
      })
      .default(''),
  })
  .parse(process.env);

const parseKeys = (value: string) => {
  const keys = z.array(keySchema).min(1).max(5).parse(JSON.parse(value));
  const now = Math.floor(Date.now() / 1000);
  if (
    new Set(keys.map((key) => key.id)).size !== keys.length ||
    keys[0].activatedAt > now ||
    keys[0].lastIssuedAt ||
    keys[0].acceptUntil ||
    keys
      .slice(1)
      .some(
        (key) =>
          !key.lastIssuedAt ||
          !key.acceptUntil ||
          key.lastIssuedAt < key.activatedAt ||
          key.acceptUntil <= key.lastIssuedAt,
      )
  ) {
    throw new Error('Invalid signing key lifecycle');
  }
  return keys;
};

const accessKeys = parseKeys(env.ACCESS_KEYS);
const refreshKeys = parseKeys(env.REFRESH_KEYS);
const sessionKeys = parseKeys(env.SESSION_KEYS);
for (const [keys, lifetime] of [
  [accessKeys, env.ACCESS_TTL],
  [refreshKeys, env.REFRESH_TTL],
  [sessionKeys, env.CSRF_TTL],
] as const) {
  if (
    keys.slice(1).some((key) => key.acceptUntil! < key.lastIssuedAt! + lifetime + env.CLOCK_SKEW)
  ) {
    throw new Error('Retained keys must cover the maximum signed lifetime and clock skew');
  }
}

const allKeys = [...accessKeys, ...refreshKeys, ...sessionKeys];
if (hasDuplicates(allKeys.map((key) => key.secret))) {
  throw new Error('Signing keys must use independent secrets');
}

const signingVersionSchema = z.object({
  id: z.string().min(1),
  issuer: z.string().min(1),
  audience: z.string().min(1),
});
const versions = z
  .array(signingVersionSchema)
  .min(1)
  .max(5)
  .parse(JSON.parse(env.JWT_SIGNING_VERSIONS));

const versionIds = versions.map((version) => version.id);
if (!versionIds.includes(env.JWT_SIGNING_VERSION) || hasDuplicates(versionIds)) {
  throw new Error('Invalid signing version configuration');
}

const secure = env.COOKIE_SECURE ? env.COOKIE_SECURE === 'true' : env.NODE_ENV === 'production';
if ((env.NODE_ENV === 'production' || env.COOKIE_SAME_SITE === 'none') && !secure) {
  throw new Error('Production and SameSite=None cookies require HTTPS');
}

const origins = env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim());
if (
  origins.some(
    (origin) =>
      new URL(origin).origin !== origin ||
      (env.NODE_ENV === 'production' && !origin.startsWith('https://')),
  )
) {
  throw new Error('Configure explicit frontend origins');
}

const trustProxy =
  env.TRUST_PROXY === 'false' ? false : env.TRUST_PROXY.split(',').map((ip) => ip.trim());

const requiredMail = (key: string): string => {
  const value = process.env[key] || '';
  if (env.MAIL_ENABLED === 'true' && !value) {
    throw new Error(`Missing ${key}`);
  }
  return value;
};

const prefix = `${env.APP_ID}:${env.NODE_ENV}`;
const cookiePrefix = `${env.NODE_ENV === 'production' ? '__Host-' : ''}${env.APP_ID}-${env.NODE_ENV}`;

const r2Values = [env.R2_ACCOUNT_ID, env.R2_ACCESS_KEY_ID, env.R2_SECRET_ACCESS_KEY, env.R2_BUCKET_NAME];
if (r2Values.some(Boolean) && !r2Values.every(Boolean)) {
  throw new Error('Configure all four R2 environment variables together');
}

export const config = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  mongoUri: env.MONGO_URI,
  subscriptionPaymentInstructions: env.SUBSCRIPTION_PAYMENT_INSTRUCTIONS,
  redisUri: env.REDIS_URI,
  prefix,
  trustProxy,
  allowedOrigins: origins,
  google: { clientId: env.GOOGLE_CLIENT_ID },
  r2: {
    accountId: env.R2_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    bucketName: env.R2_BUCKET_NAME,
  },
  auth: {
    namespace: `${prefix}:auth:${env.AUTH_NAMESPACE}:sessions`,
    csrfNamespace: `${prefix}:csrf:${env.CSRF_NAMESPACE}:`,
    accessKeys,
    refreshKeys,
    sessionKeys,
    versions,
    signingVersion: env.JWT_SIGNING_VERSION,
    accessTTL: env.ACCESS_TTL,
    refreshTTL: env.REFRESH_TTL,
    sessionTTL: env.SESSION_TTL,
    csrfTTL: env.CSRF_TTL,
    grace: env.REFRESH_GRACE,
    clockSkew: env.CLOCK_SKEW,
    rotationDays: env.KEY_ROTATION_DAYS,
  },
  cookies: {
    refreshName: `${cookiePrefix}-refresh`,
    sessionName: `${cookiePrefix}-csrf-session`,
    options: { httpOnly: true, secure, sameSite: env.COOKIE_SAME_SITE, path: '/' },
  },
  smtp: {
    enabled: env.MAIL_ENABLED === 'true',
    host: requiredMail('SMTP_HOST'),
    port: z.coerce
      .number()
      .int()
      .min(1)
      .max(65535)
      .parse(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    user: requiredMail('SMTP_USER'),
    pass: requiredMail('SMTP_PASS'),
    from: requiredMail('SMTP_FROM'),
  },
};
