import assert from "node:assert/strict";
import test from "node:test";
import { computeInputHash, stableStringify } from "../src/input-hash.ts";

test("stableStringify 不受物件鍵順序影響", () => {
  const left = { question: "Q", nested: { b: 2, a: 1 }, list: [3, 2, 1] };
  const right = { list: [3, 2, 1], nested: { a: 1, b: 2 }, question: "Q" };
  assert.equal(stableStringify(left), stableStringify(right));
  assert.equal(computeInputHash(left), computeInputHash(right));
});

test("語意輸入改變時 inputHash 也會改變", () => {
  assert.notEqual(computeInputHash({ question: "A" }), computeInputHash({ question: "B" }));
});
