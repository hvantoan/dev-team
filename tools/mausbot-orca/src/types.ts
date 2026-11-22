export type SetupPolicy = 'run' | 'skip';

export interface ProjectConfig {
  /** Orca repo selector, for example `id:repo_123`. */
  repo: string;
  /** Absolute path used for the coordinator terminal worktree. */
  path: string;
  /** Orca agent id (`claude`, `codex`, `pi`, ...). */
  agent: string;
  base_branch?: string;
  setup?: SetupPolicy;
  /** Shell command that decides whether the delivered work passes. */
  check: string;
  /** Default scope when a TaskSpec does not carry one. */
  allow?: string[];
  deny?: string[];
}

export interface BridgeConfig {
  projects: Record<string, ProjectConfig>;
  defaults?: {
    max_attempts?: number;
    wait_timeout_ms?: number;
    approval_timeout_ms?: number;
    gate_timeout_ms?: number;
  };
  /** Optional submit allowlist. Empty or absent means "trusted caller". */
  allow?: { users?: string[] };
  chat?: { command?: string };
  orca?: { command?: string };
  /** Milliseconds before a chat send is retried from the outbox. */
  outbox_retry_ms?: number;
}

export interface TaskSpec {
  id: string;
  objective: string;
  context?: string[];
  scope?: { allow?: string[]; deny?: string[] };
  non_goals?: string[];
  done_when?: string[];
  model?: string | null;
  max_attempts?: number;
  deps?: string[];
  /** Set when the caller overrides the project agent. */
  agent?: string;
}

export type TaskStateName =
  | 'dispatching'
  | 'running'
  | 'gating'
  | 'done'
  | 'failed'
  | 'escalated'
  | 'paused'
  | 'orphaned';

export interface PendingItem {
  kind: 'question' | 'escalation';
  at: number;
  messageId?: string;
  dispatchId?: string;
  options?: string[];
}

export interface TaskRecord {
  requestId: string;
  thread: string;
  project: string;
  spec: TaskSpec;
  state: TaskStateName;
  createdAt: number;
  updatedAt: number;
  runId: string;
  taskId: string;
  dispatchId?: string;
  worktree?: string;
  attempts: number;
  lastError?: string;
  outcome?: string;
  pending?: PendingItem;
  sent: Record<string, number>;
}

export interface OutboxItem {
  thread: string;
  text: string;
  attempts: number;
  lastError?: string;
  nextAt: number;
  requestId?: string;
}

export interface BridgeState {
  version: 1;
  coordinator: { handle?: string; worktree?: string };
  runs: Record<string, string>;
  tasks: Record<string, TaskRecord>;
  threads: Record<string, string>;
  seenMessages: Record<string, number>;
  outbox: Record<string, OutboxItem>;
}

export interface DeliveryMessage {
  id: string;
  type: string;
  subject?: string;
  body?: string;
  payload?: Record<string, unknown>;
  handled?: boolean;
}

export interface WorkerInfo {
  dispatchId: string;
  taskId: string;
  state: string;
  stage?: string;
  workspace?: string;
  worktree?: string;
}

export interface WorkerStartOptions {
  taskId: string;
  runId: string;
  handle: string;
  repo: string;
  agent: string;
  setup: SetupPolicy;
  name: string;
  baseBranch?: string;
  model?: string | null;
  worktree?: string;
  retryOf?: string;
  comment?: string;
}

export interface OrcaPort {
  appVersion(): Promise<string>;
  repoList(): Promise<string[]>;
  agentInstalled(): Promise<string[]>;
  terminalCreate(worktree: string, title: string): Promise<string>;
  terminalList(): Promise<string[]>;
  terminalClose(handle: string): Promise<void>;
  runCreate(objective: string, handle: string): Promise<string>;
  runUse(runId: string, handle: string): Promise<void>;
  runList(): Promise<Array<{ id: string; objective: string }>>;
  taskCreate(spec: TaskSpec, runId: string, handle: string): Promise<string>;
  taskList(runId: string): Promise<Array<{ id: string; spec: string; status: string }>>;
  workerStart(options: WorkerStartOptions): Promise<string>;
  workerList(runId: string): Promise<WorkerInfo[]>;
  workerShow(dispatchId: string): Promise<WorkerInfo>;
  checkWait(runId: string, handle: string, timeoutMs: number): Promise<DeliveryMessage[]>;
  inbox(runId: string): Promise<DeliveryMessage[]>;
  reply(messageId: string, body: string, runId: string, handle: string): Promise<void>;
  deny(dispatchId: string, promptId: string, reason: string, handle: string): Promise<void>;
}

export interface ChatPort {
  send(thread: string, text: string, sendId: string): Promise<void>;
}

export interface Clock {
  now(): number;
  sleep(ms: number): Promise<void>;
}

export type Logger = (line: string) => void;

export interface SubmitRequest {
  thread: string;
  project: string;
  spec: TaskSpec;
  requestId: string;
  user?: string;
}

export interface SubmitResult {
  ok: true;
  duplicate: boolean;
  requestId: string;
  taskId: string;
  runId: string;
}

export interface AnswerRequest {
  thread: string;
  text: string;
  requestId?: string;
}

export const DEFAULTS = {
  maxAttempts: 2,
  waitTimeoutMs: 30_000,
  approvalTimeoutMs: 1_800_000,
  gateTimeoutMs: 1_800_000,
  outboxRetryMs: 5_000,
} as const;
