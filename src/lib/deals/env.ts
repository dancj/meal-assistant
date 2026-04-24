import { InvalidZipError } from "./errors";

const ZIP_PATTERN = /^\d{5}$/;

export function readEnvZip(name: string, fallback: string): string {
  const raw = process.env[name];
  const trimmed = (raw ?? "").trim();
  if (trimmed === "") {
    return fallback;
  }
  if (!ZIP_PATTERN.test(trimmed)) {
    throw new InvalidZipError(name, trimmed);
  }
  return trimmed;
}
