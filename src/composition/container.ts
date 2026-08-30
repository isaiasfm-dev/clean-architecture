import { AddItemToOrder } from "#application/use-cases/AddItemToOrderUseCase";
import { CreateOrder } from "#application/use-cases/CreateOrderUseCase";
import { GetOrderItems } from "#application/use-cases/GetOrderItemsUseCase";
import { NoopEventBus } from "#infrastructure/events/NoopEventBus";
import { InMemoryOrderRepository } from "#infrastructure/persistence/InMemoryOrderRepository";
import { InMemoryPricingService } from "#infrastructure/pricing/InMemoryPricingService";
import { SystemClock } from "#infrastructure/time/SystemClock";

export type Container = {
  addItemToOrder: AddItemToOrder;
  createOrder: CreateOrder;
  getOrderItems: GetOrderItems;
};

export function createContainer(): Container {
  const orderRepository = new InMemoryOrderRepository();
  const pricingService = new InMemoryPricingService();
  const eventBus = new NoopEventBus();
  const clock = new SystemClock();
  const addItemToOrder = new AddItemToOrder(
    orderRepository,
    pricingService,
    eventBus,
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
