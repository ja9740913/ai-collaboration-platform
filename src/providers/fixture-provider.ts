import { ProviderError } from "../errors.ts";
import type { ProviderErrorCode } from "../errors.ts";
import type { AgentProvider, ProviderRequest, ReviewRole } from "../types.ts";

export type FixtureStep =
  | { type: "success"; value: unknown }
  | {
      type: "error";
      code: ProviderErrorCode;
      message: string;
      retryable: boolean;
      retryAfterMs?: number;
    };

export type FixtureScript = Record<ReviewRole, FixtureStep[]>;

export class FixtureProvider implements AgentProvider {
  readonly #script: FixtureScript;
  readonly #cursor = new Map<ReviewRole, number>();

  constructor(script: FixtureScript) {
    this.#script = script;
  }

  async run(request: ProviderRequest): Promise<unknown> {
    const index = this.#cursor.get(request.role) ?? 0;
    const steps = this.#script[request.role];
    const step = steps[index];
    this.#cursor.set(request.role, index + 1);
    if (!step) {
      throw new ProviderError("UNKNOWN", `角色 ${request.role} 沒有第 ${index + 1} 筆 Fixture。`, {
        retryable: false,
      });
    }
    if (step.type === "error") {
      throw new ProviderError(step.code, step.message, {
        retryable: step.retryable,
        retryAfterMs: step.retryAfterMs,
      });
    }
    return structuredClone(step.value);
  }

  callsFor(role: ReviewRole): number {
    return this.#cursor.get(role) ?? 0;
  }
}
