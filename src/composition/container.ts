import type { ApplicationServices } from "#application/ApplicationServices";
import type { AppContext } from "#application/AppContext";
import { AddItemToOrder } from "#application/use-cases/AddItemToOrderUseCase";
import { CreateOrder } from "#application/use-cases/CreateOrderUseCase";
import { GetOrderItems } from "#application/use-cases/GetOrderItemsUseCase";
import type { ConcreteAppContext } from "#composition/ConcreteAppContext";
import type { Config } from "#composition/config";
import { buildDevelopmentContext } from "#composition/environments/development";
import { buildProductionContext } from "#composition/environments/production";
import { buildTestContext } from "#composition/environments/test";

export type Container = ApplicationServices;

export function buildAppContext(config: Config): ConcreteAppContext {
  switch (config.NODE_ENV) {
    case "development":
      return buildDevelopmentContext(config);
    case "test":
      return buildTestContext(config);
    case "production":
      return buildProductionContext(config);
  }
}

export function createContainer(context: AppContext): ApplicationServices {
  const addItemToOrder = new AddItemToOrder(context);
  const createOrder = new CreateOrder(context);
  const getOrderItems = new GetOrderItems(context);

  return {
    useCases: {
      addItemToOrder,
      createOrder,
      getOrderItems,
    },
  };
}
