// tests/infrastructure/persistence/postgres/PostgresOrderRepository.spec.ts
import { describe, expect, it } from "vitest";

import { PostgresOrderRepository } from "#infrastructure/persistence/postgres/PostgresOrderRepository";
import { CustomerId, Order, OrderId } from "#domain/entities/Order";
import { Price } from "#domain/value-objects/Price";
import { Quantity } from "#domain/value-objects/Quantity";
import { SKU } from "#domain/value-objects/SKU";

type QueryCall = {
  readonly sql: string;
  readonly values?: readonly unknown[] | undefined;
};

const createdAt = new Date("2026-01-01T00:00:00.000Z");
const updatedAt = new Date("2026-01-02T00:00:00.000Z");

class FakePoolClient {
  public readonly queries: QueryCall[] = [];
  public released = false;

  public async query(sql: string, values?: readonly unknown[]): Promise<{ rows: unknown[] }> {
    this.queries.push({ sql, values });

    return { rows: [] };
  }

  public release(): void {
    this.released = true;
  }
}

class FakePool {
  public readonly client = new FakePoolClient();
  public readonly queries: QueryCall[] = [];

  public async connect(): Promise<FakePoolClient> {
    return this.client;
  }

  public async query(sql: string, values?: readonly unknown[]): Promise<{ rows: unknown[] }> {
    this.queries.push({ sql, values });

    if (sql.includes("FROM orders") && !sql.includes("WHERE")) {
      return {
        rows: [
          {
            id: "101",
            order_id: "order-1",
            customer_id: "customer-1",
            created_at: createdAt,
            updated_at: updatedAt,
          },
          {
            id: "102",
            order_id: "order-2",
            customer_id: "customer-2",
            created_at: createdAt,
            updated_at: updatedAt,
          },
        ],
      };
    }

    if (sql.includes("FROM orders") && sql.includes("WHERE customer_id = $1")) {
      return {
        rows: [
          {
            id: "101",
            order_id: "order-1",
            customer_id: "customer-1",
            created_at: createdAt,
            updated_at: updatedAt,
          },
          {
            id: "102",
            order_id: "order-2",
            customer_id: "customer-1",
            created_at: createdAt,
            updated_at: updatedAt,
          },
        ],
      };
    }

    if (sql.includes("FROM orders") && sql.includes("WHERE order_id = $1")) {
      return {
        rows: [
          {
            id: "101",
            order_id: "order-1",
            customer_id: "customer-1",
            created_at: createdAt,
            updated_at: updatedAt,
          },
        ],
      };
    }

    if (sql.includes("FROM order_items") && sql.includes("WHERE order_id = ANY")) {
      return {
        rows: [
          {
            id: "1",
            order_id: "order-1",
            sku: "sku-1",
            quantity: 2,
            unit_price_amount: "12.35",
            unit_price_currency: "EUR",
            created_at: createdAt,
            updated_at: updatedAt,
          },
          {
            id: "2",
            order_id: "order-2",
            sku: "sku-2",
            quantity: 3,
            unit_price_amount: "5.00",
            unit_price_currency: "EUR",
            created_at: createdAt,
            updated_at: updatedAt,
          },
        ],
      };
    }

    if (sql.includes("FROM order_items") && sql.includes("WHERE order_id = $1")) {
      return {
        rows: [
          {
            id: "1",
            order_id: "order-1",
            sku: "sku-1",
            quantity: 2,
            unit_price_amount: "12.35",
            unit_price_currency: "EUR",
            created_at: createdAt,
            updated_at: updatedAt,
          },
          {
            id: "2",
            order_id: "order-1",
            sku: "sku-2",
            quantity: 3,
            unit_price_amount: "5.00",
            unit_price_currency: "EUR",
            created_at: createdAt,
            updated_at: updatedAt,
          },
        ],
      };
    }

    return { rows: [] };
  }
}

describe("PostgresOrderRepository", () => {
  it("finds all orders with their items", async () => {
    const pool = new FakePool();
    const repository = new PostgresOrderRepository(pool as never);

    const orders = await repository.findAll();

    expect(orders).toHaveLength(2);
    expect(orders.map((order) => order.id)).toEqual(["order-1", "order-2"]);
    expect(orders.map((order) => order.customerId)).toEqual(["customer-1", "customer-2"]);
    expect(orders[0]?.itemsSnapshot()).toHaveLength(1);
    expect(orders[0]?.total().amount).toBe(24.7);
    expect(orders[1]?.itemsSnapshot()).toHaveLength(1);
    expect(orders[1]?.total().amount).toBe(15);
    expect(pool.queries[1]?.values).toEqual([["order-1", "order-2"]]);
  });

  it("rehydrates orders from rows without pending domain events", async () => {
    const pool = new FakePool();
    const repository = new PostgresOrderRepository(pool as never);

    const order = await repository.findById("order-1");

    expect(order?.id).toBe("order-1");
    expect(order?.customerId).toBe("customer-1");
    expect(order?.itemsSnapshot()).toHaveLength(2);
    expect(order?.total().amount).toBe(39.7);
    expect(order?.pullDomainEvents()).toEqual([]);
  });

  it("finds orders by customer id with their items", async () => {
    const pool = new FakePool();
    const repository = new PostgresOrderRepository(pool as never);

    const orders = await repository.findByCustomerId("customer-1");

    expect(orders).toHaveLength(2);
    expect(orders.map((order) => order.id)).toEqual(["order-1", "order-2"]);
    expect(orders.map((order) => order.customerId)).toEqual(["customer-1", "customer-1"]);
    expect(orders[0]?.itemsSnapshot()).toHaveLength(1);
    expect(orders[0]?.total().amount).toBe(24.7);
    expect(orders[1]?.itemsSnapshot()).toHaveLength(1);
    expect(orders[1]?.total().amount).toBe(15);
    expect(pool.queries[0]?.values).toEqual(["customer-1"]);
    expect(pool.queries[1]?.values).toEqual([["order-1", "order-2"]]);
  });

  it("saves orders using upsert and delete plus insert for items", async () => {
    const pool = new FakePool();
    const repository = new PostgresOrderRepository(pool as never);
    const order = Order.create(OrderId("order-1"), CustomerId("customer-1"));
    order.addItem(SKU.create("sku-1"), Price.create(12.35, "EUR"), Quantity.create(2));
    order.addItem(SKU.create("sku-2"), Price.create(5, "EUR"), Quantity.create(3));

    await repository.save(order);

    expect(pool.queries.map((query) => query.sql.trim().split(/\s+/).join(" "))).toEqual([
      "INSERT INTO orders (order_id, customer_id) VALUES ($1, $2) ON CONFLICT (order_id) DO UPDATE SET customer_id = EXCLUDED.customer_id",
      "DELETE FROM order_items WHERE order_id = $1",
      "INSERT INTO order_items ( order_id, sku, quantity, unit_price_amount, unit_price_currency ) VALUES ($1, $2, $3, $4, $5)",
      "INSERT INTO order_items ( order_id, sku, quantity, unit_price_amount, unit_price_currency ) VALUES ($1, $2, $3, $4, $5)",
    ]);
    expect(pool.queries[0]?.values).toEqual(["order-1", "customer-1"]);
    expect(pool.queries[1]?.values).toEqual(["order-1"]);
    expect(pool.queries[2]?.values).toEqual(["order-1", "sku-1", 2, 12.35, "EUR"]);
    expect(pool.queries[3]?.values).toEqual(["order-1", "sku-2", 3, 5, "EUR"]);
  });
});
