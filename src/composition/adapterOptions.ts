// src/composition/adapterOptions.ts
import type { Config } from "#composition/config";
import { getDatabaseUrl } from "#composition/config";
import type { PostgresPoolOptions } from "#infrastructure/database/PostgresPoolFactory";
import type { MessagingOptions } from "#infrastructure/messaging/MessagingFactory";
import type { PinoLoggerFactoryOptions } from "#infrastructure/observability/LoggerFactory";

export function toPostgresPoolOptions(config: Config): PostgresPoolOptions {
  return {
    connectionString: getDatabaseUrl(config),
    max: config.DATABASE_POOL_MAX,
    idleTimeoutMillis: config.DATABASE_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: config.DATABASE_CONNECTION_TIMEOUT_MS,
  };
}

export function toMessagingOptions(config: Config): MessagingOptions {
  return {
    useOutbox: config.USE_OUTBOX,
    outboxBatchSize: config.OUTBOX_BATCH_SIZE,
    outboxWorkerMode: config.OUTBOX_WORKER_MODE,
    outboxPollIntervalMs: config.OUTBOX_POLL_INTERVAL_MS,
  };
}

export function toPinoLoggerOptions(config: Config): PinoLoggerFactoryOptions {
  return {
    level: config.LOG_LEVEL,
    pretty: config.LOG_PRETTY,
  };
}
