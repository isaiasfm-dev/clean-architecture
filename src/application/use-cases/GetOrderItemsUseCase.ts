// src/application/use-cases/GetOrderItemsUseCase.ts
import type { GetOrderItemsContext } from "#application/AppContext";
import type { GetOrderItemsInputDto, GetOrderItemsOutputDto } from "#application/dtos/GetOrderItemsDto";
import type { ApplicationError, ValidationError } from "#application/errors/ApplicationErrors";
import { fail, ok, type Result } from "#shared/result";

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

    const orderItems = order.itemsSnapshot();
    const orderTotal = orderItems.length > 0 ? order.total() : null;

    return ok({
      orderId: order.id,
      items: orderItems.map((item) => {
        const itemTotal = item.price.multiply(item.quantity.value);

        return {
          sku: item.sku.value,
          quantity: item.quantity.value,
          unitPrice: {
            amount: item.price.amount,
            currency: item.price.currency,
          },
          totalPrice: {
            amount: itemTotal.amount,
            currency: itemTotal.currency,
          },
        };
      }),
      totalPrice: orderTotal
        ? {
            amount: orderTotal.amount,
            currency: orderTotal.currency,
          }
        : {
            amount: 0,
            currency: "EUR",
          },
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
