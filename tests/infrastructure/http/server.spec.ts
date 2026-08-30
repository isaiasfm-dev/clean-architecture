import { describe, expect, it } from "vitest";

import { buildServer } from "#infrastructure/http/server";

describe("orders HTTP API", () => {
  it("creates an order, adds an item and gets its items", async () => {
    const server = buildServer();

    const createResponse = await server.inject({
      method: "POST",
      url: "/orders",
      payload: {
        orderId: "order-http-1",
        customerId: "customer-http-1",
      },
    });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toEqual({
      orderId: "order-http-1",
    });

    const addItemResponse = await server.inject({
      method: "POST",
      url: "/orders/order-http-1/items",
      payload: {
        sku: "sku-1",
        quantity: 2,
      },
    });

    expect(addItemResponse.statusCode).toBe(200);
    expect(addItemResponse.json()).toMatchObject({
      orderId: "order-http-1",
      sku: "sku-1",
      quantity: 2,
      unitPrice: {
        amount: 12.35,
        currency: "EUR",
      },
    });

    const getItemsResponse = await server.inject({
      method: "GET",
      url: "/orders/order-http-1/items",
    });

    expect(getItemsResponse.statusCode).toBe(200);
    expect(getItemsResponse.json()).toEqual({
      orderId: "order-http-1",
      items: [
        {
          sku: "sku-1",
          quantity: 2,
          unitPrice: {
            amount: 12.35,
            currency: "EUR",
          },
        },
      ],
    });

    await server.close();
  });

  it("returns 404 when adding an item to a missing order", async () => {
    const server = buildServer();

    const response = await server.inject({
      method: "POST",
      url: "/orders/missing-order/items",
      payload: {
        sku: "sku-1",
        quantity: 1,
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      type: "not_found",
      resource: "Order",
      id: "missing-order",
    });

    await server.close();
  });

  it("returns 404 when getting items from a missing order", async () => {
    const server = buildServer();

    const response = await server.inject({
      method: "GET",
      url: "/orders/missing-order/items",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      type: "not_found",
      resource: "Order",
      id: "missing-order",
    });

    await server.close();
  });
});
