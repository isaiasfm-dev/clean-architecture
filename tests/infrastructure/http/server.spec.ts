import { describe, expect, it } from "vitest";

import { buildAppContext, createContainer } from "#composition/container";
import type { Config } from "#composition/config";
import { buildServer } from "#infrastructure/http/server";

function config(overrides: Partial<Config> = {}): Config {
  return {
    NODE_ENV: "test",
    DATABASE_URL: "postgres://user:password@localhost:5432/orders",
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

function expectRequestId(response: { headers: Record<string, unknown> }): string {
  const requestId = response.headers["x-request-id"];

  expect(requestId).toEqual(expect.any(String));
  expect(requestId).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );

  return requestId as string;
}

describe("orders HTTP API", () => {
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
