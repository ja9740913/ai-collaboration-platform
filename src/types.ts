export const REVIEW_ROLES = ["risk", "delivery", "user"] as const;

export type ReviewRole = (typeof REVIEW_ROLES)[number];
export type Severity = "low" | "medium" | "high" | "critical";
export type Stance = "support" | "caution" | "block";

export interface ProposalReviewRequest {
  question: string;
  constraints: string[];
  successMetrics: string[];
}

export interface ProviderRequest {
  role: ReviewRole;
  input: ProposalReviewRequest;
  attempt: number;
}

export interface AgentFinding {
  id: string;
  title: string;
  severity: Severity;
  evidence: string;
  recommendation: string;
}

export interface AgentReview {
  role: ReviewRole;
  stance: Stance;
  summary: string;
  findings: AgentFinding[];
  confidence: number;
}

export interface ProposalDecision {
  recommendation: "proceed" | "pilot_with_gates" | "stop";
  rationale: string[];
  requiredControls: string[];
  acceptanceTests: string[];
  disagreements: string[];
}

export type WorkflowEventType =
  | "run_started"
  | "checkpoint_hit"
  | "role_started"
  | "retry_scheduled"
  | "role_completed"
  | "run_completed"
  | "run_failed";

export interface WorkflowEvent {
  at: string;
  type: WorkflowEventType;
  role?: ReviewRole;
  detail: string;
  attempt?: number;
}

export interface WorkflowCheckpoint {
  version: 1;
  runId: string;
  inputHash: string;
  completed: Partial<Record<ReviewRole, AgentReview>>;
  decision?: ProposalDecision;
  status: "running" | "completed" | "failed";
  updatedAt: string;
}

export interface WorkflowResult {
  runId: string;
  inputHash: string;
  status: "completed" | "failed";
  reviews: AgentReview[];
  decision?: ProposalDecision;
  events: WorkflowEvent[];
}

export interface AgentProvider {
  run(request: ProviderRequest): Promise<unknown>;
}

export interface RunStore {
  load(runId: string): Promise<WorkflowCheckpoint | undefined>;
  save(checkpoint: WorkflowCheckpoint): Promise<void>;
}
