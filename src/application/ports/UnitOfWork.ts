// src/application/ports/UnitOfWork.ts
import type { DomainEventPublisher } from "#application/ports/DomainEventPublisher";
import type { OrderRepository } from "#application/ports/OrderRepository";

/**
 * Dependencias que un `UnitOfWork` entrega a la operacion que ejecuta.
 *
 * En PostgreSQL se crean con el mismo cliente transaccional; en memoria se
 * reutilizan las instancias configuradas y no existe rollback real.
 */
export type TransactionalAppContext = {
  readonly orderRepository: OrderRepository;
  readonly eventBus: DomainEventPublisher;
};

/**
 * Ejecuta una operacion con las dependencias que deben compartir frontera de
 * trabajo.
 *
 * La implementacion PostgreSQL confirma o revierte la transaccion alrededor de
 * la funcion recibida. La implementacion en memoria conserva la misma forma de
 * contrato, pero no proporciona aislamiento ni rollback.
 */
export interface UnitOfWork {
  run<T>(work: (context: TransactionalAppContext) => Promise<T>): Promise<T>;
}
