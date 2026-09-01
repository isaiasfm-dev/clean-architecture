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

export type InfraError = {
  type: "infrastructure";
  message: string;
};

export type ApplicationError =
  | ValidationError
  | NotFoundError
  | ConflictError
  | InfraError;
