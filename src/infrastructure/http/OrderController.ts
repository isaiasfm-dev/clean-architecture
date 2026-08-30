import type { FastifyReply, FastifyRequest } from "fastify";

import type { ApplicationError } from "#application/errors/ApplicationErrors";
import { createContainer } from "#composition/container";

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

export class OrdersControler {
  private readonly container = createContainer();

  public async create(request: CreateOrderRequest, reply: FastifyReply): Promise<void> {
    const result = await this.container.createOrder.excecute(request.body);

    if (!result.ok) {
      await this.sendError(reply, result.error);
      return;
    }

    await reply.status(201).send(result.value);
  }

  public async addItem(request: AddItemToOrderRequest, reply: FastifyReply): Promise<void> {
    const result = await this.container.addItemToOrder.execute({
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
    const result = await this.container.getOrderItems.execute({
      orderId: request.params.orderId,
    });

    if (!result.ok) {
      await this.sendError(reply, result.error);
      return;
    }

    await reply.status(200).send(result.value);
  }

  private async sendError(reply: FastifyReply, error: ApplicationError): Promise<void> {
    await reply.status(this.statusFor(error)).send(error);
  }

  private statusFor(error: ApplicationError): number {
    if (error.type === "validation") {
      return 400;
    }

    if (error.type === "not_found") {
      return 404;
    }

    if (error.type === "conflict") {
      return 409;
    }

    return 500;
  }
}
