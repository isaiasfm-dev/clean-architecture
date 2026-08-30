import { Price } from "#domain/value-objects/Price";
import type { Quantity } from "#domain/value-objects/Quantity";
import type { SKU } from "#domain/value-objects/SKU";

export type OrderId = string & { readonly type: "OrderId" };
export type CustomerId = string & { readonly type: "CustomerId" };

export function OrderId(value: string): OrderId {
  return value as OrderId;
}

export function CustomerId(value: string): CustomerId {
  return value as CustomerId;
}

export type OrderDomainEvent = {
  readonly type: "order.created" | "order.item_added";
};

type OrderItem = {
  readonly sku: SKU;
  readonly price: Price;
  readonly quantity: Quantity;
};

export type OrderItemSnapshot = OrderItem;

export class Order {
  private readonly items: OrderItem[] = [];
  private readonly domainEvents: OrderDomainEvent[] = [];

  private constructor(
    public readonly id: OrderId,
    public readonly customerId: CustomerId,
  ) {}

  public static create(id: OrderId, customerId: CustomerId): Order {
    const order = new Order(id, customerId);

    order.domainEvents.push({ type: "order.created" });

    return order;
  }

  public addItem(sku: SKU, price: Price, quantity: Quantity): void {
    this.items.push({ sku, price, quantity });
    this.domainEvents.push({ type: "order.item_added" });
  }

  public itemsSnapshot(): OrderItemSnapshot[] {
    return this.items.map((item) => ({ ...item }));
  }

  public total(): Price {
    const [firstItem, ...otherItems] = this.items;

    if (!firstItem) {
      throw new Error("Order has no items");
    }

    return otherItems.reduce(
      (total, item) => total.add(item.price.multiply(item.quantity.value)),
      firstItem.price.multiply(firstItem.quantity.value),
    );
  }

  public pullDomainEvents(): OrderDomainEvent[] {
    const events = [...this.domainEvents];

    this.domainEvents.length = 0;

    return events;
  }

  public equals(other: Order): boolean {
    return this.id === other.id;
  }
}
