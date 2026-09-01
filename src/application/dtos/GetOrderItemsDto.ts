// src/application/dtos/GetOrderItemsDto.ts
export type GetOrderItemsInputDto = {
  orderId: string;
};

export type GetOrderItemsOutputDto = {
  orderId: string;
  items: {
    sku: string;
    quantity: number;
    unitPrice: {
      amount: number;
      currency: string;
    };
  }[];
};
