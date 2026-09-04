// src/infrastructure/http/OrderController.ts
import type { FastifyReply, FastifyRequest } from "fastify";

import type { ApplicationError } from "#application/errors/ApplicationErrors";
import type { Logger, LoggerContext } from "#application/ports/Logger";
import type { OrdersUseCases } from "#application/use-cases/OrdersUseCases";
import { presentApplicationError } from "#infrastructure/http/HttpErrorPresenter";
import { NoopLogger } from "#infrastructure/observability/NoopLogger";

type CreateOrderRequest = FastifyRequest<{
  Body: {
    orderId: string;
    customerId: string;
  };
}>;

type AddItemToOrderRequest = FastifyRequest<{
  Params: {
    orderId: string;
  };
  Body: {
    sku: string;
    quantity: number;
  };
}>;

type GetOrderItemsRequest = FastifyRequest<{
  Params: {
    orderId: string;
  };
}>;

type FindOrdersByCustomerIdRequest = FastifyRequest<{
  Params: {
    customerId: string;
  };
}>;

export class OrdersController {
  public constructor(
    private readonly orders: OrdersUseCases,
    private readonly logger: Logger = new NoopLogger(),
  ) {}

  public async create(request: CreateOrderRequest, reply: FastifyReply): Promise<void> {
    const result = await this.orders.createOrder.execute(request.body);

    if (!result.ok) {
      await this.sendError(reply, result.error);
      return;
    }

    await this.sendSuccess(reply, 201, result.value, {
      orderId: request.body.orderId,
      customerId: request.body.customerId,
    });
  }

  public async addItem(request: AddItemToOrderRequest, reply: FastifyReply): Promise<void> {
    const result = await this.orders.addItemToOrder.execute({
      orderId: request.params.orderId,
      sku: request.body.sku,
      quantity: request.body.quantity,
    });

    if (!result.ok) {
      await this.sendError(reply, result.error);
      return;
    }

    await this.sendSuccess(reply, 200, result.value, {
      orderId: request.params.orderId,
      sku: request.body.sku,
    });
  }

  public async getItems(request: GetOrderItemsRequest, reply: FastifyReply): Promise<void> {
    const result = await this.orders.getOrderItems.execute({
      orderId: request.params.orderId,
    });

    if (!result.ok) {
      await this.sendError(reply, result.error);
      return;
    }

    await this.sendSuccess(reply, 200, result.value, {
      orderId: request.params.orderId,
    });
  }

  public async list(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = await this.orders.listOrders.execute();

    if (!result.ok) {
      await this.sendError(reply, result.error);
      return;
    }

    await this.sendSuccess(reply, 200, result.value);
  }

  public async findByCustomerId(
    request: FindOrdersByCustomerIdRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const result = await this.orders.findOrdersByCustomerId.execute({
      customerId: request.params.customerId,
    });

    if (!result.ok) {
      await this.sendError(reply, result.error);
      return;
    }

    await this.sendSuccess(reply, 200, result.value, {
      customerId: request.params.customerId,
    });
  }

  private async sendSuccess(
    reply: FastifyReply,
    statusCode: number,
    body: unknown,
    context: LoggerContext = {},
  ): Promise<void> {
    await reply.status(statusCode).send(body);
    this.logger.debug("request completed", { statusCode, ...context });
  }

  private async sendError(reply: FastifyReply, error: ApplicationError): Promise<void> {
    const response = presentApplicationError(error);
    const context = this.createErrorContext(error, response.statusCode);

    if (error.type === "dependency_failure") {
      this.logger.error("request failed", context);
    } else {
      this.logger.warn("request failed", context);
    }

    await reply.status(response.statusCode).send(response.body);
  }

  private createErrorContext(
    error: ApplicationError,
    statusCode: number,
  ): LoggerContext {
    if (error.type === "validation") {
      return {
        statusCode,
        errorType: error.type,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      };
    }

    if (error.type === "not_found") {
      return {
        statusCode,
        errorType: error.type,
        resource: error.resource,
        id: error.id,
      };
    }

    if (error.type === "conflict") {
      return {
        statusCode,
        errorType: error.type,
        message: error.message,
      };
    }

    return {
      statusCode,
      errorType: error.type,
      message: error.message,
    };
  }
}

export function makeOrdersController(useCases: OrdersUseCases, logger?: Logger) {
  const controller = new OrdersController(useCases, logger);

  return {
    create: controller.create.bind(controller),
    addItem: controller.addItem.bind(controller),
    getItems: controller.getItems.bind(controller),
    list: controller.list.bind(controller),
    findByCustomerId: controller.findByCustomerId.bind(controller),
  };
}
