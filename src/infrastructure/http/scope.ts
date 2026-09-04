// src/infrastructure/http/scope.ts
import { randomUUID } from "node:crypto";

import type { ApplicationServices } from "#application/ApplicationServices";

/**
 * Dependencias disponibles durante una peticion HTTP, junto con su
 * identificador local de correlacion.
 */
export type RequestScope = ApplicationServices & {
  requestId: string;
};

/**
 * Crea un scope manual por peticion reutilizando los servicios de aplicacion y
 * generando un `requestId` nuevo para esa ejecucion.
 */
export function makeRequestScope(services: ApplicationServices): RequestScope {
  return {
    ...services,
    requestId: randomUUID(),
  };
}
