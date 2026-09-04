// src/domain/entities/Order.ts
import type { DomainEvent } from "#domain/events/DomainEvent";
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

/**
 * Eventos que el agregado `Order` puede dejar pendientes para la capa de
 * aplicacion.
 */
export type OrderDomainEvent = DomainEvent & {
  readonly aggregateType: "Order";
  readonly type: "order.created" | "order.item_added";
};

type OrderItem = {
  readonly sku: SKU;
  readonly price: Price;
  readonly quantity: Quantity;
};

export type OrderItemSnapshot = OrderItem;

/**
 * Estado suficiente para reconstruir un pedido persistido sin tratarlo como
 * una nueva decision de negocio.
 */
export type OrderSnapshot = {
  readonly id: OrderId;
  readonly customerId: CustomerId;
  readonly items: readonly OrderItemSnapshot[];
};

/**
 * Agregado raiz de pedidos.
 *
 * El agregado registra eventos de dominio cuando se crean pedidos nuevos o se
 * anaden lineas. La rehidratacion, en cambio, solo reconstruye estado ya
 * existente y por eso no genera eventos pendientes.
 */
export class Order {
  private readonly items: OrderItem[] = [];
  private readonly domainEvents: OrderDomainEvent[] = [];

  private constructor(
    public readonly id: OrderId,
    public readonly customerId: CustomerId,
  ) {}

  /**
   * Crea un pedido nuevo y deja pendiente el evento `order.created`.
   */
  public static create(id: OrderId, customerId: CustomerId): Order {
    const order = new Order(id, customerId);

    order.domainEvents.push({
      aggregateId: id,
      aggregateType: "Order",
      type: "order.created",
    });

    return order;
  }

  /**
   * Reconstruye un pedido desde persistencia sin emitir eventos de dominio.
   *
   * Usar `create` aqui publicaria de nuevo hechos que ya ocurrieron.
   */
  public static rehydrate(snapshot: OrderSnapshot): Order {
    const order = new Order(snapshot.id, snapshot.customerId);

    order.items.push(...snapshot.items);

    return order;
  }

  /**
   * Anade una linea al pedido y deja pendiente el evento `order.item_added`.
   */
  public addItem(sku: SKU, price: Price, quantity: Quantity): void {
    this.items.push({ sku, price, quantity });
    this.domainEvents.push({
      aggregateId: this.id,
      aggregateType: "Order",
      type: "order.item_added",
    });
  }

  public itemsSnapshot(): OrderItemSnapshot[] {
    return this.items.map((item) => ({ ...item }));
  }

  /**
   * Calcula el total a partir de las lineas actuales del pedido.
   *
   * @throws Error Si el pedido no tiene lineas.
   */
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

  /**
   * Entrega los eventos pendientes y vacia el buffer interno del agregado.
   */
  public pullDomainEvents(): OrderDomainEvent[] {
    const events = [...this.domainEvents];

    this.domainEvents.length = 0;

    return events;
  }

  public equals(other: Order): boolean {
    return this.id === other.id;
  }
}
