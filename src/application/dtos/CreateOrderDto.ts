// src/application/dtos/CreateOrderDto.ts
export type CreateOrderInputDto = {
  orderId: string;
  customerId: string;
};

export type CreateOrderOutputDto = {
  orderId: string;
};
