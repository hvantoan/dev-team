import { spawn } from 'node:child_process';
import { isRecord } from './guards.js';
import type { DeliveryMessage, OrcaPort, TaskSpec, WorkerInfo, WorkerStartOptions } from './types.js';

export interface ExecResult {
  code: number;
  stdout: string;
  stderr: string;
}

export type Exec = (
  command: string,
  args: string[],
  options?: { input?: string; cwd?: string; timeoutMs?: number },
) => Promise<ExecResult>;

export function defaultExec(command: string, args: string[], options: { input?: string; cwd?: string; timeoutMs?: number } = {}): Promise<ExecResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: options.cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const finish = (result: ExecResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish({ code: 124, stdout, stderr: `${stderr}\ncommand timed out after ${options.timeoutMs ?? 0}ms` });
    }, options.timeoutMs ?? 60_000);
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', (error) => finish({ code: 127, stdout, stderr: `${stderr}\n${error.message}` }));
    child.on('close', (code) => finish({ code: code ?? 1, stdout, stderr }));
    child.stdin.on('error', () => {
      // The command exited without reading stdin (for example `sh -c true`).
    });
    try {
      child.stdin.end(options.input ?? '');
    } catch {
      // The command exited before reading stdin; the close handler reports the code.
    }
  });
}

export class OrcaError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'OrcaError';
  }
}

/** Parse the CLI JSON envelope. Prefer whole-stdout JSON (orca ≥1.4.265 pretty-prints); fall back to last single-line envelope, ignoring keepalives. */
export function parseEnvelope(stdout: string): Record<string, unknown> {
  const whole = stdout
    .split('\n')
    .filter((line) => !line.includes('_keepalive'))
    .join('\n')
    .trim();
  if (whole.startsWith('{')) {
    try {
      const value: unknown = JSON.parse(whole);
      if (isRecord(value) && typeof value.ok === 'boolean') return value;
    } catch {
      // not a single envelope; fall back to line scanning
    }
  }
  // Envelope embedded in noise: try each "{" line as start, dropping trailing lines until it parses.
  const lines = stdout.split('\n');
  for (let start = 0; start < lines.length; start += 1) {
    if (!lines[start].trim().startsWith('{') || lines[start].includes('_keepalive')) continue;
    for (let end = lines.length; end > start; end -= 1) {
      try {
        const value: unknown = JSON.parse(lines.slice(start, end).join('\n').trim());
        if (isRecord(value) && typeof value.ok === 'boolean') return value;
      } catch {
        // keep trimming
      }
    }
  }
  const candidates = stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('{') && !line.includes('_keepalive'));
  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    try {
      const value: unknown = JSON.parse(candidates[index]);
      if (isRecord(value) && typeof value.ok === 'boolean') return value;
    } catch {
      // keep scanning
    }
  }
  throw new OrcaError('bad_envelope', `orca did not return a JSON envelope: ${stdout.slice(0, 400)}`);
}

function deepFind(value: unknown, key: string): string | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = deepFind(item, key);
      if (found) return found;
    }
    return undefined;
  }
  if (!isRecord(value)) return undefined;
  const direct = value[key];
  if (typeof direct === 'string' && direct) return direct;
  for (const child of Object.values(value)) {
    const found = deepFind(child, key);
    if (found) return found;
  }
  return undefined;
}

function findFirst(value: unknown, keys: string[]): string | undefined {
  for (const key of keys) {
    const found = deepFind(value, key);
    if (found) return found;
  }
  return undefined;
}

function asArray(value: unknown, key: string): Record<string, unknown>[] {
  if (!isRecord(value)) return [];
  const direct = value[key];
  if (Array.isArray(direct)) return direct.filter(isRecord);
  const nested = deepFindObjects(value, key);
  return nested;
}

function deepFindObjects(value: unknown, key: string): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = deepFindObjects(item, key);
      if (found.length > 0) return found;
    }
    return [];
  }
  if (!isRecord(value)) return [];
  const direct = value[key];
  if (Array.isArray(direct)) return direct.filter(isRecord);
  for (const child of Object.values(value)) {
    const found = deepFindObjects(child, key);
    if (found.length > 0) return found;
  }
  return [];
}

