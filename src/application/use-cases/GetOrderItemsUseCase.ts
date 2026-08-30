import type { GetOrderItemsInputDto, GetOrderItemsOutputDto } from "#application/dtos/GetOrderItemsDto";
import type { ApplicationError, ValidationError } from "#application/errors/ApplicationErrors";
import type { OrderRepository } from "#application/ports/OrderRepository";
import { fail, ok, type Result } from "#shared/result";

export class GetOrderItems {
  public constructor(private readonly repo: OrderRepository) {}

  public async execute(
    input: GetOrderItemsInputDto,
  ): Promise<Result<GetOrderItemsOutputDto, ApplicationError>> {
    const validationError = this.validate(input);

    if (validationError) {
      return fail(validationError);
    }

    const orderId = input.orderId.trim();
    const order = await this.repo.findById(orderId);

    if (!order) {
      return fail({
        type: "not_found",
        resource: "Order",
        id: orderId,
      });
    }

    return ok({
      orderId: order.id,
      items: order.itemsSnapshot().map((item) => ({
        sku: item.sku.value,
        quantity: item.quantity.value,
        unitPrice: {
          amount: item.price.amount,
          currency: item.price.currency,
        },
      })),
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
