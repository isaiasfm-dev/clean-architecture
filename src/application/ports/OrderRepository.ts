// src/application/ports/OrderRepository.ts
import type { Order } from "#domain/entities/Order";

/**
 * Puerto de persistencia de pedidos expresado en terminos del agregado de
 * dominio.
 *
 * Las implementaciones traducen entre su almacenamiento y `Order`; los casos de
 * uso no dependen de DTOs de base de datos ni de detalles transaccionales.
 */
export interface OrderRepository {
  findAll(): Promise<Order[]>;
  findById(id: string): Promise<Order | null>;
  findByCustomerId(customerId: string): Promise<Order[]>;
  save(order: Order): Promise<void>;
}
