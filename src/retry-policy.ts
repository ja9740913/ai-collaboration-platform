import { ProviderError, toProviderError } from "./errors.ts";

export interface RetryPolicy {
  attempts: number;
  delayMs: number;
  backoffMs: number;
}

export interface RetryNotice {
  attempt: number;
  nextAttempt: number;
  waitMs: number;
  error: ProviderError;
}

export interface RetryOptions {
  policy?: Partial<RetryPolicy>;
  sleep?: (ms: number) => Promise<void>;
  onRetry?: (notice: RetryNotice) => Promise<void> | void;
}

const DEFAULT_POLICY: RetryPolicy = {
  attempts: 3,
  delayMs: 250,
  backoffMs: 500,
};

export async function withRetry<T>(task: (attempt: number) => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const policy = { ...DEFAULT_POLICY, ...options.policy };
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  if (!Number.isInteger(policy.attempts) || policy.attempts < 1) {
    throw new Error("attempts 必須是大於 0 的整數。");
  }

  for (let attempt = 1; attempt <= policy.attempts; attempt += 1) {
    try {
      return await task(attempt);
    } catch (error) {
      const providerError = toProviderError(error);
      if (!providerError.retryable || attempt >= policy.attempts) throw providerError;
      const linearBackoff = policy.delayMs + Math.max(0, attempt - 1) * policy.backoffMs;
      const waitMs = Math.max(providerError.retryAfterMs ?? 0, linearBackoff);
      await options.onRetry?.({ attempt, nextAttempt: attempt + 1, waitMs, error: providerError });
      await sleep(waitMs);
    }
  }

  throw new Error("重試流程發生不可達狀態。");
}
