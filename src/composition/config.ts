import { z } from "zod";

const booleanFromEnvSchema = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const logLevelSchema = z.enum(["debug", "info", "warn", "error", "silent"]);

const rawConfigSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z
    .string()
    .url()
    .optional(),
  PRICING_BASE_URL: z
    .string()
    .url()
    .default("http://localhost:4000"),
  USE_INMEMORY: booleanFromEnvSchema.optional(),
  USE_MEMORY: booleanFromEnvSchema.optional(),
  USE_OUTBOX: booleanFromEnvSchema.optional(),
  LOG_LEVEL: logLevelSchema.optional(),
  PRICING_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  PORT: z
    .coerce
      .number()
      .int()
      .positive()
      .default(3000),
});

export const configSchema = rawConfigSchema.transform((env) => ({
  NODE_ENV: env.NODE_ENV,
  DATABASE_URL: env.DATABASE_URL,
  PRICING_BASE_URL: env.PRICING_BASE_URL,
  USE_INMEMORY:
    env.USE_INMEMORY ?? env.USE_MEMORY ?? (env.NODE_ENV !== "production"),
  USE_OUTBOX: env.USE_OUTBOX ?? (env.NODE_ENV === "production"),
  LOG_LEVEL:
    env.LOG_LEVEL ??
    (env.NODE_ENV === "development"
      ? "debug"
      : env.NODE_ENV === "test"
        ? "silent"
        : "info"),
  PRICING_TIMEOUT_MS:
    env.PRICING_TIMEOUT_MS ?? (env.NODE_ENV === "production" ? 1000 : 5000),
  PORT: env.PORT,
}));

export type Config = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return configSchema.parse(env);
}

export const config = loadConfig();
