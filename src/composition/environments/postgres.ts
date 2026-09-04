// src/composition/environments/postgres.ts
import type { ConcreteAppContext } from "#composition/ConcreteAppContext";
import type { Logger } from "#application/ports/Logger";
import {
  toMessagingOptions,
  toPinoLoggerOptions,
  toPostgresPoolOptions,
} from "#composition/adapterOptions";
import type { Config } from "#composition/config";
import { PostgresPoolFactory } from "#infrastructure/database/PostgresPoolFactory";
import { MessagingFactory } from "#infrastructure/messaging/MessagingFactory";
import { LoggerFactory } from "#infrastructure/observability/LoggerFactory";
import { PostgresOrderRepository } from "#infrastructure/persistence/postgres/PostgresOrderRepository";
import { PostgresUnitOfWork } from "#infrastructure/persistence/postgres/PostgresUnitOfWork";
import { InMemoryPriceProvider } from "#infrastructure/pricing/InMemoryPriceProvider";
import { SystemClock } from "#infrastructure/time/SystemClock";

export function buildPostgresAppContext(
  config: Config,
  logger: Logger = LoggerFactory.createLogger(toPinoLoggerOptions(config)),
): ConcreteAppContext {
  const pool = PostgresPoolFactory.createPool(
    toPostgresPoolOptions(config),
    logger.child({ operation: "database.pool" }),
  );
  const messagingFactory = new MessagingFactory(
    toMessagingOptions(config),
    logger.child({ operation: "messaging" }),
  );

  return {
    orderRepository: new PostgresOrderRepository(pool),
    unitOfWork: new PostgresUnitOfWork(pool, (client) =>
      messagingFactory.createEventBus(client),
    ),
    priceProvider: new InMemoryPriceProvider(),
    clock: new SystemClock(),
  };
}
