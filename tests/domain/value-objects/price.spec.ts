import { describe, expect, it } from "vitest";

import { Price } from "#domain/value-objects/Price";

describe("Price", () => {
  it("no permite negativos y redondea a 2 decimales", () => {
    expect(() => Price.create(-1, "EUR")).toThrow();

    const price = Price.create(12.345, "EUR");

    expect(price.amount).toBe(12.35);
  });

  it("suma precios con la misma moneda", () => {
    const total = Price.create(10, "EUR").add(Price.create(5, "EUR"));

    expect(total.amount).toBe(15);
    expect(total.currency).toBe("EUR");
  });

  it("multiplica por una cantidad entera positiva", () => {
    const total = Price.create(10, "EUR").multiply(2);

    expect(total.amount).toBe(20);
  });
});
