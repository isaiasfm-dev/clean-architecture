// src/application/dtos/FindOrdersByCustomerIdDto.ts
import type { MoneyDto } from "#application/dtos/OrderDto";

export type FindOrdersByCustomerIdInputDto = {
  customerId: string;
};

export type CustomerOrderDto = {
  orderId: string;
  totalPrice: MoneyDto;
};

export type FindOrdersByCustomerIdOutputDto = {
  customerId: string;
  orders: CustomerOrderDto[];
};
