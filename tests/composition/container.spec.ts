import { describe, expect, it } from "vitest";

import { buildAppContext } from "#composition/container";
import type { Config } from "#composition/config";
import { NoopDomainEventPublisher } from "#infrastructure/events/NoopDomainEventPublisher";
import { InMemoryOrderRepository } from "#infrastructure/persistence/InMemoryOrderRepository";
import { InMemoryPriceProvider } from "#infrastructure/pricing/InMemoryPriceProvider";
import { SystemClock } from "#infrastructure/time/SystemClock";

function config(overrides: Partial<Config> = {}): Config {
  return {
    NODE_ENV: "development",
    DATABASE_URL: "postgres://user:password@localhost:5432/orders",
    PRICING_BASE_URL: "http://localhost:4000",
    USE_INMEMORY: true,
    USE_OUTBOX: false,
    LOG_LEVEL: "debug",
    LOG_PRETTY: true,
    PRICING_TIMEOUT_MS: 5000,
    PORT: 3000,
    ...overrides,
  };
}

describe("buildAppContext", () => {
  it("uses in-memory adapters in development", () => {
    const context = buildAppContext(config({ NODE_ENV: "development" }));

    expect(context.orderRepository).toBeInstanceOf(InMemoryOrderRepository);
    expect(context.pricingService).toBeInstanceOf(InMemoryPriceProvider);
    expect(context.eventBus).toBeInstanceOf(NoopDomainEventPublisher);
    expect(context.clock).toBeInstanceOf(SystemClock);
  });

  it("uses in-memory adapters in test", () => {
    const context = buildAppContext(config({ NODE_ENV: "test" }));

    expect(context.orderRepository).toBeInstanceOf(InMemoryOrderRepository);
    expect(context.pricingService).toBeInstanceOf(InMemoryPriceProvider);
  });

  it("allows in-memory adapters in production when explicitly enabled without outbox", () => {
    const context = buildAppContext(
      config({ NODE_ENV: "production", USE_INMEMORY: true, USE_OUTBOX: false }),
    );

    expect(context.orderRepository).toBeInstanceOf(InMemoryOrderRepository);
    expect(context.pricingService).toBeInstanceOf(InMemoryPriceProvider);
  });

  it("rejects production without implemented external adapters", () => {
    expect(() =>
      buildAppContext(config({ NODE_ENV: "production", USE_INMEMORY: false })),
    ).toThrow("Production real app context is not implemented yet");
  });

  it("rejects development without in-memory adapters", () => {
    expect(() =>
      buildAppContext(config({ NODE_ENV: "development", USE_INMEMORY: false })),
    ).toThrow("Development without in-memory adapters is not implemented yet");
  });

  it("rejects test without in-memory adapters", () => {
    expect(() =>
      buildAppContext(config({ NODE_ENV: "test", USE_INMEMORY: false })),
    ).toThrow("Test database adapters are not implemented yet");
  });

  it("rejects outbox until a real implementation exists", () => {
    expect(() =>
      buildAppContext(config({ NODE_ENV: "development", USE_OUTBOX: true })),
    ).toThrow("Development outbox is not implemented yet");

    expect(() =>
      buildAppContext(config({ NODE_ENV: "test", USE_OUTBOX: true })),
    ).toThrow("Test outbox is not implemented yet");

    expect(() =>
      buildAppContext(
        config({ NODE_ENV: "production", USE_INMEMORY: true, USE_OUTBOX: true }),
      ),
    ).toThrow("Production outbox and dispatcher are not implemented yet");
  });
});
