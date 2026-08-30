import Fastify from "fastify";

import { OrdersControler } from "#infrastructure/http/OrderController";

type CreateOrderRoute = {
  Body: {
    orderId: string;
    customerId: string;
  };
};

export function buildServer() {
  const server = Fastify();
  const ordersControler = new OrdersControler();

  server.get("/", async () => {
    return {
      status: "ok",
      routes: ["POST /orders"],
    };
  });

  server.post<CreateOrderRoute>("/orders", async (request, reply) => {
    await ordersControler.create(request, reply);
  });

  return server;
}
