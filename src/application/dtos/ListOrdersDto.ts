// src/application/dtos/ListOrdersDto.ts
import type { MoneyDto } from "#application/dtos/OrderDto";

export type ListedOrderDto = {
  orderId: string;
  customerId: string;
  totalPrice: MoneyDto;
};

export type ListOrdersOutputDto = {
  orders: ListedOrderDto[];
};
