import type { OrderRepository } from "#application/ports/OrderRepository";
import { CustomerId, Order, OrderId } from "#domain/entities/Order";

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

    const order = Order.create(OrderId(input.orderId), CustomerId(input.customerId));

    await this.repo.save(order);

    return {
      orderId: order.id,
    };
  }

  public async excecute(input: CreateOrderInput): Promise<CreateOrderOutput> {
    return this.execute(input);
  }
}
