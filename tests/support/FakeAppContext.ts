import type { AppContext } from "#application/AppContext";
import type { Clock } from "#application/ports/Clock";
import type { DomainEventPublisher } from "#application/ports/DomainEventPublisher";
import type { PriceProvider } from "#application/ports/PriceProvider";
import type {
  TransactionalAppContext,
  UnitOfWork,
} from "#application/ports/UnitOfWork";
import type { DomainEvent } from "#domain/events/DomainEvent";
import type { Price } from "#domain/value-objects/Price";
import type { SKU } from "#domain/value-objects/SKU";
import { ok, type Result } from "#shared/result";
import { FakeOrderRepository } from "./FakeOrderRepository.js";

type FakeAppContextOverrides = Partial<AppContext> & {
  eventBus?: DomainEventPublisher;
};

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
  public async publish(_events: DomainEvent[]): Promise<Result<void, never>> {
    return ok(undefined);
  }
}

class FakeUnitOfWork implements UnitOfWork {
  public constructor(private readonly context: TransactionalAppContext) {}

  public async run<T>(work: (context: TransactionalAppContext) => Promise<T>): Promise<T> {
    return work(this.context);
  }
}

export function createFakeAppContext(overrides: FakeAppContextOverrides = {}): AppContext {
  const orderRepository = overrides.orderRepository ?? new FakeOrderRepository();
  const eventBus = overrides.eventBus ?? new NoopEventBus();

  return {
    orderRepository,
    unitOfWork: overrides.unitOfWork ?? new FakeUnitOfWork({ orderRepository, eventBus }),
    priceProvider: new NullPriceProvider(),
    clock: new FakeClock(),
    ...overrides,
  };
}
