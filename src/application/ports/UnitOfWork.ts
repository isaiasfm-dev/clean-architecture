// src/application/ports/UnitOfWork.ts
import type { DomainEventPublisher } from "#application/ports/DomainEventPublisher";
import type { OrderRepository } from "#application/ports/OrderRepository";

export type TransactionalAppContext = {
  readonly orderRepository: OrderRepository;
  readonly eventBus: DomainEventPublisher;
};

export interface UnitOfWork {
  run<T>(work: (context: TransactionalAppContext) => Promise<T>): Promise<T>;
}
