import { REVIEW_ROLES } from "../types.ts";
import type { AgentFinding, AgentReview, ReviewRole, Severity, Stance } from "../types.ts";

const SEVERITIES = ["low", "medium", "high", "critical"] as const;
const STANCES = ["support", "caution", "block"] as const;

export const reviewOutputJsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  additionalProperties: false,
  required: ["role", "stance", "summary", "findings", "confidence"],
  properties: {
    role: { enum: REVIEW_ROLES },
    stance: { enum: STANCES },
    summary: { type: "string", minLength: 1 },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "severity", "evidence", "recommendation"],
        properties: {
          id: { type: "string", minLength: 1 },
          title: { type: "string", minLength: 1 },
          severity: { enum: SEVERITIES },
          evidence: { type: "string", minLength: 1 },
          recommendation: { type: "string", minLength: 1 }
        }
      }
    },
    confidence: { type: "number", minimum: 0, maximum: 1 }
  }
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === "string" && values.includes(value as T);
}

function requireText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} 必須是非空字串。`);
  }
  return value.trim();
}

function parseFinding(value: unknown, index: number): AgentFinding {
  if (!isRecord(value)) throw new Error(`findings[${index}] 必須是物件。`);
  const severity = value.severity;
  if (!isOneOf<Severity>(severity, SEVERITIES)) {
    throw new Error(`findings[${index}].severity 不合法。`);
  }
  return {
    id: requireText(value.id, `findings[${index}].id`),
    title: requireText(value.title, `findings[${index}].title`),
    severity,
    evidence: requireText(value.evidence, `findings[${index}].evidence`),
    recommendation: requireText(value.recommendation, `findings[${index}].recommendation`),
  };
}

export function parseAgentReview(value: unknown, expectedRole: ReviewRole): AgentReview {
  if (!isRecord(value)) throw new Error("Agent 輸出必須是物件。");
  if (!isOneOf<ReviewRole>(value.role, REVIEW_ROLES) || value.role !== expectedRole) {
    throw new Error(`role 必須是 ${expectedRole}。`);
  }
  if (!isOneOf<Stance>(value.stance, STANCES)) throw new Error("stance 不合法。");
  if (!Array.isArray(value.findings)) throw new Error("findings 必須是陣列。");
  if (typeof value.confidence !== "number" || value.confidence < 0 || value.confidence > 1) {
    throw new Error("confidence 必須介於 0 與 1。 ");
  }
  return {
    role: value.role,
    stance: value.stance,
    summary: requireText(value.summary, "summary"),
    findings: value.findings.map(parseFinding),
    confidence: value.confidence,
  };
}
