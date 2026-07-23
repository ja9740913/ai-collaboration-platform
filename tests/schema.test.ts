import assert from "node:assert/strict";
import test from "node:test";
import { parseAgentReview } from "../src/schemas/review-output.ts";

const valid = {
  role: "risk",
  stance: "caution",
  summary: "需要受限試點。",
  findings: [
    {
      id: "f-1",
      title: "資料邊界",
      severity: "high",
      evidence: "輸入可能含個資。",
      recommendation: "先遮罩再送入模型。",
    },
  ],
  confidence: 0.9,
};

test("合法結構化輸出可通過驗證", () => {
  assert.deepEqual(parseAgentReview(valid, "risk"), valid);
});

test("角色或 severity 不符時會被拒絕", () => {
  assert.throws(() => parseAgentReview({ ...valid, role: "delivery" }, "risk"), /role 必須是 risk/);
  assert.throws(
    () => parseAgentReview({ ...valid, findings: [{ ...valid.findings[0], severity: "urgent" }] }, "risk"),
    /severity 不合法/,
  );
});
