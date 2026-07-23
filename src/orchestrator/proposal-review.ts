import { computeInputHash } from "../input-hash.ts";
import { withRetry } from "../retry-policy.ts";
import { parseAgentReview } from "../schemas/review-output.ts";
import { REVIEW_ROLES } from "../types.ts";
import type { RetryPolicy } from "../retry-policy.ts";
import type {
  AgentProvider,
  AgentReview,
  ProposalDecision,
  ProposalReviewRequest,
  ReviewRole,
  RunStore,
  WorkflowCheckpoint,
  WorkflowEvent,
  WorkflowResult,
} from "../types.ts";

export interface ReviewWorkflowDependencies {
  provider: AgentProvider;
  store: RunStore;
  runId?: string;
  retryPolicy?: Partial<RetryPolicy>;
  sleep?: (ms: number) => Promise<void>;
  now?: () => string;
}

function validateInput(input: ProposalReviewRequest): void {
  if (!input.question.trim()) throw new Error("question 不可空白。");
  if (!Array.isArray(input.constraints) || !input.constraints.every((item) => typeof item === "string")) {
    throw new Error("constraints 必須是字串陣列。");
  }
  if (!Array.isArray(input.successMetrics) || !input.successMetrics.every((item) => typeof item === "string")) {
    throw new Error("successMetrics 必須是字串陣列。");
  }
}

function unique(items: string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

export function synthesizeDecision(input: ProposalReviewRequest, reviews: AgentReview[]): ProposalDecision {
  const blockCount = reviews.filter((review) => review.stance === "block").length;
  const cautionCount = reviews.filter((review) => review.stance === "caution").length;
  const recommendation = blockCount >= 2 ? "stop" : blockCount + cautionCount > 0 ? "pilot_with_gates" : "proceed";
  const materialFindings = reviews.flatMap((review) =>
    review.findings.filter((finding) => finding.severity === "critical" || finding.severity === "high"),
  );
  const requiredControls = unique(
    (materialFindings.length > 0 ? materialFindings : reviews.flatMap((review) => review.findings))
      .map((finding) => finding.recommendation),
  );
  const stanceSummary = unique(reviews.map((review) => `${review.role}:${review.stance}`));

  return {
    recommendation,
    rationale: reviews.map((review) => `${review.role}｜${review.summary}`),
    requiredControls,
    acceptanceTests: unique([
      ...input.successMetrics,
      "權限與資料邊界測試全部通過",
      "模型失敗時可轉人工並保留上下文",
      "結構化輸出不合法時會被拒絕或重試",
    ]),
    disagreements: new Set(reviews.map((review) => review.stance)).size > 1
      ? [`三個角色立場不完全一致：${stanceSummary.join("、")}`]
      : [],
  };
}

export async function reviewProposal(
  input: ProposalReviewRequest,
  dependencies: ReviewWorkflowDependencies,
): Promise<WorkflowResult> {
  validateInput(input);
  const inputHash = computeInputHash(input);
  const runId = dependencies.runId ?? `proposal-${inputHash}`;
  const now = dependencies.now ?? (() => new Date().toISOString());
  const events: WorkflowEvent[] = [];
  const emit = (event: Omit<WorkflowEvent, "at">): void => {
    events.push({ at: now(), ...event });
  };

  const existing = await dependencies.store.load(runId);
  if (existing && existing.inputHash !== inputHash) {
    throw new Error("Checkpoint 的 inputHash 與本次輸入不一致，拒絕錯誤續跑。");
  }

  const completed: Partial<Record<ReviewRole, AgentReview>> = { ...(existing?.completed ?? {}) };
  let persistQueue = Promise.resolve();
  const persist = (status: WorkflowCheckpoint["status"], decision?: ProposalDecision): Promise<void> => {
    const snapshot: WorkflowCheckpoint = {
      version: 1,
      runId,
      inputHash,
      completed: structuredClone(completed),
      decision,
      status,
      updatedAt: now(),
    };
    persistQueue = persistQueue.then(() => dependencies.store.save(snapshot));
    return persistQueue;
  };

  emit({ type: "run_started", detail: `開始提案評審；inputHash=${inputHash}` });
  await persist(existing?.status === "completed" ? "completed" : "running", existing?.decision);

  const tasks = REVIEW_ROLES.map(async (role) => {
    const cached = completed[role];
    if (cached) {
      emit({ type: "checkpoint_hit", role, detail: `角色 ${role} 使用已驗證 Checkpoint。` });
      return cached;
    }

    emit({ type: "role_started", role, detail: `角色 ${role} 開始評審。`, attempt: 1 });
    const review = await withRetry(
      async (attempt) => {
        const raw = await dependencies.provider.run({ role, input, attempt });
        return parseAgentReview(raw, role);
      },
      {
        policy: dependencies.retryPolicy,
        sleep: dependencies.sleep,
        onRetry: (notice) => {
          emit({
            type: "retry_scheduled",
            role,
            attempt: notice.nextAttempt,
            detail: `${notice.error.code}；${notice.waitMs}ms 後執行第 ${notice.nextAttempt} 次。`,
          });
        },
      },
    );
    completed[role] = review;
    emit({ type: "role_completed", role, detail: `角色 ${role} 完成；立場=${review.stance}。` });
    await persist("running");
    return review;
  });

  const settled = await Promise.allSettled(tasks);
  await persistQueue;
  const failure = settled.find((result): result is PromiseRejectedResult => result.status === "rejected");
  if (failure) {
    emit({
      type: "run_failed",
      detail: failure.reason instanceof Error ? failure.reason.message : String(failure.reason),
    });
    await persist("failed");
    return {
      runId,
      inputHash,
      status: "failed",
      reviews: REVIEW_ROLES.flatMap((role) => (completed[role] ? [completed[role]] : [])),
      events,
    };
  }

  const reviews = REVIEW_ROLES.map((role) => completed[role]).filter((review): review is AgentReview => Boolean(review));
  const decision = existing?.decision ?? synthesizeDecision(input, reviews);
  emit({ type: "run_completed", detail: `評審完成；建議=${decision.recommendation}。` });
  await persist("completed", decision);

  return { runId, inputHash, status: "completed", reviews, decision, events };
}
