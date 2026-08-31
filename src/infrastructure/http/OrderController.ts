import type { FastifyReply, FastifyRequest } from "fastify";

import type { ApplicationError } from "#application/errors/ApplicationErrors";
import type { OrdersUseCases } from "#application/use-cases/OrdersUseCases";
import { presentApplicationError } from "#infrastructure/http/HttpErrorPresenter";

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

export class OrdersController {
  public constructor(private readonly orders: OrdersUseCases) {}

  public async create(request: CreateOrderRequest, reply: FastifyReply): Promise<void> {
    const result = await this.orders.createOrder.execute(request.body);

    if (!result.ok) {
      await this.sendError(reply, result.error);
      return;
    }

    await reply.status(201).send(result.value);
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

    await reply.status(200).send(result.value);
  }

  public async getItems(request: GetOrderItemsRequest, reply: FastifyReply): Promise<void> {
    const result = await this.orders.getOrderItems.execute({
      orderId: request.params.orderId,
    });

    if (!result.ok) {
      await this.sendError(reply, result.error);
      return;
    }

    await reply.status(200).send(result.value);
  }

  private async sendError(reply: FastifyReply, error: ApplicationError): Promise<void> {
    const response = presentApplicationError(error);

    await reply.status(response.statusCode).send(response.body);
  }
}
