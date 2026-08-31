import type { NoopDomainEventPublisher } from "#infrastructure/events/NoopDomainEventPublisher";
import type { InMemoryOrderRepository } from "#infrastructure/persistence/InMemoryOrderRepository";
import type { InMemoryPriceProvider } from "#infrastructure/pricing/InMemoryPriceProvider";
import type { SystemClock } from "#infrastructure/time/SystemClock";

export type InMemoryAppContext = {
  orderRepository: InMemoryOrderRepository;
  pricingService: InMemoryPriceProvider;
  eventBus: NoopDomainEventPublisher;
  clock: SystemClock;
};

export type ConcreteAppContext = InMemoryAppContext;
