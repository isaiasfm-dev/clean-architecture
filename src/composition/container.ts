import { CreateOrder } from "#application/use-cases/CreateOrderUseCase";
import { InMemoryOrderRepository } from "#infrastructure/persistence/InMemoryOrderRepository";

export type Container = {
  createOrder: CreateOrder;
};

export function createContainer(): Container {
  const orderRepository = new InMemoryOrderRepository();
  const createOrder = new CreateOrder(orderRepository);

  return {
    createOrder,
  };
}
