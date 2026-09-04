// src/composition/environments/inMemory.ts
import type { ConcreteAppContext } from "#composition/ConcreteAppContext";
import { NoopDomainEventPublisher } from "#infrastructure/events/NoopDomainEventPublisher";
import { InMemoryOrderRepository } from "#infrastructure/persistence/InMemoryOrderRepository";
import { InMemoryUnitOfWork } from "#infrastructure/persistence/InMemoryUnitOfWork";
import { InMemoryPriceProvider } from "#infrastructure/pricing/InMemoryPriceProvider";
import { SystemClock } from "#infrastructure/time/SystemClock";

/**
 * Ensambla el contexto usado cuando `USE_INMEMORY` esta activo.
 *
 * La persistencia y la unidad de trabajo comparten el mismo repositorio en
 * memoria; los eventos se entregan a un publicador no operativo.
 */
export function buildInMemoryAppContext(): ConcreteAppContext {
  const orderRepository = new InMemoryOrderRepository();
  const eventBus = new NoopDomainEventPublisher();

  return {
    orderRepository,
    unitOfWork: new InMemoryUnitOfWork(orderRepository, eventBus),
    priceProvider: new InMemoryPriceProvider(),
    eventBus,
    clock: new SystemClock(),
  };
}
