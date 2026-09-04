// src/infrastructure/persistence/InMemoryUnitOfWork.ts
import type {
  TransactionalAppContext,
  UnitOfWork,
} from "#application/ports/UnitOfWork";
import { NoopDomainEventPublisher } from "#infrastructure/events/NoopDomainEventPublisher";
import type { InMemoryOrderRepository } from "#infrastructure/persistence/InMemoryOrderRepository";

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
