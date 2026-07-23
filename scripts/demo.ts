import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { reviewProposal } from "../src/orchestrator/proposal-review.ts";
import { FixtureProvider } from "../src/providers/fixture-provider.ts";
import type { FixtureScript } from "../src/providers/fixture-provider.ts";
import { MemoryRunStore } from "../src/recovery/run-store.ts";
import type { ProposalReviewRequest } from "../src/types.ts";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const input = JSON.parse(await readFile(join(root, "fixtures", "customer-service-case.json"), "utf8")) as ProposalReviewRequest;
const script = JSON.parse(await readFile(join(root, "fixtures", "provider-responses.json"), "utf8")) as FixtureScript;
const provider = new FixtureProvider(script);
const store = new MemoryRunStore();
let tick = 0;
const result = await reviewProposal(input, {
  provider,
  store,
  runId: "public-proposal-review",
  retryPolicy: { attempts: 3, delayMs: 0, backoffMs: 0 },
  sleep: async () => undefined,
  now: () => new Date(Date.UTC(2026, 6, 23, 0, 0, tick++)).toISOString(),
});

console.log("\n多 AI 提案評審｜匿名 Fixture 執行結果\n");
for (const event of result.events) {
  console.log(`${event.at}  ${event.type.padEnd(18)} ${event.role ?? "workflow"}  ${event.detail}`);
}
console.log("\n結構化決策：");
console.log(JSON.stringify(result.decision, null, 2));
