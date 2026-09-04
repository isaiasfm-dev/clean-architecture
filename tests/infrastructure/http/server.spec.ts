import { describe, expect, it } from "vitest";

import type { ApplicationServices } from "#application/ApplicationServices";
import type { Logger, LoggerContext } from "#application/ports/Logger";
import { buildAppContext, createContainer } from "#composition/container";
import type { Config } from "#composition/config";
import { buildServer } from "#infrastructure/http/server";

function config(overrides: Partial<Config> = {}): Config {
  return {
    NODE_ENV: "test",
    DATABASE_URL: "postgres://user:password@localhost:5432/orders",
    DATABASE_POOL_MAX: 10,
    DATABASE_IDLE_TIMEOUT_MS: 30000,
    DATABASE_CONNECTION_TIMEOUT_MS: 2000,
    PRICING_BASE_URL: "http://localhost:4000",
    USE_INMEMORY: true,
    USE_OUTBOX: false,
    LOG_LEVEL: "silent",
    LOG_PRETTY: false,
    PRICING_TIMEOUT_MS: 5000,
    PORT: 3000,
    ...overrides,
  };
}

function buildTestServer() {
  const context = buildAppContext(config());

  return buildServer(createContainer(context));
}

function buildFailingContainer(error: Error): ApplicationServices {
  return {
    useCases: {
      createOrder: {
        execute: async () => {
          throw error;
        },
      },
      addItemToOrder: {},
      findOrdersByCustomerId: {},
      getOrderItems: {},
      listOrders: {},
    },
  } as unknown as ApplicationServices;
}

type LogEntry = {
  readonly level: "debug" | "info" | "warn" | "error";
  readonly message: string;
  readonly obj?: LoggerContext;
};

class RecordingLogger implements Logger {
  public readonly entries: LogEntry[] = [];

  public debug(message: string, obj?: LoggerContext): void {
    this.entries.push({ level: "debug", message, obj });
  }

  public info(message: string, obj?: LoggerContext): void {
    this.entries.push({ level: "info", message, obj });
  }

  public warn(message: string, obj?: LoggerContext): void {
    this.entries.push({ level: "warn", message, obj });
  }

  public error(message: string, obj?: LoggerContext): void {
    this.entries.push({ level: "error", message, obj });
  }

  public child(context: LoggerContext): Logger {
    const parent = this;

    return {
      debug(message, obj) {
        parent.debug(message, { ...context, ...obj });
      },
      info(message, obj) {
        parent.info(message, { ...context, ...obj });
      },
      warn(message, obj) {
        parent.warn(message, { ...context, ...obj });
      },
      error(message, obj) {
        parent.error(message, { ...context, ...obj });
      },
      child(childContext) {
        return parent.child({ ...context, ...childContext });
      },
    };
  }
}

function expectRequestId(response: { headers: Record<string, unknown> }): string {
  const requestId = response.headers["x-request-id"];

  expect(requestId).toEqual(expect.any(String));
  expect(requestId).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );

  return requestId as string;
}

