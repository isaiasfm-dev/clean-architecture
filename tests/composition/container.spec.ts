import { afterEach, describe, expect, it } from "vitest";

import { buildAppContext } from "#composition/container";
import type { Config } from "#composition/config";
import { PostgresPoolFactory } from "#infrastructure/database/PostgresPoolFactory";
import { NoopDomainEventPublisher } from "#infrastructure/events/NoopDomainEventPublisher";
import { InMemoryOrderRepository } from "#infrastructure/persistence/InMemoryOrderRepository";
import { InMemoryUnitOfWork } from "#infrastructure/persistence/InMemoryUnitOfWork";
import { PostgresOrderRepository } from "#infrastructure/persistence/postgres/PostgresOrderRepository";
import { PostgresUnitOfWork } from "#infrastructure/persistence/postgres/PostgresUnitOfWork";
import { InMemoryPriceProvider } from "#infrastructure/pricing/InMemoryPriceProvider";
import { SystemClock } from "#infrastructure/time/SystemClock";

function config(overrides: Partial<Config> = {}): Config {
  return {
    NODE_ENV: "development",
    DATABASE_URL: "postgres://user:password@localhost:5432/orders",
    DATABASE_POOL_MAX: 10,
    DATABASE_IDLE_TIMEOUT_MS: 30000,
    DATABASE_CONNECTION_TIMEOUT_MS: 2000,
    PRICING_BASE_URL: "http://localhost:4000",
    USE_INMEMORY: true,
    USE_OUTBOX: false,
    OUTBOX_WORKER_MODE: "once",
    OUTBOX_POLL_INTERVAL_MS: 5000,
    OUTBOX_BATCH_SIZE: 100,
    LOG_LEVEL: "debug",
    LOG_PRETTY: true,
    PRICING_TIMEOUT_MS: 5000,
    PORT: 3000,
    ...overrides,
  };
}

describe("buildAppContext", () => {
  afterEach(async () => {
    await PostgresPoolFactory.closePool();
  });

  it("uses in-memory adapters in development", () => {
    const context = buildAppContext(config({ NODE_ENV: "development" }));

    expect(context.orderRepository).toBeInstanceOf(InMemoryOrderRepository);
    expect(context.unitOfWork).toBeInstanceOf(InMemoryUnitOfWork);
    expect(context.priceProvider).toBeInstanceOf(InMemoryPriceProvider);
    expect(context.eventBus).toBeInstanceOf(NoopDomainEventPublisher);
    expect(context.clock).toBeInstanceOf(SystemClock);
  });

  it("uses in-memory adapters in test", () => {
    const context = buildAppContext(config({ NODE_ENV: "test" }));

    expect(context.orderRepository).toBeInstanceOf(InMemoryOrderRepository);
    expect(context.unitOfWork).toBeInstanceOf(InMemoryUnitOfWork);
    expect(context.priceProvider).toBeInstanceOf(InMemoryPriceProvider);
  });

  it("allows in-memory adapters in production when explicitly enabled without outbox", () => {
    const context = buildAppContext(
      config({ NODE_ENV: "production", USE_INMEMORY: true, USE_OUTBOX: false }),
    );

    expect(context.orderRepository).toBeInstanceOf(InMemoryOrderRepository);
    expect(context.unitOfWork).toBeInstanceOf(InMemoryUnitOfWork);
    expect(context.priceProvider).toBeInstanceOf(InMemoryPriceProvider);
  });

  it("uses postgres adapters when in-memory is disabled", () => {
    const context = buildAppContext(
      config({ NODE_ENV: "development", USE_INMEMORY: false, USE_OUTBOX: false }),
    );

    expect(context.orderRepository).toBeInstanceOf(PostgresOrderRepository);
    expect(context.unitOfWork).toBeInstanceOf(PostgresUnitOfWork);
    expect(context.priceProvider).toBeInstanceOf(InMemoryPriceProvider);
    expect(context.clock).toBeInstanceOf(SystemClock);
  });

  it("allows postgres with outbox enabled", () => {
    const context = buildAppContext(
      config({ NODE_ENV: "production", USE_INMEMORY: false, USE_OUTBOX: true }),
    );

    expect(context.orderRepository).toBeInstanceOf(PostgresOrderRepository);
    expect(context.unitOfWork).toBeInstanceOf(PostgresUnitOfWork);
  });

  it("requires database url when in-memory is disabled", () => {
    expect(() =>
      buildAppContext(
        config({
          NODE_ENV: "production",
          DATABASE_URL: undefined,
          USE_INMEMORY: false,
        }),
      ),
    ).toThrow("DATABASE_URL is required when using PostgreSQL.");
  });
});
