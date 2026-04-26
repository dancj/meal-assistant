export class MissingEnvVarError extends Error {
  readonly varName: string;

  constructor(varName: string) {
    super(`${varName} environment variable is required`);
    this.name = "MissingEnvVarError";
    this.varName = varName;
  }
}

export class InvalidRequestError extends Error {
  readonly field: string;

  constructor(field: string, detail: string) {
    super(`Invalid request body at "${field}": ${detail}`);
    this.name = "InvalidRequestError";
    this.field = field;
  }
}

export class AnthropicUpstreamError extends Error {
  readonly status: number | undefined;

  constructor(status: number | undefined, detail?: string) {
    const statusPart = status === undefined ? "unknown" : String(status);
    const base = `Anthropic upstream error (status ${statusPart})`;
    super(detail ? `${base}: ${detail}` : base);
    this.name = "AnthropicUpstreamError";
    this.status = status;
  }
}

export class AnthropicNetworkError extends Error {
  constructor(cause: unknown) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    super(`Anthropic network error: ${detail}`);
    this.name = "AnthropicNetworkError";
    this.cause = cause;
  }
}

export class MalformedPlanError extends Error {
  readonly path: string;

  constructor(path: string, detail: string) {
    super(`Model returned malformed plan at "${path}": ${detail}`);
    this.name = "MalformedPlanError";
    this.path = path;
  }
}
