// src/application/ApplicationServices.ts
import type { OrdersUseCases } from "#application/use-cases/OrdersUseCases";

export type ApplicationServices = {
  useCases: OrdersUseCases;
};
