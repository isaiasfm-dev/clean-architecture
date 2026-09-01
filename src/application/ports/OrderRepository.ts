// src/application/ports/OrderRepository.ts
import type { Order } from "#domain/entities/Order";

export interface OrderRepository {
  findById(id: string): Promise<Order | null>;
  save(order: Order): Promise<void>;
}
