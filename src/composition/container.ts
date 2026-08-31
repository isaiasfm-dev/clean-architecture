import { AddItemToOrder } from "#application/use-cases/AddItemToOrderUseCase";
import { CreateOrder } from "#application/use-cases/CreateOrderUseCase";
import { GetOrderItems } from "#application/use-cases/GetOrderItemsUseCase";
import type { OrdersUseCases } from "#application/use-cases/OrdersUseCases";
import { NoopDomainEventPublisher } from "#infrastructure/events/NoopDomainEventPublisher";
import { InMemoryOrderRepository } from "#infrastructure/persistence/InMemoryOrderRepository";
import { InMemoryPriceProvider } from "#infrastructure/pricing/InMemoryPriceProvider";
import { SystemClock } from "#infrastructure/time/SystemClock";

export type Container = OrdersUseCases;

export function createContainer(): Container {
  const orderRepository = new InMemoryOrderRepository();
  const priceProvider = new InMemoryPriceProvider();
  const eventPublisher = new NoopDomainEventPublisher();
  const clock = new SystemClock();
  const addItemToOrder = new AddItemToOrder(
    orderRepository,
    priceProvider,
    eventPublisher,
    clock,
  );
  const createOrder = new CreateOrder(orderRepository);
  const getOrderItems = new GetOrderItems(orderRepository);

  return {
    addItemToOrder,
    createOrder,
    getOrderItems,
  };
}
