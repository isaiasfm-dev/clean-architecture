// src/application/use-cases/GetOrderItemsUseCase.ts
import type { GetOrderItemsContext } from "#application/AppContext";
import type { GetOrderItemsInputDto, GetOrderItemsOutputDto } from "#application/dtos/GetOrderItemsDto";
import type { ApplicationError, ValidationError } from "#application/errors/ApplicationErrors";
import { mapOrderToDto } from "#application/mappers/OrderMappers";
import { fail, ok, type Result } from "#shared/result";

/**
 * Caso de uso de consulta que devuelve las lineas de un pedido.
 *
 * Lee el agregado mediante `OrderRepository` y lo traduce a DTO sin abrir una
 * unidad de trabajo explicita. Un resultado correcto contiene las lineas y el
 * total presentado por la capa de aplicacion; un pedido inexistente se
 * representa como `not_found` en el `Result`.
 */
export class GetOrderItems {
  public constructor(private readonly context: GetOrderItemsContext) {}

  public async execute(
    input: GetOrderItemsInputDto,
  ): Promise<Result<GetOrderItemsOutputDto, ApplicationError>> {
    const validationError = this.validate(input);

    if (validationError) {
      return fail(validationError);
    }

    const orderId = input.orderId.trim();
    const order = await this.context.orderRepository.findById(orderId);

    if (!order) {
      return fail({
        type: "not_found",
        resource: "Order",
        id: orderId,
      });
    }

    const orderDto = mapOrderToDto(order);

    return ok({
      orderId: order.id,
      items: orderDto.items,
      totalPrice: orderDto.totalPrice,
    });
  }

  private validate(input: GetOrderItemsInputDto): ValidationError | null {
    if (input.orderId.trim()) {
      return null;
    }

    return {
      type: "validation",
      message: "Invalid get order items input",
      details: {
        orderId: "Order id is required",
      },
    };
  }
}
