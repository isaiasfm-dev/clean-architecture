// src/application/dtos/GetOrderItemsDto.ts
export type GetOrderItemsInputDto = {
  orderId: string;
};

export type MoneyDto = {
  amount: number;
  currency: string;
};

export type GetOrderItemsOutputDto = {
  orderId: string;
  items: {
    sku: string;
    quantity: number;
    unitPrice: MoneyDto;
    totalPrice: MoneyDto;
  }[];
  totalPrice: MoneyDto;
};
