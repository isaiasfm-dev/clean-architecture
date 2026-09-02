import type { OrderRepository } from "#application/ports/OrderRepository";
import type { Order } from "#domain/entities/Order";

export class FakeOrderRepository implements OrderRepository {
  private readonly orders = new Map<string, Order>();

  public async findAll(): Promise<Order[]> {
    return [...this.orders.values()];
  }

  public async findById(id: string): Promise<Order | null> {
    return this.orders.get(id) ?? null;
  }

  public async findByCustomerId(customerId: string): Promise<Order[]> {
    return [...this.orders.values()].filter((order) => order.customerId === customerId);
  }

  public async save(order: Order): Promise<void> {
    this.orders.set(order.id, order);
  }
}
