// src/application/mappers/OrderMappers.ts
import type { CustomerOrderDto } from "#application/dtos/FindOrdersByCustomerIdDto";
import type { ListedOrderDto } from "#application/dtos/ListOrdersDto";
import type { OrderDto } from "#application/dtos/OrderDto";
import type { Order } from "#domain/entities/Order";

function orderTotalDto(order: Order) {
  const orderItems = order.itemsSnapshot();
  const orderTotal = orderItems.length > 0 ? order.total() : null;

  return orderTotal
    ? {
        amount: orderTotal.amount,
        currency: orderTotal.currency,
      }
    : {
        amount: 0,
        currency: "EUR",
      };
}

export function mapOrderToDto(order: Order): OrderDto {
  const orderItems = order.itemsSnapshot();

  return {
    orderId: order.id,
    customerId: order.customerId,
    items: orderItems.map((item) => {
      const itemTotal = item.price.multiply(item.quantity.value);

      return {
        sku: item.sku.value,
        quantity: item.quantity.value,
        unitPrice: {
          amount: item.price.amount,
          currency: item.price.currency,
        },
        totalPrice: {
          amount: itemTotal.amount,
          currency: itemTotal.currency,
        },
      };
    }),
    totalPrice: orderTotalDto(order),
  };
}

export function mapOrderToListedOrderDto(order: Order): ListedOrderDto {
  return {
    orderId: order.id,
    customerId: order.customerId,
    totalPrice: orderTotalDto(order),
  };
}

export function mapOrderToCustomerOrderDto(order: Order): CustomerOrderDto {
  return {
    orderId: order.id,
    totalPrice: orderTotalDto(order),
  };
}
