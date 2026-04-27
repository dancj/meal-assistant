export { MissingEnvVarError } from "@/lib/plan/errors";

export class ResendUpstreamError extends Error {
  readonly resendErrorName: string | undefined;

  constructor(detail: string, resendErrorName?: string) {
    const namePart = resendErrorName ? ` (${resendErrorName})` : "";
    super(`Resend upstream error${namePart}: ${detail}`);
    this.name = "ResendUpstreamError";
    this.resendErrorName = resendErrorName;
  }
}
