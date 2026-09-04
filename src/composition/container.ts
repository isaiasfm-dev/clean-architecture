// src/composition/container.ts
import type { ApplicationServices } from "#application/ApplicationServices";
import type { AppContext } from "#application/AppContext";
import type { Logger } from "#application/ports/Logger";
import { AddItemToOrder } from "#application/use-cases/AddItemToOrderUseCase";
import { CreateOrder } from "#application/use-cases/CreateOrderUseCase";
import { FindOrdersByCustomerId } from "#application/use-cases/FindOrdersByCustomerIdUseCase";
import { GetOrderItems } from "#application/use-cases/GetOrderItemsUseCase";
import { ListOrders } from "#application/use-cases/ListOrdersUseCase";
import type { ConcreteAppContext } from "#composition/ConcreteAppContext";
import type { Config } from "#composition/config";
import { buildDevelopmentContext } from "#composition/environments/development";
import { buildProductionContext } from "#composition/environments/production";
import { buildTestContext } from "#composition/environments/test";

export type Container = ApplicationServices;

export function buildAppContext(config: Config, logger?: Logger): ConcreteAppContext {
  switch (config.NODE_ENV) {
    case "development":
      return buildDevelopmentContext(config, logger);
    case "test":
      return buildTestContext(config, logger);
    case "production":
      return buildProductionContext(config, logger);
  }
}

export function createContainer(context: AppContext): ApplicationServices {
  const addItemToOrder = new AddItemToOrder(context);
  const createOrder = new CreateOrder(context);
  const findOrdersByCustomerId = new FindOrdersByCustomerId(context);
  const getOrderItems = new GetOrderItems(context);
  const listOrders = new ListOrders(context);

  return {
    useCases: {
      addItemToOrder,
      createOrder,
      findOrdersByCustomerId,
      getOrderItems,
      listOrders,
    },
  };
}
