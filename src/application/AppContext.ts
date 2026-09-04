// src/application/AppContext.ts
import type { Clock } from "#application/ports/Clock";
import type { OrderRepository } from "#application/ports/OrderRepository";
import type { PriceProvider } from "#application/ports/PriceProvider";
import type { UnitOfWork } from "#application/ports/UnitOfWork";

export type OrdersContext = {
  orderRepository: OrderRepository;
};

export type UnitOfWorkContext = {
  unitOfWork: UnitOfWork;
};

export type PricingContext = {
  priceProvider: PriceProvider;
};

export type TimeContext = {
  clock: Clock;
};

export type AddItemToOrderContext =
  UnitOfWorkContext &
  PricingContext &
  TimeContext;

export type CreateOrderContext = UnitOfWorkContext;

export type GetOrderItemsContext = OrdersContext;
export type ListOrdersContext = OrdersContext;
export type FindOrdersByCustomerIdContext = OrdersContext;

export type AppContext =
  OrdersContext &
  UnitOfWorkContext &
  AddItemToOrderContext &
  CreateOrderContext &
  GetOrderItemsContext &
  ListOrdersContext &
  FindOrdersByCustomerIdContext;
