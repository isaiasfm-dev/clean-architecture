// src/application/dtos/AddItemToOrderDto.ts
export type AddItemToOrderInputDto = {
  orderId: string;
  sku: string;
  quantity: number;
};

export type MoneyDto = {
  amount: number;
  currency: string;
};

export type AddItemToOrderOutputDto = {
  orderId: string;
  sku: string;
  quantity: number;
  unitPrice: MoneyDto;
  addedAt: string;
};
