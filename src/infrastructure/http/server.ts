// src/infrastructure/http/server.ts
import Fastify from "fastify";

import type { ApplicationServices } from "#application/ApplicationServices";
import type { Logger } from "#application/ports/Logger";
import { presentApplicationError } from "#infrastructure/http/HttpErrorPresenter";
import { makeOrdersController } from "#infrastructure/http/OrderController";
import { makeRequestScope } from "#infrastructure/http/scope";
import { NoopLogger } from "#infrastructure/observability/NoopLogger";

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

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}

export function buildServer(container: ApplicationServices, logger: Logger = new NoopLogger()) {
  const server = Fastify();

  server.setErrorHandler((error, request, reply) => {
    const requestId = String(reply.getHeader("x-request-id") ?? request.id);
    const message = getErrorMessage(error);
    const response = presentApplicationError({
      type: "dependency_failure",
      message,
    });
    const requestLogger = logger.child({
      requestId,
      operation: `${request.method} ${request.url}`,
    });

    reply.header("x-request-id", requestId);
    requestLogger.error("request failed", {
      statusCode: response.statusCode,
      errorType: "dependency_failure",
      message,
      error,
    });

    reply.status(response.statusCode).send(response.body);
  });

  server.get("/", async (_request, reply) => {
    const scope = makeRequestScope(container);
    const requestLogger = logger.child({
      requestId: scope.requestId,
      operation: "GET /",
    });

    reply.header("x-request-id", scope.requestId);
    requestLogger.debug("request received", {
      method: _request.method,
      url: _request.url,
    });
    requestLogger.debug("request completed", { statusCode: 200 });

    return {
      status: "ok",
      routes: [
        "POST /orders",
        "GET /orders",
        "POST /orders/:orderId/items",
        "GET /orders/:orderId/items",
        "GET /customers/:customerId/orders",
      ],
    };
  });

  server.post<CreateOrderRoute>("/orders", async (request, reply) => {
    const scope = makeRequestScope(container);
    const requestLogger = logger.child({
      requestId: scope.requestId,
      operation: "POST /orders",
    });
    const ctrl = makeOrdersController(scope.useCases, requestLogger);

    reply.header("x-request-id", scope.requestId);
    requestLogger.debug("request received", {
      method: request.method,
      url: request.url,
      orderId: request.body.orderId,
      customerId: request.body.customerId,
    });

    await ctrl.create(request, reply);
  });

  server.get("/orders", async (request, reply) => {
    const scope = makeRequestScope(container);
    const requestLogger = logger.child({
      requestId: scope.requestId,
      operation: "GET /orders",
    });
    const ctrl = makeOrdersController(scope.useCases, requestLogger);

    reply.header("x-request-id", scope.requestId);
    requestLogger.debug("request received", {
      method: request.method,
      url: request.url,
    });

    await ctrl.list(request, reply);
  });

  server.post<AddItemToOrderRoute>("/orders/:orderId/items", async (request, reply) => {
    const scope = makeRequestScope(container);
    const requestLogger = logger.child({
      requestId: scope.requestId,
      operation: "POST /orders/:orderId/items",
    });
    const ctrl = makeOrdersController(scope.useCases, requestLogger);

    reply.header("x-request-id", scope.requestId);
    requestLogger.debug("request received", {
      method: request.method,
      url: request.url,
      orderId: request.params.orderId,
      sku: request.body.sku,
      quantity: request.body.quantity,
    });

    await ctrl.addItem(request, reply);
  });

  server.get<GetOrderItemsRoute>("/orders/:orderId/items", async (request, reply) => {
    const scope = makeRequestScope(container);
    const requestLogger = logger.child({
      requestId: scope.requestId,
      operation: "GET /orders/:orderId/items",
    });
    const ctrl = makeOrdersController(scope.useCases, requestLogger);

    reply.header("x-request-id", scope.requestId);
    requestLogger.debug("request received", {
      method: request.method,
      url: request.url,
      orderId: request.params.orderId,
    });

    await ctrl.getItems(request, reply);
  });

  server.get<FindOrdersByCustomerIdRoute>("/customers/:customerId/orders", async (request, reply) => {
    const scope = makeRequestScope(container);
    const requestLogger = logger.child({
      requestId: scope.requestId,
      operation: "GET /customers/:customerId/orders",
    });
    const ctrl = makeOrdersController(scope.useCases, requestLogger);

    reply.header("x-request-id", scope.requestId);
    requestLogger.debug("request received", {
      method: request.method,
      url: request.url,
      customerId: request.params.customerId,
    });

    await ctrl.findByCustomerId(request, reply);
  });

  return server;
}
