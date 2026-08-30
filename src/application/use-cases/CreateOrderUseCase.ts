import type { Order } from "#domain/entities/Order";
import type { OrderRepository } from "#application/ports/OrderRepository";

export type CreateOrderInput = {
  orderId: string;
  customerId: string;
};

export type CreateOrderOutput = {
  orderId: string;
};

export class CreateOrder {
  public constructor(private readonly repo: OrderRepository) {}

  public async execute(input: CreateOrderInput): Promise<CreateOrderOutput> {
    const exists = await this.repo.findById(input.orderId);

    if (exists) {
      throw new Error("Order already exists");
    }

    const order: Order = {
      id: input.orderId,
      customerId: input.customerId,
    };

    await this.repo.save(order);

    return {
      orderId: order.id,
    };
  }

  public async excecute(input: CreateOrderInput): Promise<CreateOrderOutput> {
    return this.execute(input);
  }
}
