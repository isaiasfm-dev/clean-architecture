// src/infrastructure/persistence/InMemoryOrderRepository.ts
import type { OrderRepository } from "#application/ports/OrderRepository";
import type { Order } from "#domain/entities/Order";

/**
 * Implementacion en memoria del puerto `OrderRepository`.
 *
 * Almacena las mismas instancias de agregado que recibe en `save`; las lecturas
 * no clonan ni rehidratan el pedido. Esta semantica la diferencia del adaptador
 * PostgreSQL y la limita al ciclo de vida del proceso que la construye.
 */
export class InMemoryOrderRepository implements OrderRepository {
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
