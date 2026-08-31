import type { ApplicationError } from "#application/errors/ApplicationErrors";

export type HttpErrorResponse = {
  statusCode: number;
  body: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
};

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
      code: "infrastructure_error",
      message: "Unexpected infrastructure error",
    },
  };
}
