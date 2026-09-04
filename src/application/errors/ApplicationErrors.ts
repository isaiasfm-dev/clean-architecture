// src/application/errors/ApplicationErrors.ts
export type ValidationError = {
  type: "validation";
  message: string;
  details?: Record<string, string>;
};

export type NotFoundError = {
  type: "not_found";
  resource: string;
  id: string;
};

export type ConflictError = {
  type: "conflict";
  message: string;
};

/**
 * Fallo de una dependencia coordinada por la aplicacion, presentado sin exponer
 * necesariamente la excepcion tecnica original al consumidor del caso de uso.
 */
export type DependencyFailure = {
  type: "dependency_failure";
  message: string;
};

/**
 * Union de errores controlados que los casos de uso devuelven mediante
 * `Result` en lugar de lanzarlos como excepciones esperadas.
 */
export type ApplicationError =
  | ValidationError
  | NotFoundError
  | ConflictError
  | DependencyFailure;
