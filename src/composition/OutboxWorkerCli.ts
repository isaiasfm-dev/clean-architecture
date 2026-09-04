// src/composition/OutboxWorkerCli.ts
import { config } from "#composition/config";
import {
  toMessagingOptions,
  toPinoLoggerOptions,
  toPostgresPoolOptions,
} from "#composition/adapterOptions";
import { PostgresPoolFactory } from "#infrastructure/database/PostgresPoolFactory";
import { MessagingFactory } from "#infrastructure/messaging/MessagingFactory";
import { LoggerFactory } from "#infrastructure/observability/LoggerFactory";

/**
 * Punto de entrada separado del servidor HTTP para procesar eventos pendientes
 * del outbox.
 *
 * Si `USE_OUTBOX` esta desactivado, registra la situacion y termina. Si esta
 * activo, construye el dispatcher y ejecuta el worker en el modo configurado
 * (`once` o `loop`). Las senales de parada solicitan detener el worker y el
 * bloque `finally` libera el pool PostgreSQL.
 */
async function runOutboxWorkerCli(): Promise<void> {
  const logger = LoggerFactory.createLogger(toPinoLoggerOptions(config)).child({
    operation: "outbox.worker",
  });

  if (!config.USE_OUTBOX) {
    logger.info("outbox worker disabled");

    return;
  }

  const pool = PostgresPoolFactory.createPool(
    toPostgresPoolOptions(config),
    logger.child({ operation: "database.pool" }),
  );
  const messagingFactory = new MessagingFactory(toMessagingOptions(config), logger);
  const dispatcher = messagingFactory.createOutboxDispatcher(pool);
  const worker = messagingFactory.createOutboxWorker(dispatcher);
  const stop = () => {
    worker.stop();
  };

  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  try {
    await worker.run();
  } finally {
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
    await PostgresPoolFactory.closePool();
  }
}

await runOutboxWorkerCli();
