import type { EventBus } from "#application/ports/EventBus";
import type { OrderDomainEvent } from "#domain/entities/Order";

export class NoopEventBus implements EventBus {
  public readonly published: OrderDomainEvent[] = [];

  public async publish(events: OrderDomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}
