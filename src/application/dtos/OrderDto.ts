// src/application/dtos/OrderDto.ts
export type MoneyDto = {
  amount: number;
  currency: string;
};

export type OrderItemDto = {
  sku: string;
  quantity: number;
  unitPrice: MoneyDto;
  totalPrice: MoneyDto;
};

export type OrderDto = {
  orderId: string;
  customerId: string;
  items: OrderItemDto[];
  totalPrice: MoneyDto;
};
