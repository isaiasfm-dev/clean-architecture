// src/domain/errors/DomainErrors.ts
export class InvalidPrice extends Error {
  public constructor(message = "Invalid price") {
    super(message);
    this.name = "InvalidPrice";
  }
}

/**
 * Indica que una operacion monetaria mezclaria importes expresados en monedas
 * distintas.
 */
export class CurrencyMismatch extends Error {
  public constructor(message = "Currency mismatch") {
    super(message);
    this.name = "CurrencyMismatch";
  }
}

export class InvalidQuantity extends Error {
  public constructor(message = "Invalid quantity") {
    super(message);
    this.name = "InvalidQuantity";
  }
}