function parsePayload(raw: unknown): Record<string, unknown> | undefined {
  if (isRecord(raw)) return raw;
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  try {
    const value: unknown = JSON.parse(raw);
    return isRecord(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function pickString(value: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const item = value[key];
    if (typeof item === 'string') return item;
  }
  return undefined;
}

function messageFrom(raw: Record<string, unknown>): DeliveryMessage | undefined {
  const payload = parsePayload(raw.payload) ?? {};
  const taskId = pickString(raw, ['taskId', 'task_id']) ?? pickString(payload, ['taskId', 'task_id']);
  const dispatchId = pickString(raw, ['dispatchId', 'dispatch_id']) ?? pickString(payload, ['dispatchId', 'dispatch_id']);
  if (taskId) payload.taskId = taskId;
  if (dispatchId) payload.dispatchId = dispatchId;
  const id = pickString(raw, ['id', 'messageId', 'message_id']);
  const type = pickString(raw, ['type', 'kind']);
  if (!id || !type) return undefined;
  return {
    id,
    type,
    subject: pickString(raw, ['subject', 'summary']),
    body: pickString(raw, ['body', 'text', 'message']),
    payload,
    handled: typeof raw.handled === 'boolean' ? raw.handled : undefined,
  };
}

function messagesFrom(envelope: Record<string, unknown>): DeliveryMessage[] {
  const result = envelope.result;
  const rows = asArray(result, 'messages');
  return rows.map(messageFrom).filter((item): item is DeliveryMessage => item !== undefined);
}

function worktreeFrom(workspace: string | undefined): string | undefined {
  if (!workspace) return undefined;
  if (workspace.includes('::')) return workspace.split('::').slice(1).join('::');
  if (workspace.startsWith('path:')) return workspace.slice(5);
  return workspace.startsWith('/') ? workspace : undefined;
}

export class Orca implements OrcaPort {
  constructor(
    private readonly command = 'orca',
    private readonly exec: Exec = defaultExec,
  ) {}

  private async run(args: string[], options: { input?: string; timeoutMs?: number } = {}): Promise<Record<string, unknown>> {
    const result = await this.exec(this.command, args, { input: options.input, timeoutMs: options.timeoutMs });
    if (result.code === 127 && !result.stdout.trim()) {
      throw new OrcaError('unavailable', `cannot run ${this.command}: ${result.stderr.trim() || 'not found'}`);
    }
    const envelope = parseEnvelope(result.stdout);
    if (envelope.ok !== true) {
      const error = isRecord(envelope.error) ? envelope.error : {};
      const code = typeof error.code === 'string' ? error.code : 'orca_error';
      const message = typeof error.message === 'string' ? error.message : `orca ${args.join(' ')} failed`;
      throw new OrcaError(code, message);
    }
    return envelope;
  }

  async appVersion(): Promise<string> {
    const envelope = await this.run(['status', '--json']);
    return findFirst(envelope.result, ['appVersion', 'version']) ?? 'unknown';
  }

  async repoList(): Promise<string[]> {
    const envelope = await this.run(['repo', 'list', '--json']);
    return asArray(envelope.result, 'repos').flatMap((repo) => {
      const id = typeof repo.id === 'string' ? repo.id : undefined;
      const repoPath = typeof repo.path === 'string' ? repo.path : undefined;
      return [id ? `id:${id}` : undefined, repoPath ? `path:${repoPath}` : undefined].filter(
        (value): value is string => value !== undefined,
      );
    });
  }

  async agentInstalled(): Promise<string[]> {
    const envelope = await this.run(['agent', 'installed', '--json']);
    return asArray(envelope.result, 'agents')
      .map((agent) => (typeof agent.id === 'string' ? agent.id : undefined))
      .filter((id): id is string => id !== undefined);
  }

  async terminalCreate(worktree: string, title: string): Promise<string> {
    const envelope = await this.run([
      'terminal', 'create',
      '--worktree', `path:${worktree}`,
      '--title', title,
      '--command', 'sleep infinity',
      '--json',
    ]);
    const handle = findFirst(envelope.result, ['handle']);
    if (!handle) throw new OrcaError('bad_envelope', 'terminal create returned no handle');
    return handle;
  }

  async terminalList(): Promise<string[]> {
    const envelope = await this.run(['terminal', 'list', '--json']);
    return asArray(envelope.result, 'terminals')
      .map((terminal) => (typeof terminal.handle === 'string' ? terminal.handle : undefined))
      .filter((handle): handle is string => handle !== undefined);
  }

  async terminalClose(handle: string): Promise<void> {
    await this.run(['terminal', 'close', '--terminal', handle, '--json']);
  }

  async runCreate(objective: string, handle: string): Promise<string> {
    const envelope = await this.run(['orchestration', 'run-create', '--objective', objective, '--from', handle, '--json']);
    const runId = findFirst(envelope.result, ['runId']);
    if (!runId) throw new OrcaError('bad_envelope', 'run-create returned no runId');
    return runId;
  }

  async runUse(runId: string, handle: string): Promise<void> {
    await this.run(['orchestration', 'run-use', '--id', runId, '--from', handle, '--json']);
  }

  async runList(): Promise<Array<{ id: string; objective: string }>> {
    const envelope = await this.run(['orchestration', 'run-list', '--json']);
    return asArray(envelope.result, 'runs')
      .map((run) => ({
        id: typeof run.id === 'string' ? run.id : '',
        objective: typeof run.objective === 'string' ? run.objective : '',
      }))
      .filter((run) => run.id !== '');
  }

  async taskCreate(spec: TaskSpec, runId: string, handle: string): Promise<string> {
    const envelope = await this.run(
      ['orchestration', 'task-create', '--spec-file', '-', '--run', runId, '--from', handle, '--json'],
      { input: JSON.stringify(spec) },
    );
    const taskId = findFirst(envelope.result, ['taskId']);
    if (!taskId) throw new OrcaError('bad_envelope', 'task-create returned no taskId');
    return taskId;
  }

  async taskList(runId: string): Promise<Array<{ id: string; spec: string; status: string }>> {
    const envelope = await this.run(['orchestration', 'task-list', '--run', runId, '--full', '--json']);
    return asArray(envelope.result, 'tasks').map((task) => ({
      id: typeof task.id === 'string' ? task.id : '',
      spec: typeof task.spec === 'string' ? task.spec : isRecord(task.spec) ? JSON.stringify(task.spec) : typeof task.title === 'string' ? task.title : '',
      status: typeof task.status === 'string' ? task.status : '',
    })).filter((task) => task.id !== '');
  }

  async workerStart(options: WorkerStartOptions): Promise<string> {
    const args = ['orchestration', 'worker-start', '--task', options.taskId];
    if (options.retryOf) {
      if (!options.worktree) throw new OrcaError('invalid_argument', 'retry needs an explicit worktree path');
      args.push('--retry-of', options.retryOf, '--worktree', `path:${options.worktree}`, '--agent', options.agent);
    } else {
      args.push('--worktree', 'new-top-level', '--repo', options.repo, '--name', options.name);
      args.push('--agent', options.agent, '--setup', options.setup);
      if (options.baseBranch) args.push('--base-branch', options.baseBranch);
      if (options.comment) args.push('--comment', options.comment);
    }
    if (options.model) args.push('--model', options.model);
    args.push('--run', options.runId, '--from', options.handle, '--json');
    const envelope = await this.run(args, { timeoutMs: 180_000 });
    const dispatchId = findFirst(envelope.result, ['dispatchId']);
    if (!dispatchId) throw new OrcaError('bad_envelope', 'worker-start returned no dispatchId');
    return dispatchId;
  }

  async workerList(runId: string): Promise<WorkerInfo[]> {
    const envelope = await this.run(['orchestration', 'worker-list', '--run', runId, '--json']);
    return asArray(envelope.result, 'workers').map((worker) => ({
      dispatchId: typeof worker.dispatchId === 'string' ? worker.dispatchId : '',
      taskId: typeof worker.taskId === 'string' ? worker.taskId : '',
      state: typeof worker.state === 'string' ? worker.state : 'unknown',
      workspace: typeof worker.workspace === 'string' ? worker.workspace : undefined,
      worktree: typeof worker.worktree === 'string' ? worker.worktree : undefined,
    })).filter((worker) => worker.dispatchId !== '');
  }

  async workerShow(dispatchId: string): Promise<WorkerInfo> {
    const envelope = await this.run(['orchestration', 'worker-show', '--dispatch', dispatchId, '--json']);
    const result = isRecord(envelope.result) ? envelope.result : {};
    const workspace = typeof result.workspace === 'string' ? result.workspace : undefined;
    const worktree = typeof result.worktree === 'string' ? result.worktree : worktreeFrom(workspace);
    return {
      dispatchId: typeof result.dispatchId === 'string' ? result.dispatchId : dispatchId,
      taskId: typeof result.taskId === 'string' ? result.taskId : '',
      state: typeof result.state === 'string' ? result.state : 'unknown',
      stage: typeof result.stage === 'string' ? result.stage : undefined,
      workspace,
      worktree,
    };
  }

  async checkWait(runId: string, handle: string, timeoutMs: number): Promise<DeliveryMessage[]> {
    const envelope = await this.run(
      [
        'orchestration', 'check',
        '--run', runId,
        '--terminal', handle,
        '--wait',
        '--types', 'worker_done,question,escalation',
        '--timeout-ms', String(timeoutMs),
        '--json',
      ],
      { timeoutMs: timeoutMs + 30_000 },
    );
    return messagesFrom(envelope);
  }

  async inbox(runId: string): Promise<DeliveryMessage[]> {
    const envelope = await this.run(['orchestration', 'inbox', '--run', runId, '--limit', '50', '--full', '--json']);
    return messagesFrom(envelope);
  }

  async reply(messageId: string, body: string, runId: string, handle: string): Promise<void> {
    await this.run(['orchestration', 'reply', '--id', messageId, '--body', body, '--run', runId, '--from', handle, '--json']);
  }

  async deny(dispatchId: string, promptId: string, reason: string, handle: string): Promise<void> {
    await this.run([
      'orchestration', 'deny',
      '--dispatch', dispatchId,
      '--prompt', promptId,
      '--reason', reason,
      '--from', handle,
      '--json',
    ]);
  }
}
