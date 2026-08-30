import { describe, expect, it } from "vitest";

import { getHealthStatus } from "#shared/health";

describe("getHealthStatus", () => {
  it("returns ok", () => {
    expect(getHealthStatus()).toBe("ok");
  });
});
