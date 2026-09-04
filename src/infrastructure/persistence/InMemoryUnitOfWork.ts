// src/infrastructure/persistence/InMemoryUnitOfWork.ts
import type {
  TransactionalAppContext,
  UnitOfWork,
} from "#application/ports/UnitOfWork";
import { NoopDomainEventPublisher } from "#infrastructure/events/NoopDomainEventPublisher";
import type { InMemoryOrderRepository } from "#infrastructure/persistence/InMemoryOrderRepository";

/**
 * Unidad de trabajo para la composicion en memoria.
 *
 * En esta implementacion la transaccion es solo el limite de ejecucion que
 * entrega el repositorio y el publicador configurados al caso de uso. No crea
 * snapshots ni restaura estado si `work` falla.
 */
export class InMemoryUnitOfWork implements UnitOfWork {
  public constructor(
    private readonly orderRepository: InMemoryOrderRepository,
    private readonly eventBus = new NoopDomainEventPublisher(),
  ) {}

  public async run<T>(work: (context: TransactionalAppContext) => Promise<T>): Promise<T> {
    return work({
      orderRepository: this.orderRepository,
      eventBus: this.eventBus,
    });
  }
}
