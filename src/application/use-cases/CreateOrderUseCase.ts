import type { OrderRepository } from "#application/ports/OrderRepository";
import type {
  CreateOrderInputDto,
  CreateOrderOutputDto,
} from "#application/dtos/CreateOrderDto";
import type { ApplicationError, ValidationError } from "#application/errors/ApplicationErrors";
import { CustomerId, Order, OrderId } from "#domain/entities/Order";
import { fail, ok, type Result } from "#shared/result";

export class CreateOrder {
  public constructor(private readonly repo: OrderRepository) {}

  public async execute(
    input: CreateOrderInputDto,
  ): Promise<Result<CreateOrderOutputDto, ApplicationError>> {
    const validationError = this.validate(input);

    if (validationError) {
      return fail(validationError);
    }

    const exists = await this.repo.findById(input.orderId);

    if (exists) {
      return fail({
        type: "conflict",
        message: "Order already exists",
      });
    }

    const order = Order.create(OrderId(input.orderId), CustomerId(input.customerId));

    await this.repo.save(order);

    return ok({
      orderId: order.id,
    });
  }

  private validate(input: CreateOrderInputDto): ValidationError | null {
    const details: Record<string, string> = {};

    if (!input.orderId.trim()) {
      details.orderId = "Order id is required";
    }

    if (!input.customerId.trim()) {
      details.customerId = "Customer id is required";
    }

    if (Object.keys(details).length === 0) {
      return null;
    }

    return {
      type: "validation",
      message: "Invalid create order input",
      details,
    };
  }
}
