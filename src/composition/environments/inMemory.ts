// src/composition/environments/inMemory.ts
import type { ConcreteAppContext } from "#composition/ConcreteAppContext";
import { NoopDomainEventPublisher } from "#infrastructure/events/NoopDomainEventPublisher";
import { InMemoryOrderRepository } from "#infrastructure/persistence/InMemoryOrderRepository";
import { InMemoryPriceProvider } from "#infrastructure/pricing/InMemoryPriceProvider";
import { SystemClock } from "#infrastructure/time/SystemClock";

export function buildInMemoryAppContext(): ConcreteAppContext {
  return {
    orderRepository: new InMemoryOrderRepository(),
    pricingService: new InMemoryPriceProvider(),
    eventBus: new NoopDomainEventPublisher(),
    clock: new SystemClock(),
  };
}
