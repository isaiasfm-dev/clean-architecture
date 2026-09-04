// src/composition/config.ts
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv({ quiet: true });

const booleanFromEnvSchema = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const logLevelSchema = z.enum(["debug", "info", "warn", "error", "silent"]);
const outboxWorkerModeSchema = z.enum(["once", "loop"]);

const rawConfigSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z
    .string()
    .url()
    .optional(),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().optional(),
  DATABASE_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  DATABASE_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  PRICING_BASE_URL: z
    .string()
    .url()
    .default("http://localhost:4000"),
  USE_INMEMORY: booleanFromEnvSchema.optional(),
  USE_MEMORY: booleanFromEnvSchema.optional(),
  USE_OUTBOX: booleanFromEnvSchema.optional(),
  OUTBOX_WORKER_MODE: outboxWorkerModeSchema.optional(),
  OUTBOX_POLL_INTERVAL_MS: z.coerce.number().int().positive().optional(),
  OUTBOX_BATCH_SIZE: z.coerce.number().int().positive().optional(),
  LOG_LEVEL: logLevelSchema.optional(),
  LOG_PRETTY: booleanFromEnvSchema.optional(),
  PRICING_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  PORT: z
    .coerce
      .number()
      .int()
      .positive()
      .default(3000),
});

/**
 * Configuracion normalizada que decide defaults de entorno y seleccion de
 * adaptadores.
 *
 * `USE_INMEMORY` tiene prioridad sobre `USE_MEMORY`; `USE_MEMORY` se conserva
 * como alias de compatibilidad. Si ninguno esta definido, los entornos
 * `development` y `test` usan memoria y `production` usa PostgreSQL.
 * `USE_OUTBOX` sigue la misma idea de defaults por entorno, activandose solo
 * en `production` salvo configuracion explicita.
 */
export const configSchema = rawConfigSchema.transform((env) => ({
  NODE_ENV: env.NODE_ENV,
  DATABASE_URL: env.DATABASE_URL,
  DATABASE_POOL_MAX: env.DATABASE_POOL_MAX ?? 10,
  DATABASE_IDLE_TIMEOUT_MS: env.DATABASE_IDLE_TIMEOUT_MS ?? 30_000,
  DATABASE_CONNECTION_TIMEOUT_MS: env.DATABASE_CONNECTION_TIMEOUT_MS ?? 2_000,
  PRICING_BASE_URL: env.PRICING_BASE_URL,
  USE_INMEMORY:
    env.USE_INMEMORY ?? env.USE_MEMORY ?? (env.NODE_ENV !== "production"),
  USE_OUTBOX: env.USE_OUTBOX ?? (env.NODE_ENV === "production"),
  OUTBOX_WORKER_MODE: env.OUTBOX_WORKER_MODE ?? "once",
  OUTBOX_POLL_INTERVAL_MS: env.OUTBOX_POLL_INTERVAL_MS ?? 5000,
  OUTBOX_BATCH_SIZE: env.OUTBOX_BATCH_SIZE ?? 100,
  LOG_LEVEL:
    env.LOG_LEVEL ??
    (env.NODE_ENV === "development"
      ? "debug"
      : env.NODE_ENV === "test"
        ? "silent"
        : "info"),
  LOG_PRETTY: env.LOG_PRETTY ?? (env.NODE_ENV === "development"),
  PRICING_TIMEOUT_MS:
    env.PRICING_TIMEOUT_MS ?? (env.NODE_ENV === "production" ? 1000 : 5000),
  PORT: env.PORT,
}));

export type Config = z.infer<typeof configSchema>;

/**
 * Carga y valida variables de entorno en la forma consumida por composicion.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return configSchema.parse(env);
}

/**
 * Obtiene la URL requerida por los adaptadores PostgreSQL.
 *
 * Separar esta comprobacion permite que la configuracion en memoria siga siendo
 * valida aunque no exista `DATABASE_URL`.
 */
export function getDatabaseUrl(config: Config): string {
  if (!config.DATABASE_URL) {
    throw new Error("DATABASE_URL is required when using PostgreSQL.");
  }

  return config.DATABASE_URL;
}

export const config = loadConfig();
