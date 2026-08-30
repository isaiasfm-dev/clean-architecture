import type { OrderDomainEvent } from "#domain/entities/Order";

export interface EventBus {
  publish(events: OrderDomainEvent[]): Promise<void>;
}
