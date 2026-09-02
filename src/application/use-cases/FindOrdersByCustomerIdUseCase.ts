// src/application/use-cases/FindOrdersByCustomerIdUseCase.ts
import type { FindOrdersByCustomerIdContext } from "#application/AppContext";
import type {
  FindOrdersByCustomerIdInputDto,
  FindOrdersByCustomerIdOutputDto,
} from "#application/dtos/FindOrdersByCustomerIdDto";
import type { ApplicationError, ValidationError } from "#application/errors/ApplicationErrors";
import { mapOrderToCustomerOrderDto } from "#application/mappers/OrderMappers";
import { fail, ok, type Result } from "#shared/result";

export class FindOrdersByCustomerId {
  public constructor(private readonly context: FindOrdersByCustomerIdContext) {}

  public async execute(
    input: FindOrdersByCustomerIdInputDto,
  ): Promise<Result<FindOrdersByCustomerIdOutputDto, ApplicationError>> {
    const validationError = this.validate(input);

    if (validationError) {
      return fail(validationError);
    }

    const customerId = input.customerId.trim();
    const orders = await this.context.orderRepository.findByCustomerId(customerId);

    return ok({
      customerId,
      orders: orders.map(mapOrderToCustomerOrderDto),
    });
  }

  private validate(input: FindOrdersByCustomerIdInputDto): ValidationError | null {
    if (input.customerId.trim()) {
      return null;
    }

    return {
      type: "validation",
      message: "Invalid find orders by customer id input",
      details: {
        customerId: "Customer id is required",
      },
    };
  }
}
