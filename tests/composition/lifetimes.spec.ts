import { describe, expect, it } from "vitest";

import { appContextLifetimes, requestScopeLifetimes } from "#composition/lifetimes";

describe("appContextLifetimes", () => {
  it("documents application-wide singleton dependencies", () => {
    expect(appContextLifetimes).toEqual({
      orderRepository: "singleton",
      unitOfWork: "singleton",
      priceProvider: "singleton",
      clock: "singleton",
    });
  });

  it("documents request-scoped dependencies", () => {
    expect(requestScopeLifetimes).toEqual({
      requestId: "scoped",
    });
  });
});
