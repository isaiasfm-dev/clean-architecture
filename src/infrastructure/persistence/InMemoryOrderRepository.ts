import type { OrderRepository } from "#application/ports/OrderRepository";
import type { Order } from "#domain/entities/Order";

export class InMemoryOrderRepository implements OrderRepository {
  private readonly orders = new Map<string, Order>();

  public async findById(id: string): Promise<Order | null> {
    return this.orders.get(id) ?? null;
  }

  public async save(order: Order): Promise<void> {
    this.orders.set(order.id, order);
  }
}
