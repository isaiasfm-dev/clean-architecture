import type { FastifyReply, FastifyRequest } from "fastify";

import { createContainer } from "#composition/container";

type CreateOrderRequest = FastifyRequest<{
  Body: {
    orderId: string;
    customerId: string;
  };
}>;

export class OrdersControler {
  private readonly container = createContainer();

  public async create(request: CreateOrderRequest, reply: FastifyReply): Promise<void> {
    const output = await this.container.createOrder.excecute(request.body);

    await reply.status(201).send(output);
  }
}
