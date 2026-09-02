// src/infrastructure/http/server.ts
import Fastify from "fastify";

import type { ApplicationServices } from "#application/ApplicationServices";
import { makeOrdersController } from "#infrastructure/http/OrderController";
import { makeRequestScope } from "#infrastructure/http/scope";

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

type FindOrdersByCustomerIdRoute = {
  Params: {
    customerId: string;
  };
};

export function buildServer(container: ApplicationServices) {
  const server = Fastify();

  server.get("/", async (_request, reply) => {
    const scope = makeRequestScope(container);

    reply.header("x-request-id", scope.requestId);

    return {
      status: "ok",
      routes: [
        "POST /orders",
        "GET /orders",
        "POST /orders/:orderId/items",
        "GET /orders/:orderId/items",
        "GET /customers/:customerId/orders"],
    };
  });

  server.post<CreateOrderRoute>("/orders", async (request, reply) => {
    const scope = makeRequestScope(container);
    const ctrl = makeOrdersController(scope.useCases);

    reply.header("x-request-id", scope.requestId);

    await ctrl.create(request, reply);
  });

  server.get("/orders", async (request, reply) => {
    const scope = makeRequestScope(container);
    const ctrl = makeOrdersController(scope.useCases);

    reply.header("x-request-id", scope.requestId);

    await ctrl.list(request, reply);
  });

  server.post<AddItemToOrderRoute>("/orders/:orderId/items", async (request, reply) => {
    const scope = makeRequestScope(container);
    const ctrl = makeOrdersController(scope.useCases);

    reply.header("x-request-id", scope.requestId);

    await ctrl.addItem(request, reply);
  });

  server.get<GetOrderItemsRoute>("/orders/:orderId/items", async (request, reply) => {
    const scope = makeRequestScope(container);
    const ctrl = makeOrdersController(scope.useCases);

    reply.header("x-request-id", scope.requestId);

    await ctrl.getItems(request, reply);
  });

  server.get<FindOrdersByCustomerIdRoute>("/customers/:customerId/orders", async (request, reply) => {
    const scope = makeRequestScope(container);
    const ctrl = makeOrdersController(scope.useCases);

    reply.header("x-request-id", scope.requestId);

    await ctrl.findByCustomerId(request, reply);
  });

  return server;
}
