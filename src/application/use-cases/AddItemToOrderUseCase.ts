// src/application/use-cases/AddItemToOrderUseCase.ts
import type { AddItemToOrderContext } from "#application/AppContext";
import type { AddItemToOrderInputDto, AddItemToOrderOutputDto } from "#application/dtos/AddItemToOrderDto";
import type { ApplicationError, ValidationError } from "#application/errors/ApplicationErrors";
import { InvalidPrice, InvalidQuantity } from "#domain/errors/DomainErrors";
import { Quantity } from "#domain/value-objects/Quantity";
import { SKU } from "#domain/value-objects/SKU";
import { fail, ok, type Result } from "#shared/result";

export class AddItemToOrder {
  public constructor(private readonly context: AddItemToOrderContext) {}

  public async execute(
    input: AddItemToOrderInputDto,
  ): Promise<Result<AddItemToOrderOutputDto, ApplicationError>> {
    const validationError = this.validate(input);

    if (validationError) {
      return fail(validationError);
    }

    const orderId = input.orderId.trim();
    const sku = SKU.create(input.sku.trim());
    const quantity = Quantity.create(input.quantity);
    const requestedAt = this.context.clock.now();

    const order = await this.context.orderRepository.findById(orderId);

    if (!order) {
      return fail({
        type: "not_found",
        resource: "Order",
        id: orderId,
      });
    }

    const price = await this.context.pricingService.getCurrentPrice(sku, requestedAt);

    if (!price) {
      return fail({
        type: "not_found",
        resource: "Price",
        id: sku.value,
      });
    }

    try {
      order.addItem(sku, price, quantity);
    } catch (error) {
      if (error instanceof InvalidPrice || error instanceof InvalidQuantity) {
        return fail({
          type: "validation",
          message: error.message,
        });
      }

      throw error;
    }

    await this.context.orderRepository.save(order);
    await this.context.eventBus.publish(order.pullDomainEvents());

    const totalPrice = price.multiply(quantity.value);

    return ok({
      orderId: order.id,
      sku: sku.value,
      quantity: quantity.value,
      unitPrice: {
        amount: price.amount,
        currency: price.currency,
      },
      totalPrice: {
        amount: totalPrice.amount,
        currency: totalPrice.currency,
      },
      addedAt: requestedAt.toISOString(),
    });
  }

  private validate(input: AddItemToOrderInputDto): ValidationError | null {
    const details: Record<string, string> = {};

    if (!input.orderId.trim()) {
      details.orderId = "Order id is required";
    }

    if (!input.sku.trim()) {
      details.sku = "SKU is required";
    }

    if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
      details.quantity = "Quantity must be a positive integer";
    }

    if (Object.keys(details).length === 0) {
      return null;
    }

    return {
      type: "validation",
      message: "Invalid add item to order input",
      details,
    };
  }
}
