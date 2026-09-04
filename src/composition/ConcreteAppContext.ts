// src/composition/ConcreteAppContext.ts
import type { NoopDomainEventPublisher } from "#infrastructure/events/NoopDomainEventPublisher";
import type { InMemoryOrderRepository } from "#infrastructure/persistence/InMemoryOrderRepository";
import type { InMemoryUnitOfWork } from "#infrastructure/persistence/InMemoryUnitOfWork";
import type { PostgresOrderRepository } from "#infrastructure/persistence/postgres/PostgresOrderRepository";
import type { PostgresUnitOfWork } from "#infrastructure/persistence/postgres/PostgresUnitOfWork";
import type { InMemoryPriceProvider } from "#infrastructure/pricing/InMemoryPriceProvider";
import type { SystemClock } from "#infrastructure/time/SystemClock";

export type InMemoryAppContext = {
  orderRepository: InMemoryOrderRepository;
  unitOfWork: InMemoryUnitOfWork;
  priceProvider: InMemoryPriceProvider;
  eventBus: NoopDomainEventPublisher;
  clock: SystemClock;
};

export type PostgresAppContext = {
  orderRepository: PostgresOrderRepository;
  unitOfWork: PostgresUnitOfWork;
  priceProvider: InMemoryPriceProvider;
  clock: SystemClock;
};

export type ConcreteAppContext = InMemoryAppContext | PostgresAppContext;
