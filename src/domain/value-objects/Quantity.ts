// src/domain/value-objects/Quantity.ts
import { InvalidQuantity } from "#domain/errors/DomainErrors";

/**
 * Cantidad de unidades aceptada por las operaciones del pedido.
 *
 * El dominio solo permite cantidades enteras positivas; esta misma regla se
 * reutiliza al calcular subtotales monetarios con `Price.multiply`.
 */
export class Quantity {
  private constructor(public readonly value: number) {}

  /**
   * @throws InvalidQuantity Si el valor no es un entero positivo.
   */
  public static create(value: number): Quantity {
    if (!Number.isInteger(value) || value <= 0) {
      throw new InvalidQuantity();
    }

    return new Quantity(value);
  }

  public equals(other: Quantity): boolean {
    return this.value === other.value;
  }
}
