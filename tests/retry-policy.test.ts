import assert from "node:assert/strict";
import test from "node:test";
import { ProviderError } from "../src/errors.ts";
import { withRetry } from "../src/retry-policy.ts";

test("暫時性錯誤會依政策重試並尊重 retryAfterMs", async () => {
  let calls = 0;
  const waits: number[] = [];
  const value = await withRetry(
    async () => {
      calls += 1;
      if (calls === 1) {
        throw new ProviderError("RATE_LIMITED", "暫時受限", { retryable: true, retryAfterMs: 80 });
      }
      return "ok";
    },
    {
      policy: { attempts: 3, delayMs: 10, backoffMs: 20 },
      sleep: async (ms) => {
        waits.push(ms);
      },
    },
  );
  assert.equal(value, "ok");
  assert.equal(calls, 2);
  assert.deepEqual(waits, [80]);
});

test("永久性錯誤不會重試", async () => {
  let calls = 0;
  await assert.rejects(
    withRetry(async () => {
      calls += 1;
      throw new ProviderError("PERMISSION_DENIED", "未授權", { retryable: false });
    }),
    /未授權/,
  );
  assert.equal(calls, 1);
});
