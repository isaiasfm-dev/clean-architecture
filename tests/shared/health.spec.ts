import { describe, expect, it } from "vitest";

import { getHealthStatus } from "../../src/shared/health.js";

describe("getHealthStatus", () => {
  it("returns ok", () => {
    expect(getHealthStatus()).toBe("ok");
  });
});
