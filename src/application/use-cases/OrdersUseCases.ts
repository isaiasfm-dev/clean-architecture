// src/application/use-cases/OrdersUseCases.ts
import type { AddItemToOrder } from "#application/use-cases/AddItemToOrderUseCase";
import type { CreateOrder } from "#application/use-cases/CreateOrderUseCase";
import type { FindOrdersByCustomerId } from "#application/use-cases/FindOrdersByCustomerIdUseCase";
import type { GetOrderItems } from "#application/use-cases/GetOrderItemsUseCase";
import type { ListOrders } from "#application/use-cases/ListOrdersUseCase";

export type OrdersUseCases = {
  addItemToOrder: AddItemToOrder;
  createOrder: CreateOrder;
  findOrdersByCustomerId: FindOrdersByCustomerId;
  getOrderItems: GetOrderItems;
  listOrders: ListOrders;
};
