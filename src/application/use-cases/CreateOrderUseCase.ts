// src/application/use-cases/CreateOrderUseCase.ts
import type { CreateOrderContext } from "#application/AppContext";
import type {
  CreateOrderInputDto,
  CreateOrderOutputDto,
} from "#application/dtos/CreateOrderDto";
import type { ApplicationError, ValidationError } from "#application/errors/ApplicationErrors";
import { CustomerId, Order, OrderId } from "#domain/entities/Order";
import { fail, ok, type Result } from "#shared/result";

/**
 * Caso de uso que registra un pedido nuevo.
 *
 * Coordina `UnitOfWork`, `OrderRepository` y `DomainEventPublisher`. Dentro del
 * limite de `UnitOfWork` se comprueba la existencia del pedido, se persiste el
 * agregado y se entrega `order.created` al `eventBus` proporcionado por la
 * unidad de trabajo. En adaptadores transaccionales, esas operaciones comparten
 * la misma transaccion. Si el publicador falla, el error se devuelve como
 * `Result` fallido para que la unidad de trabajo pueda abortar la operacion.
 *
 * Un resultado correcto contiene el identificador del pedido creado. Los fallos
 * esperados son entrada invalida, pedido duplicado o fallo del publicador.
 */
export class CreateOrder {
  public constructor(private readonly context: CreateOrderContext) {}

  public async execute(
    input: CreateOrderInputDto,
  ): Promise<Result<CreateOrderOutputDto, ApplicationError>> {
    const validationError = this.validate(input);

    if (validationError) {
      return fail(validationError);
    }

    try {
      return await this.runInTransaction(input);
    } catch (error) {
      if (this.isApplicationError(error)) {
        return fail(error);
      }

      throw error;
    }
  }

  private async runInTransaction(
    input: CreateOrderInputDto,
  ): Promise<Result<CreateOrderOutputDto, ApplicationError>> {
    return this.context.unitOfWork.run(async ({ orderRepository, eventBus }) => {
      const exists = await orderRepository.findById(input.orderId);

      if (exists) {
        return fail({
          type: "conflict",
          message: "Order already exists",
        });
      }

      const order = Order.create(OrderId(input.orderId), CustomerId(input.customerId));

      await orderRepository.save(order);
      const publishResult = await eventBus.publish(order.pullDomainEvents());

      if (!publishResult.ok) {
        throw publishResult.error;
      }

      return ok({
        orderId: order.id,
      });
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

  private isApplicationError(error: unknown): error is ApplicationError {
    if (typeof error !== "object" || error === null || !("type" in error)) {
      return false;
    }

    return ["validation", "not_found", "conflict", "dependency_failure"].includes(
      String(error.type),
    );
  }
}
