import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { FileRunStore } from "../src/recovery/run-store.ts";
import type { WorkflowCheckpoint } from "../src/types.ts";

test("FileRunStore 可以跨實例讀回 Checkpoint", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ai-workflow-proof-"));
  try {
    const checkpoint: WorkflowCheckpoint = {
      version: 1,
      runId: "safe-run-1",
      inputHash: "abc123",
      completed: {},
      status: "running",
      updatedAt: "2026-07-23T00:00:00.000Z",
    };
    await new FileRunStore(directory).save(checkpoint);
    assert.deepEqual(await new FileRunStore(directory).load("safe-run-1"), checkpoint);
  } finally {
    assert.ok(directory.startsWith(tmpdir()));
    await rm(directory, { recursive: true, force: true });
  }
});

test("FileRunStore 拒絕路徑穿越 runId", async () => {
  const store = new FileRunStore(tmpdir());
  await assert.rejects(store.load("../private"), /runId/);
});
