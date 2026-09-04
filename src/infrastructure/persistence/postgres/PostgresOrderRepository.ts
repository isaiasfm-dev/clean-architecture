// src/infrastructure/persistence/postgres/PostgresOrderRepository.ts
import type { Pool, PoolClient } from "pg";

import type { OrderRepository } from "#application/ports/OrderRepository";
import { CustomerId, Order, OrderId } from "#domain/entities/Order";
import type { Currency } from "#domain/value-objects/Currency";
import { Price } from "#domain/value-objects/Price";
import { Quantity } from "#domain/value-objects/Quantity";
import { SKU } from "#domain/value-objects/SKU";

type OrderRow = {
  readonly id: string;
  readonly order_id: string;
  readonly customer_id: string;
  readonly created_at: Date;
  readonly updated_at: Date;
};

type OrderItemRow = {
  readonly id: string;
  readonly order_id: string;
  readonly sku: string;
  readonly quantity: number;
  readonly unit_price_amount: string;
  readonly unit_price_currency: Currency;
  readonly created_at: Date;
  readonly updated_at: Date;
};

type QueryExecutor = Pick<Pool | PoolClient, "query">;

export class PostgresOrderRepository implements OrderRepository {
  public constructor(private readonly executor: QueryExecutor) {}

  public async findAll(): Promise<Order[]> {
    const ordersResult = await this.executor.query<OrderRow>(
      `
      SELECT id, order_id, customer_id, created_at, updated_at
      FROM orders
      ORDER BY created_at ASC, id ASC
      `,
    );

    return this.rehydrateOrders(ordersResult.rows);
  }

  public async findById(id: string): Promise<Order | null> {
    const orderResult = await this.executor.query<OrderRow>(
      `
      SELECT id, order_id, customer_id, created_at, updated_at
      FROM orders
      WHERE order_id = $1
      `,
      [id],
    );
    const orderRow = orderResult.rows[0];

    if (!orderRow) {
      return null;
    }

    const itemsResult = await this.executor.query<OrderItemRow>(
      `
      SELECT id, order_id, sku, quantity, unit_price_amount, unit_price_currency, created_at, updated_at
      FROM order_items
      WHERE order_id = $1
      ORDER BY id ASC
      `,
      [id],
    );

    return this.rehydrateOrder(orderRow, itemsResult.rows);
  }

  public async findByCustomerId(customerId: string): Promise<Order[]> {
    const ordersResult = await this.executor.query<OrderRow>(
      `
      SELECT id, order_id, customer_id, created_at, updated_at
      FROM orders
      WHERE customer_id = $1
      ORDER BY created_at ASC, id ASC
      `,
      [customerId],
    );

    if (ordersResult.rows.length === 0) {
      return [];
    }

    return this.rehydrateOrders(ordersResult.rows);
  }

  public async save(order: Order): Promise<void> {
    await this.upsertOrder(order);
    await this.replaceOrderItems(order);
  }

  private async rehydrateOrders(orderRows: OrderRow[]): Promise<Order[]> {
    if (orderRows.length === 0) {
      return [];
    }

    const orderIds = orderRows.map((order) => order.order_id);
    const itemsResult = await this.executor.query<OrderItemRow>(
      `
      SELECT id, order_id, sku, quantity, unit_price_amount, unit_price_currency, created_at, updated_at
      FROM order_items
      WHERE order_id = ANY($1::text[])
      ORDER BY order_id ASC, id ASC
      `,
      [orderIds],
    );
    const itemsByOrderId = new Map<string, OrderItemRow[]>();

    for (const item of itemsResult.rows) {
      const orderItems = itemsByOrderId.get(item.order_id) ?? [];

      orderItems.push(item);
      itemsByOrderId.set(item.order_id, orderItems);
    }

    return orderRows.map((order) =>
      this.rehydrateOrder(order, itemsByOrderId.get(order.order_id) ?? []),
    );
  }

  private rehydrateOrder(orderRow: OrderRow, itemRows: OrderItemRow[]): Order {
    return Order.rehydrate({
      id: OrderId(orderRow.order_id),
      customerId: CustomerId(orderRow.customer_id),
      items: itemRows.map((item) => ({
        sku: SKU.create(item.sku),
        quantity: Quantity.create(item.quantity),
        price: Price.create(Number(item.unit_price_amount), item.unit_price_currency),
      })),
    });
  }

  private async upsertOrder(order: Order): Promise<void> {
    await this.executor.query(
      `
      INSERT INTO orders (order_id, customer_id)
      VALUES ($1, $2)
      ON CONFLICT (order_id)
      DO UPDATE SET customer_id = EXCLUDED.customer_id
      `,
      [order.id, order.customerId],
    );
  }

  private async replaceOrderItems(order: Order): Promise<void> {
    await this.executor.query(
      `
      DELETE FROM order_items
      WHERE order_id = $1
      `,
      [order.id],
    );

    for (const item of order.itemsSnapshot()) {
      await this.executor.query(
        `
        INSERT INTO order_items (
          order_id,
          sku,
          quantity,
          unit_price_amount,
          unit_price_currency
        )
        VALUES ($1, $2, $3, $4, $5)
        `,
        [order.id, item.sku.value, item.quantity.value, item.price.amount, item.price.currency],
      );
    }
  }
}
