export class InvalidLogRequestError extends Error {
  readonly field: string;

  constructor(field: string, detail: string) {
    super(`Invalid log request at "${field}": ${detail}`);
    this.name = "InvalidLogRequestError";
    this.field = field;
  }
}
