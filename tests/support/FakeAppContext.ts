import type { AppContext } from "#application/AppContext";
import type { Clock } from "#application/ports/Clock";
import type { DomainEventPublisher } from "#application/ports/DomainEventPublisher";
import type { PriceProvider } from "#application/ports/PriceProvider";
import type { DomainEvent } from "#domain/events/DomainEvent";
import type { Price } from "#domain/value-objects/Price";
import type { SKU } from "#domain/value-objects/SKU";
import { FakeOrderRepository } from "./FakeOrderRepository";

class FakeClock implements Clock {
  public now(): Date {
    return new Date("2026-08-30T10:00:00.000Z");
  }
}

class NullPriceProvider implements PriceProvider {
  public async getCurrentPrice(_sku: SKU, _requestedAt: Date): Promise<Price | null> {
    return null;
  }
}

class NoopEventBus implements DomainEventPublisher {
  public async publish(_events: DomainEvent[]): Promise<void> {
    return Promise.resolve();
  }
}

export function createFakeAppContext(overrides: Partial<AppContext> = {}): AppContext {
  return {
    orderRepository: new FakeOrderRepository(),
    pricingService: new NullPriceProvider(),
    eventBus: new NoopEventBus(),
    clock: new FakeClock(),
    ...overrides,
  };
}
