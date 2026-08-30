import Fastify from "fastify";

import { OrdersControler } from "#infrastructure/http/OrderController";

type CreateOrderRoute = {
  Body: {
    orderId: string;
    customerId: string;
  };
};

type AddItemToOrderRoute = {
  Params: {
    orderId: string;
  };
  Body: {
    sku: string;
    quantity: number;
  };
};

type GetOrderItemsRoute = {
  Params: {
    orderId: string;
  };
};

export function buildServer() {
  const server = Fastify();
  const ordersControler = new OrdersControler();

  server.get("/", async () => {
    return {
      status: "ok",
      routes: ["POST /orders", "POST /orders/:orderId/items", "GET /orders/:orderId/items"],
    };
  });

  server.post<CreateOrderRoute>("/orders", async (request, reply) => {
    await ordersControler.create(request, reply);
  });

  server.post<AddItemToOrderRoute>("/orders/:orderId/items", async (request, reply) => {
    await ordersControler.addItem(request, reply);
  });

  server.get<GetOrderItemsRoute>("/orders/:orderId/items", async (request, reply) => {
    await ordersControler.getItems(request, reply);
  });

  return server;
}