describe("orders HTTP API", () => {
  it("logs safe request metadata without logging the full body", async () => {
    const context = buildAppContext(config());
    const logger = new RecordingLogger();
    const server = buildServer(createContainer(context), logger);

    const response = await server.inject({
      method: "POST",
      url: "/orders",
      payload: {
        orderId: "order-log-1",
        customerId: "customer-log-1",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(logger.entries).toHaveLength(2);
    expect(logger.entries[0]).toMatchObject({
      level: "debug",
      message: "request received",
      obj: {
        operation: "POST /orders",
        method: "POST",
        url: "/orders",
        orderId: "order-log-1",
        customerId: "customer-log-1",
      },
    });
    expect(logger.entries[0]?.obj).not.toHaveProperty("body");
    expect(logger.entries[0]?.obj?.requestId).toEqual(expect.any(String));
    expect(logger.entries[1]).toMatchObject({
      level: "debug",
      message: "request completed",
      obj: {
        operation: "POST /orders",
        statusCode: 201,
      },
    });
    expect(logger.entries[1]?.obj?.requestId).toEqual(logger.entries[0]?.obj?.requestId);

    await server.close();
  });

  it("logs controlled application errors without logging the full body", async () => {
    const context = buildAppContext(config());
    const logger = new RecordingLogger();
    const server = buildServer(createContainer(context), logger);

    await server.inject({
      method: "POST",
      url: "/orders",
      payload: {
        orderId: "order-conflict-1",
        customerId: "customer-conflict-1",
      },
    });

    const response = await server.inject({
      method: "POST",
      url: "/orders",
      payload: {
        orderId: "order-conflict-1",
        customerId: "customer-conflict-1",
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      code: "conflict",
      message: "Order already exists",
    });
    expect(logger.entries).toContainEqual(
      expect.objectContaining({
        level: "warn",
        message: "request failed",
        obj: expect.objectContaining({
          operation: "POST /orders",
          statusCode: 409,
          errorType: "conflict",
          message: "Order already exists",
          requestId: expect.any(String),
        }),
      }),
    );
    const failedRequest = logger.entries.find((entry) => entry.message === "request failed");
    expect(failedRequest?.obj).not.toHaveProperty("body");

    await server.close();
  });

  it("logs unexpected 500 errors without exposing internal details in the response", async () => {
    const logger = new RecordingLogger();
    const error = new Error("database unavailable");
    const server = buildServer(buildFailingContainer(error), logger);

    const response = await server.inject({
      method: "POST",
      url: "/orders",
      payload: {
        orderId: "order-error-1",
        customerId: "customer-error-1",
      },
    });

    const requestId = expectRequestId(response);

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      code: "dependency_failure",
      message: "Unexpected dependency failure",
    });
    expect(logger.entries).toContainEqual(
      expect.objectContaining({
        level: "error",
        message: "request failed",
        obj: expect.objectContaining({
          operation: "POST /orders",
          requestId,
          statusCode: 500,
          errorType: "dependency_failure",
          message: "database unavailable",
          error,
        }),
      }),
    );
    const failedRequest = logger.entries.find((entry) => entry.level === "error");
    expect(failedRequest?.obj).not.toHaveProperty("body");

    await server.close();
  });

  it("logs queried identifiers when reading order and customer resources", async () => {
    const context = buildAppContext(config());
    const logger = new RecordingLogger();
    const server = buildServer(createContainer(context), logger);

    await server.inject({
      method: "POST",
      url: "/orders",
      payload: {
        orderId: "order-query-log-1",
        customerId: "customer-query-log-1",
      },
    });

    const orderItemsResponse = await server.inject({
      method: "GET",
      url: "/orders/order-query-log-1/items",
    });
    const customerOrdersResponse = await server.inject({
      method: "GET",
      url: "/customers/customer-query-log-1/orders",
    });

    expect(orderItemsResponse.statusCode).toBe(200);
    expect(customerOrdersResponse.statusCode).toBe(200);
    expect(logger.entries).toContainEqual(
      expect.objectContaining({
        level: "debug",
        message: "request completed",
        obj: expect.objectContaining({
          operation: "GET /orders/:orderId/items",
          statusCode: 200,
          orderId: "order-query-log-1",
        }),
      }),
    );
    expect(logger.entries).toContainEqual(
      expect.objectContaining({
        level: "debug",
        message: "request completed",
        obj: expect.objectContaining({
          operation: "GET /customers/:customerId/orders",
          statusCode: 200,
          customerId: "customer-query-log-1",
        }),
      }),
    );

    await server.close();
  });

  it("returns API metadata with a request id", async () => {
    const server = buildTestServer();

    const response = await server.inject({
      method: "GET",
      url: "/",
    });

    expect(response.statusCode).toBe(200);
    expectRequestId(response);

    await server.close();
  });

  it("creates an order, adds an item and queries orders", async () => {
    const server = buildTestServer();

    const createResponse = await server.inject({
      method: "POST",
      url: "/orders",
      payload: {
        orderId: "order-http-1",
        customerId: "customer-http-1",
      },
    });

    expect(createResponse.statusCode).toBe(201);
    const createRequestId = expectRequestId(createResponse);
    expect(createResponse.json()).toEqual({
      orderId: "order-http-1",
    });

    const addItemResponse = await server.inject({
      method: "POST",
      url: "/orders/order-http-1/items",
      payload: {
        sku: "LAPTOP-001",
        quantity: 2,
      },
    });

    expect(addItemResponse.statusCode).toBe(200);
    const addItemRequestId = expectRequestId(addItemResponse);
    expect(addItemResponse.json()).toMatchObject({
      orderId: "order-http-1",
      sku: "LAPTOP-001",
      quantity: 2,
      unitPrice: {
        amount: 899.99,
        currency: "EUR",
      },
      totalPrice: {
        amount: 1799.98,
        currency: "EUR",
      },
    });

    const getItemsResponse = await server.inject({
      method: "GET",
      url: "/orders/order-http-1/items",
    });

    expect(getItemsResponse.statusCode).toBe(200);
    const getItemsRequestId = expectRequestId(getItemsResponse);
    expect(getItemsResponse.json()).toEqual({
      orderId: "order-http-1",
      items: [
        {
          sku: "LAPTOP-001",
          quantity: 2,
          unitPrice: {
            amount: 899.99,
            currency: "EUR",
          },
          totalPrice: {
            amount: 1799.98,
            currency: "EUR",
          },
        },
      ],
      totalPrice: {
        amount: 1799.98,
        currency: "EUR",
      },
    });

    const listOrdersResponse = await server.inject({
      method: "GET",
      url: "/orders",
    });

    expect(listOrdersResponse.statusCode).toBe(200);
    const listOrdersRequestId = expectRequestId(listOrdersResponse);
    expect(listOrdersResponse.json()).toEqual({
      orders: [
        {
          orderId: "order-http-1",
          customerId: "customer-http-1",
          totalPrice: {
            amount: 1799.98,
            currency: "EUR",
          },
        },
      ],
    });

    const getCustomerOrdersResponse = await server.inject({
      method: "GET",
      url: "/customers/customer-http-1/orders",
    });

    expect(getCustomerOrdersResponse.statusCode).toBe(200);
    const getCustomerOrdersRequestId = expectRequestId(getCustomerOrdersResponse);
    expect(getCustomerOrdersResponse.json()).toEqual({
      customerId: "customer-http-1",
      orders: [
        {
          orderId: "order-http-1",
          totalPrice: {
            amount: 1799.98,
            currency: "EUR",
          },
        },
      ],
    });

    expect(
      new Set([
        createRequestId,
        addItemRequestId,
        getItemsRequestId,
        listOrdersRequestId,
        getCustomerOrdersRequestId,
      ]).size,
    ).toBe(5);

    await server.close();
  });

  it("returns 404 when adding an item to a missing order", async () => {
    const server = buildTestServer();

    const response = await server.inject({
      method: "POST",
      url: "/orders/missing-order/items",
      payload: {
        sku: "LAPTOP-001",
        quantity: 1,
      },
    });

    expect(response.statusCode).toBe(404);
    expectRequestId(response);
    expect(response.json()).toEqual({
      code: "not_found",
      message: "Order not found",
    });

    await server.close();
  });

  it("returns 404 when getting items from a missing order", async () => {
    const server = buildTestServer();

    const response = await server.inject({
      method: "GET",
      url: "/orders/missing-order/items",
    });

    expect(response.statusCode).toBe(404);
    expectRequestId(response);
    expect(response.json()).toEqual({
      code: "not_found",
      message: "Order not found",
    });

    await server.close();
  });

});
