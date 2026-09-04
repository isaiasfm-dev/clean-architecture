// src/composition/ConcreteAppContext.ts
import type { NoopDomainEventPublisher } from "#infrastructure/events/NoopDomainEventPublisher";
import type { InMemoryOrderRepository } from "#infrastructure/persistence/InMemoryOrderRepository";
import type { InMemoryUnitOfWork } from "#infrastructure/persistence/InMemoryUnitOfWork";
import type { PostgresOrderRepository } from "#infrastructure/persistence/postgres/PostgresOrderRepository";
import type { PostgresUnitOfWork } from "#infrastructure/persistence/postgres/PostgresUnitOfWork";
import type { InMemoryPriceProvider } from "#infrastructure/pricing/InMemoryPriceProvider";
import type { SystemClock } from "#infrastructure/time/SystemClock";

/**
 * Dependencias concretas usadas cuando la composicion selecciona adaptadores
 * en memoria.
 *
 * Incluye `eventBus` porque el `InMemoryUnitOfWork` recibe una instancia
 * compartida al construirse.
 */
export type InMemoryAppContext = {
  orderRepository: InMemoryOrderRepository;
  unitOfWork: InMemoryUnitOfWork;
  priceProvider: InMemoryPriceProvider;
  eventBus: NoopDomainEventPublisher;
  clock: SystemClock;
};

/**
 * Dependencias concretas usadas cuando la composicion selecciona PostgreSQL.
 *
 * A diferencia de `AppContext`, este tipo conserva las clases concretas que se
 * han ensamblado para el proceso.
 */
export type PostgresAppContext = {
  orderRepository: PostgresOrderRepository;
  unitOfWork: PostgresUnitOfWork;
  priceProvider: InMemoryPriceProvider;
  clock: SystemClock;
};

/**
 * Union de contextos concretos capaz de satisfacer los puertos que consumen los
 * casos de uso.
 */
export type ConcreteAppContext = InMemoryAppContext | PostgresAppContext;
