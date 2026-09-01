// src/application/AppContext.ts
import type { Clock } from "#application/ports/Clock";
import type { DomainEventPublisher } from "#application/ports/DomainEventPublisher";
import type { OrderRepository } from "#application/ports/OrderRepository";
import type { PriceProvider } from "#application/ports/PriceProvider";

export type PricingService = PriceProvider;
export type EventBus = DomainEventPublisher;

export type OrdersContext = {
  orderRepository: OrderRepository;
};

export type PricingContext = {
  pricingService: PricingService;
};

export type EventsContext = {
  eventBus: EventBus;
};

export type TimeContext = {
  clock: Clock;
};

export type AddItemToOrderContext =
  OrdersContext &
  PricingContext &
  EventsContext &
  TimeContext;

export type CreateOrderContext = 
  OrdersContext &
  EventsContext;

export type GetOrderItemsContext = OrdersContext;

export type AppContext =
  AddItemToOrderContext &
  CreateOrderContext &
  GetOrderItemsContext;
