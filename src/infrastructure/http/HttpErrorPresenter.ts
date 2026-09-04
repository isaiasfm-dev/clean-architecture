// src/infrastructure/http/HttpErrorPresenter.ts
import type { ApplicationError } from "#application/errors/ApplicationErrors";

/**
 * Respuesta HTTP resultante de traducir un error controlado de aplicacion.
 */
export type HttpErrorResponse = {
  statusCode: number;
  body: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
};

/**
 * Traduce las categorias de `ApplicationError` que tienen una respuesta HTTP
 * explicita. Los errores no contemplados se presentan como un fallo generico
 * de dependencia con estado 500.
 */
export function presentApplicationError(error: ApplicationError): HttpErrorResponse {
  if (error.type === "validation") {
    return {
      statusCode: 400,
      body: {
        code: "validation_error",
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    };
  }

  if (error.type === "not_found") {
    return {
      statusCode: 404,
      body: {
        code: "not_found",
        message: `${error.resource} not found`,
      },
    };
  }

  if (error.type === "conflict") {
    return {
      statusCode: 409,
      body: {
        code: "conflict",
        message: error.message,
      },
    };
  }

  return {
    statusCode: 500,
    body: {
      code: "dependency_failure",
      message: "Unexpected dependency failure",
    },
  };
}
