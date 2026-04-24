import type { Store } from "./types";

export class InvalidZipError extends Error {
  readonly varName: string;

  constructor(varName: string, value: string) {
    super(`${varName} must be a 5-digit ZIP (got "${value}")`);
    this.name = "InvalidZipError";
    this.varName = varName;
  }
}

export class FlippUpstreamError extends Error {
  readonly status: number;
  readonly store: Store;

  constructor(store: Store, status: number) {
    super(`Flipp upstream error for ${store} (status ${status})`);
    this.name = "FlippUpstreamError";
    this.status = status;
    this.store = store;
  }
}

export class FlippNetworkError extends Error {
  readonly store: Store;

  constructor(store: Store, cause: unknown) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    super(`Flipp network error for ${store}: ${detail}`);
    this.name = "FlippNetworkError";
    this.store = store;
    this.cause = cause;
  }
}
