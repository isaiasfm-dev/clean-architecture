// src/infrastructure/http/scope.ts
import { randomUUID } from "node:crypto";

import type { ApplicationServices } from "#application/ApplicationServices";

export type RequestScope = ApplicationServices & {
  requestId: string;
};

export function makeRequestScope(services: ApplicationServices): RequestScope {
  return {
    ...services,
    requestId: randomUUID(),
  };
}
