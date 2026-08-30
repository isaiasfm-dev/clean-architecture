import { describe, expect, it } from "vitest";

import { CustomerId, Order, OrderId } from "#domain/entities/Order";
import { Price } from "#domain/value-objects/Price";
import { Quantity } from "#domain/value-objects/Quantity";
import { SKU } from "#domain/value-objects/SKU";

describe("Order", () => {
  it("acumula total con misma moneda y emite eventos", () => {
    const order = Order.create(OrderId("o-1"), CustomerId("c-1"));

    order.addItem(SKU.create("abc-1"), Price.create(10, "EUR"), Quantity.create(2));
    order.addItem(SKU.create("abc-2"), Price.create(5, "EUR"), Quantity.create(1));

    expect(order.total().amount).toBe(25);

    const events = order.pullDomainEvents();

    expect(events.some((event) => event.type === "order.created")).toBe(true);
    expect(events.some((event) => event.type === "order.item_added")).toBe(true);
  });
});
