import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { reviewProposal } from "../src/orchestrator/proposal-review.ts";
import { FixtureProvider } from "../src/providers/fixture-provider.ts";
import type { FixtureScript } from "../src/providers/fixture-provider.ts";
import { MemoryRunStore } from "../src/recovery/run-store.ts";
import type { AgentProvider, ProposalReviewRequest, ProviderRequest } from "../src/types.ts";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

async function loadFixtures(): Promise<{ input: ProposalReviewRequest; script: FixtureScript }> {
  const input = JSON.parse(await readFile(join(root, "fixtures", "customer-service-case.json"), "utf8")) as ProposalReviewRequest;
  const script = JSON.parse(await readFile(join(root, "fixtures", "provider-responses.json"), "utf8")) as FixtureScript;
  return { input, script };
}

test("三角色提案評審會產生可驗收決策並記錄重試", async () => {
  const { input, script } = await loadFixtures();
  const provider = new FixtureProvider(script);
  const store = new MemoryRunStore();
  const result = await reviewProposal(input, {
    provider,
    store,
    runId: "review-test",
    retryPolicy: { attempts: 3, delayMs: 0, backoffMs: 0 },
    sleep: async () => undefined,
    now: () => "2026-07-23T00:00:00.000Z",
  });

  assert.equal(result.status, "completed");
  assert.equal(result.reviews.length, 3);
  assert.equal(result.decision?.recommendation, "pilot_with_gates");
  assert.equal(provider.callsFor("risk"), 2);
  assert.equal(provider.callsFor("delivery"), 1);
  assert.equal(provider.callsFor("user"), 1);
  assert.ok(result.events.some((event) => event.type === "retry_scheduled" && event.role === "risk"));
  assert.ok(result.decision?.requiredControls.some((item) => item.includes("轉人工")));
  assert.equal((await store.load("review-test"))?.status, "completed");
});

test("相同 inputHash 續跑時直接使用三個 Checkpoint", async () => {
  const { input, script } = await loadFixtures();
  const store = new MemoryRunStore();
  const first = await reviewProposal(input, {
    provider: new FixtureProvider(script),
    store,
    runId: "resume-test",
    retryPolicy: { delayMs: 0, backoffMs: 0 },
    sleep: async () => undefined,
  });
  assert.equal(first.status, "completed");

  let unexpectedCalls = 0;
  const failIfCalled: AgentProvider = {
    async run(_request: ProviderRequest): Promise<unknown> {
      unexpectedCalls += 1;
      throw new Error("續跑不應再次呼叫 Provider");
    },
  };
  const resumed = await reviewProposal(input, { provider: failIfCalled, store, runId: "resume-test" });
  assert.equal(resumed.status, "completed");
  assert.equal(unexpectedCalls, 0);
  assert.equal(resumed.events.filter((event) => event.type === "checkpoint_hit").length, 3);
  assert.deepEqual(resumed.decision, first.decision);
});

test("相同 runId 但輸入改變時拒絕錯誤續跑", async () => {
  const { input, script } = await loadFixtures();
  const store = new MemoryRunStore();
  await reviewProposal(input, {
    provider: new FixtureProvider(script),
    store,
    runId: "hash-guard",
    retryPolicy: { delayMs: 0, backoffMs: 0 },
    sleep: async () => undefined,
  });

  await assert.rejects(
    reviewProposal(
      { ...input, question: `${input.question}（範圍已改變）` },
      { provider: new FixtureProvider(script), store, runId: "hash-guard" },
    ),
    /inputHash.*不一致/,
  );
});
