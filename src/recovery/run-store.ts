import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import type { RunStore, WorkflowCheckpoint } from "../types.ts";

function cloneCheckpoint(checkpoint: WorkflowCheckpoint): WorkflowCheckpoint {
  return structuredClone(checkpoint);
}

export class MemoryRunStore implements RunStore {
  readonly #runs = new Map<string, WorkflowCheckpoint>();

  async load(runId: string): Promise<WorkflowCheckpoint | undefined> {
    const checkpoint = this.#runs.get(runId);
    return checkpoint ? cloneCheckpoint(checkpoint) : undefined;
  }

  async save(checkpoint: WorkflowCheckpoint): Promise<void> {
    this.#runs.set(checkpoint.runId, cloneCheckpoint(checkpoint));
  }
}

function assertSafeRunId(runId: string): void {
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(runId)) {
    throw new Error("runId 僅能包含英數字、底線與連字號，長度上限 80。 ");
  }
}

export class FileRunStore implements RunStore {
  readonly #directory: string;

  constructor(directory: string) {
    this.#directory = directory;
  }

  async load(runId: string): Promise<WorkflowCheckpoint | undefined> {
    assertSafeRunId(runId);
    try {
      const raw = await readFile(join(this.#directory, `${runId}.json`), "utf8");
      return JSON.parse(raw) as WorkflowCheckpoint;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    }
  }

  async save(checkpoint: WorkflowCheckpoint): Promise<void> {
    assertSafeRunId(checkpoint.runId);
    await mkdir(this.#directory, { recursive: true });
    const target = join(this.#directory, `${checkpoint.runId}.json`);
    const temporary = `${target}.${randomUUID()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(checkpoint, null, 2)}\n`, "utf8");
    await rename(temporary, target);
  }
}
