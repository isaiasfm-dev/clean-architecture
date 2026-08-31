import type { AddItemToOrder } from "#application/use-cases/AddItemToOrderUseCase";
import type { CreateOrder } from "#application/use-cases/CreateOrderUseCase";
import type { GetOrderItems } from "#application/use-cases/GetOrderItemsUseCase";

export type OrdersUseCases = {
  addItemToOrder: AddItemToOrder;
  createOrder: CreateOrder;
  getOrderItems: GetOrderItems;
};
