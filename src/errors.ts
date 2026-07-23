export type ProviderErrorCode =
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "TEMPORARY_UNAVAILABLE"
  | "INVALID_OUTPUT"
  | "PERMISSION_DENIED"
  | "UNKNOWN";

export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly retryable: boolean;
  readonly retryAfterMs?: number;

  constructor(
    code: ProviderErrorCode,
    message: string,
    options: { retryable: boolean; retryAfterMs?: number },
  ) {
    super(message);
    this.name = "ProviderError";
    this.code = code;
    this.retryable = options.retryable;
    this.retryAfterMs = options.retryAfterMs;
  }
}

export function toProviderError(error: unknown): ProviderError {
  if (error instanceof ProviderError) return error;
  return new ProviderError("UNKNOWN", error instanceof Error ? error.message : String(error), {
    retryable: false,
  });
}
