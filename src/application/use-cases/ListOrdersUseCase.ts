// src/application/use-cases/ListOrdersUseCase.ts
import type { ListOrdersContext } from "#application/AppContext";
import type { ListOrdersOutputDto } from "#application/dtos/ListOrdersDto";
import type { ApplicationError } from "#application/errors/ApplicationErrors";
import { mapOrderToListedOrderDto } from "#application/mappers/OrderMappers";
import { ok, type Result } from "#shared/result";

/**
 * Caso de uso de consulta que lista los pedidos conocidos por el repositorio.
 *
 * No abre una unidad de trabajo explicita; delega la consistencia de lectura en
 * la implementacion concreta de `OrderRepository`. Un resultado correcto puede
 * contener una lista vacia.
 */
export class ListOrders {
  public constructor(private readonly context: ListOrdersContext) {}

  public async execute(): Promise<Result<ListOrdersOutputDto, ApplicationError>> {
    const orders = await this.context.orderRepository.findAll();

    return ok({
      orders: orders.map(mapOrderToListedOrderDto),
    });
  }
}
