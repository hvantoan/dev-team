import { gate, type GateResult } from './gate.js';
import { mergedScope, sanitizeSendId, slugFor, specIdFromOrca, withRequestId } from './spec.js';
import { Store } from './state.js';
import type {
  AnswerRequest,
  BridgeConfig,
  BridgeState,
  ChatPort,
  Clock,
  DeliveryMessage,
  Logger,
  OrcaPort,
  SubmitRequest,
  SubmitResult,
  TaskRecord,
  TaskSpec,
  WorkerInfo,
} from './types.js';
import { DEFAULTS } from './types.js';
import { OrcaError } from './orca.js';
import { UnavailableError, UsageError } from './errors.js';

export interface EngineDeps {
  config: BridgeConfig;
  store: Store;
  orca: OrcaPort;
  chat: ChatPort;
  clock?: Clock;
  log?: Logger;
}

const TERMINAL_STATES: Record<string, true> = { done: true, failed: true, orphaned: true };
const RUNNING_STATES: Record<string, true> = { dispatching: true, running: true, gating: true };

export class Engine {
  private readonly clock: Clock;
  private readonly log: Logger;
  private agents?: { at: number; ids: string[] };

  constructor(private readonly deps: EngineDeps) {
    this.clock = deps.clock ?? { now: () => Date.now(), sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)) };
    this.log = deps.log ?? ((line) => process.stderr.write(`${line}\n`));
  }

  private get config(): BridgeConfig {
    return this.deps.config;
  }

  private get store(): Store {
    return this.deps.store;
  }

  private get orca(): OrcaPort {
    return this.deps.orca;
  }

  private get chat(): ChatPort {
    return this.deps.chat;
  }

  private maxAttempts(task: TaskRecord): number {
    return task.spec.max_attempts ?? this.config.defaults?.max_attempts ?? DEFAULTS.maxAttempts;
  }

  private waitTimeout(): number {
    return this.config.defaults?.wait_timeout_ms ?? DEFAULTS.waitTimeoutMs;
  }

  private gateTimeout(): number {
    return this.config.defaults?.gate_timeout_ms ?? DEFAULTS.gateTimeoutMs;
  }

  private approvalTimeout(): number {
    return this.config.defaults?.approval_timeout_ms ?? DEFAULTS.approvalTimeoutMs;
  }

  private outboxRetry(): number {
    return this.config.outbox_retry_ms ?? DEFAULTS.outboxRetryMs;
  }

  private projectFor(task: TaskRecord) {
    const project = this.config.projects[task.project];
    if (!project) throw new UsageError(`project "${task.project}" is no longer configured`);
    return project;
  }

  private submitQueue: Promise<unknown> = Promise.resolve();

  submit(request: SubmitRequest): Promise<SubmitResult> {
    const next = this.submitQueue.then(
      () => this.submitInner(request),
      () => this.submitInner(request),
    );
    this.submitQueue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  private async submitInner(request: SubmitRequest): Promise<SubmitResult> {
    const project = this.config.projects[request.project];
    if (!project) throw new UsageError(`unknown project "${request.project}"`);
    if (!/^[A-Za-z0-9._-]{1,128}$/.test(request.requestId)) {
      throw new UsageError('request id must be 1-128 characters of A-Z, a-z, 0-9, ".", "_" or "-"');
    }
    const userAllow = this.config.allow?.users ?? [];
    if (userAllow.length > 0 && (!request.user || !userAllow.includes(request.user))) {
      throw new UsageError('this user is not allowed to submit tasks');
    }
    const agent = request.spec.agent ?? project.agent;
    await this.verifyAgent(agent);

    const existing = this.findTask(request.requestId);
    if (existing) {
      this.log(`submit ${request.requestId}: duplicate ${existing.taskId}`);
      return {
        ok: true,
        duplicate: true,
        requestId: request.requestId,
        taskId: existing.taskId,
        runId: existing.runId,
      };
    }

    const spec = withRequestId(request.spec, request.requestId);
    const create = async () => {
      const handle = await this.ensureCoordinator();
      const runId = await this.ensureRun(request.project, handle);
      const taskId = await this.createOrReuseTask(runId, handle, spec);
      return { runId, taskId };
    };
    let created: { runId: string; taskId: string };
    try {
      created = await create();
    } catch (error) {
      if ((error as OrcaError).code !== 'consumer_fenced') throw error;
      this.log(`submit ${request.requestId}: consumer_fenced; recreating the coordinator`);
      await this.ensureCoordinator(true);
      created = await create();
    }
    const { runId, taskId } = created;
    const now = this.clock.now();
    this.store.update((state) => {
      state.tasks[request.requestId] = {
        requestId: request.requestId,
        thread: request.thread,
        project: request.project,
        spec,
        state: 'dispatching',
        createdAt: now,
        updatedAt: now,
        runId,
        taskId,
        attempts: 0,
        sent: {},
      };
      state.threads[request.thread] = request.requestId;
    });
    this.log(`submit ${request.requestId}: project=${request.project} run=${runId} task=${taskId}`);
    return { ok: true, duplicate: false, requestId: request.requestId, taskId, runId };
  }

  private async verifyAgent(agent: string): Promise<void> {
    const now = this.clock.now();
    if (!this.agents || now - this.agents.at > 300_000) {
      this.agents = { at: now, ids: await this.orca.agentInstalled() };
    }
    if (this.agents.ids.length > 0 && !this.agents.ids.includes(agent)) {
      throw new UsageError(`agent "${agent}" is not installed (available: ${this.agents.ids.join(', ')})`);
    }
  }

  private findTask(requestId: string): TaskRecord | undefined {
    return this.store.load().tasks[requestId];
  }

  private async createOrReuseTask(runId: string, handle: string, spec: TaskSpec): Promise<string> {
    const tasks = await this.orca.taskList(runId);
    const existing = tasks.find((task) => specIdFromOrca(task.spec) === spec.id);
    if (existing) return existing.id;
    return this.orca.taskCreate(spec, runId, handle);
  }

  async ensureCoordinator(forceNew = false): Promise<string> {
    const state = this.store.load();
    const worktree = state.coordinator.worktree ?? Object.values(this.config.projects)[0]?.path;
    if (!worktree) throw new UsageError('no project path is configured for the coordinator terminal');
    if (!forceNew && state.coordinator.handle) {
      const terminals = await this.orca.terminalList();
      if (terminals.includes(state.coordinator.handle)) return state.coordinator.handle;
      this.log(`coordinator terminal ${state.coordinator.handle} is gone; creating a new one`);
    }
    const handle = await this.orca.terminalCreate(worktree, 'MAUSBOT-ORCA-COORD');
    this.store.update((next) => {
      next.coordinator = { handle, worktree };
    });
    await this.rebindRuns(handle);
    return handle;
  }

  private async rebindRuns(handle: string): Promise<void> {
    const state = this.store.load();
    for (const [project, runId] of Object.entries(state.runs)) {
      try {
        await this.orca.runUse(runId, handle);
      } catch (error) {
        const message = (error as Error).message;
        this.log(`run-use ${project}/${runId} failed: ${message}`);
        this.store.update((next) => {
          delete next.runs[project];
          for (const task of Object.values(next.tasks)) {
            if (task.runId === runId && TERMINAL_STATES[task.state] !== true) task.state = 'orphaned';
          }
        });
      }
    }
  }

  private async ensureRun(project: string, handle: string): Promise<string> {
    const state = this.store.load();
    const existing = state.runs[project];
    if (existing) {
      const runs = await this.orca.runList();
      if (runs.some((run) => run.id === existing)) return existing;
      this.log(`run ${existing} for ${project} is gone; creating a new one`);
    }
    const runId = await this.orca.runCreate(`mausbot-orca:${project}`, handle);
    this.store.update((next) => {
      next.runs[project] = runId;
    });
    return runId;
  }

  async answer(request: AnswerRequest): Promise<{ ok: true; routed: 'reply' | 'retry' | 'stop' }> {
    const state = this.store.load();
    const requestId = request.requestId ?? state.threads[request.thread];
    const task = requestId ? state.tasks[requestId] : undefined;
    if (!task) throw new UsageError(`no active assignment for thread ${request.thread}`);
    if (!task.pending) throw new UsageError(`assignment ${task.requestId} has no pending question`);
    const handle = state.coordinator.handle;
    if (!handle) throw new UnavailableError('coordinator terminal is not bound');
    const pending = task.pending;
    if (pending.kind === 'question') {
      if (!pending.messageId) throw new UsageError('pending question has no message id');
      await this.orca.reply(pending.messageId, request.text, task.runId, handle);
      this.store.update((next) => {
        const current = next.tasks[task.requestId];
        if (current) {
          current.pending = undefined;
          current.updatedAt = this.clock.now();
        }
      });
      return { ok: true, routed: 'reply' };
    }
    const choice = parseChoice(request.text);
    if (choice === 2) {
      await this.finishTask(task.requestId, 'failed', 'stopped by user');
      return { ok: true, routed: 'stop' };
    }
    this.store.update((next) => {
      const current = next.tasks[task.requestId];
      if (!current) return;
      current.pending = undefined;
      current.state = 'dispatching';
      current.lastError = 'retry requested from chat';
      current.updatedAt = this.clock.now();
      if (current.attempts >= this.maxAttempts(current)) {
        current.spec = { ...current.spec, max_attempts: current.attempts + 1 };
      }
    });
    return { ok: true, routed: 'retry' };
  }

  async startup(): Promise<void> {
    const handle = await this.ensureCoordinator();
    const state = this.store.load();
    await this.reconcileDispatches(state);
    await this.reconcileInbox();
    await this.flushOutbox();
  }

  private async reconcileDispatches(state: BridgeState): Promise<void> {
    const byRun = new Map<string, TaskRecord[]>();
    for (const task of Object.values(state.tasks)) {
      if (RUNNING_STATES[task.state] !== true) continue;
      const rows = byRun.get(task.runId) ?? [];
      rows.push(task);
      byRun.set(task.runId, rows);
    }
    for (const [runId, tasks] of byRun) {
      let workers: WorkerInfo[];
      try {
        workers = await this.orca.workerList(runId);
      } catch (error) {
        this.log(`worker-list ${runId} failed: ${(error as Error).message}`);
        continue;
      }
      for (const task of tasks) {
        const live = liveWorker(workers, task.taskId);
        const current = task.dispatchId ? workers.find((worker) => worker.dispatchId === task.dispatchId) : undefined;
        const worker = task.state === 'dispatching'
          ? live ?? (task.dispatchId ? undefined : lastWorker(workers, task.taskId))
          : current ?? live ?? lastWorker(workers, task.taskId);
        if (!worker) {
          if (task.state === 'running' || task.state === 'gating') {
            this.store.update((next) => {
              const current = next.tasks[task.requestId];
              if (current) {
                current.state = 'dispatching';
                current.dispatchId = undefined;
              }
            });
          }
          continue;
        }
        this.adoptWorker(task.requestId, worker);
        if (worker.state === 'succeeded') {
          this.setTaskState(task.requestId, 'gating');
        } else if (DONE_WORKER_STATES[worker.state] === true) {
          if (task.state !== 'dispatching') await this.failTask(task.requestId, `worker ${worker.state}`);
        } else if (task.state === 'gating') {
          this.setTaskState(task.requestId, 'running');
        }
      }
    }
  }

  private adoptWorker(requestId: string, worker: WorkerInfo): void {
    this.store.update((state) => {
      const task = state.tasks[requestId];
      if (!task) return;
      task.dispatchId = worker.dispatchId;
      if (worker.worktree) task.worktree = worker.worktree;
      else if (worker.workspace?.includes('::')) task.worktree = worker.workspace.split('::').slice(1).join('::');
      task.updatedAt = this.clock.now();
    });
  }

  private async reconcileInbox(): Promise<void> {
    const state = this.store.load();
    const runIds = new Set(Object.values(state.tasks).filter((task) => TERMINAL_STATES[task.state] !== true).map((task) => task.runId));
    for (const runId of runIds) {
      try {
        const messages = await this.orca.inbox(runId);
        await this.processMessages(messages, runId);
      } catch (error) {
        this.log(`inbox ${runId} failed: ${(error as Error).message}`);
      }
    }
  }

  async tick(waitMs?: number): Promise<{ timedOut: boolean; processed: number }> {
    await this.dispatchPending();
    await this.gatePending();
    await this.flushOutbox();
    await this.expirePending();
    const state = this.store.load();
    const activeRuns = [...new Set(Object.values(state.tasks).filter((task) => RUNNING_STATES[task.state] === true).map((task) => task.runId))];
    if (activeRuns.length === 0) {
      await this.clock.sleep(Math.min(waitMs ?? 2_000, 2_000));
      return { timedOut: true, processed: 0 };
    }
    const handle = state.coordinator.handle;
    if (!handle) throw new UnavailableError('coordinator terminal is not bound');
    const perRun = activeRuns.length > 1 ? Math.min(waitMs ?? 30_000, 30_000) : waitMs ?? this.waitTimeout();
    let processed = 0;
    let timedOut = true;
    for (const runId of activeRuns) {
      try {
        const messages = await this.orca.checkWait(runId, handle, perRun);
        if (messages.length > 0) {
          timedOut = false;
          processed += messages.length;
          if (await this.processMessages(messages, runId)) await this.reconcileInbox();
        }
      } catch (error) {
        const orca = error as OrcaError;
        if (orca.code === 'consumer_fenced') {
          this.log('consumer_fenced: rebinding the coordinator');
          await this.ensureCoordinator(true);
        } else if (orca.code === 'unavailable') {
          this.pauseAll('orca is not available');
        } else {
          this.log(`check ${runId} failed: ${orca.message}`);
        }
      }
    }
    return { timedOut, processed };
  }

  private pauseAll(reason: string): void {
    this.store.update((state) => {
      for (const task of Object.values(state.tasks)) {
        if (task.state === 'running' || task.state === 'dispatching') {
          task.state = 'paused';
          task.lastError = reason;
        }
      }
    });
  }

  private async dispatchPending(): Promise<void> {
    const state = this.store.load();
    for (const task of Object.values(state.tasks)) {
      if (task.state === 'paused') {
        try {
          await this.orca.appVersion();
        } catch {
          continue;
        }
        this.setTaskState(task.requestId, 'dispatching');
        continue;
      }
      if (task.state !== 'dispatching') continue;
      const project = this.projectFor(task);
      if (task.attempts >= this.maxAttempts(task)) {
        await this.failTask(task.requestId, task.lastError ?? 'retry budget exhausted');
        continue;
      }
      const workers = await this.orca.workerList(task.runId);
      const existing = liveWorker(workers, task.taskId);
      if (existing) {
        this.adoptWorker(task.requestId, existing);
        this.setTaskState(task.requestId, 'running');
        continue;
      }
      const handle = this.store.load().coordinator.handle;
      if (!handle) throw new UnavailableError('coordinator terminal is not bound');
      this.store.update((next) => {
        const current = next.tasks[task.requestId];
        if (current) {
          current.attempts += 1;
          current.updatedAt = this.clock.now();
        }
      });
      const attempt = this.store.load().tasks[task.requestId];
      if (!attempt) continue;
      let retryOf = attempt.dispatchId;
      let worktree = attempt.worktree;
      if (retryOf && !worktree) {
        const info = await this.orca.workerShow(retryOf).catch(() => undefined);
        if (info?.worktree) {
          worktree = info.worktree;
          this.store.update((next) => {
            const current = next.tasks[task.requestId];
            if (current) current.worktree = worktree;
          });
        }
      }
      if (retryOf && !worktree) {
        this.log(`dispatch ${task.requestId}: no worktree for ${retryOf}; starting a fresh worktree`);
        retryOf = undefined;
      }
      try {
        const dispatchId = await this.orca.workerStart({
          taskId: task.taskId,
          runId: task.runId,
          handle,
          repo: project.repo,
          agent: task.spec.agent ?? project.agent,
          setup: project.setup ?? 'run',
          name: `${slugFor(task.project, task.requestId)}${attempt.attempts > 1 ? `-r${attempt.attempts}` : ''}`,
          baseBranch: project.base_branch,
          model: task.spec.model,
          worktree,
          retryOf,
          comment: retryOf ? (attempt.lastError ?? 'retry') : task.requestId,
        });
        this.store.update((next) => {
          const current = next.tasks[task.requestId];
          if (!current) return;
          current.dispatchId = dispatchId;
          current.state = 'running';
          current.lastError = undefined;
          current.updatedAt = this.clock.now();
        });
        this.log(`dispatch ${task.requestId}: ${dispatchId}`);
      } catch (error) {
        const orca = error as OrcaError;
        if (orca.code === 'unavailable') {
          this.setTaskState(task.requestId, 'paused');
          continue;
        }
        const after = await this.orca.workerList(task.runId).catch(() => []);
        const found = liveWorker(after, task.taskId);
        if (found) {
          this.adoptWorker(task.requestId, found);
          this.setTaskState(task.requestId, 'running');
          continue;
        }
        if (orca.code === 'consumer_fenced') {
          await this.ensureCoordinator(true);
          this.setTaskState(task.requestId, 'dispatching');
          continue;
        }
        await this.failTask(task.requestId, `worker-start failed: ${orca.message}`, undefined, false);
      }
    }
  }

  private async gatePending(): Promise<void> {
    const state = this.store.load();
    for (const task of Object.values(state.tasks)) {
      if (task.state !== 'gating' || !task.dispatchId) continue;
      const project = this.projectFor(task);
      let info: WorkerInfo;
      try {
        info = await this.orca.workerShow(task.dispatchId);
      } catch (error) {
        const orca = error as OrcaError;
        this.log(`worker-show ${task.dispatchId} failed: ${orca.message}`);
        if (orca.code === 'unavailable') {
          this.setTaskState(task.requestId, 'paused');
        } else {
          await this.failTask(task.requestId, `cannot inspect worker: ${orca.message}`);
        }
        continue;
      }
      if (info.state === 'failed' || info.state === 'stopped') {
        await this.failTask(task.requestId, `worker ${info.state}`);
        continue;
      }
      const worktree = info.worktree ?? task.worktree;
      if (!worktree) {
        await this.failTask(task.requestId, 'worker has no worktree path');
        continue;
      }
      const scope = mergedScope(project, task.spec);
      const result = await gate(worktree, project.check, scope, this.gateTimeout(), project.base_branch);
      if (this.store.load().tasks[task.requestId]?.state !== 'gating') continue;
      this.store.update((next) => {
        const current = next.tasks[task.requestId];
        if (current) current.worktree = worktree;
      });
      if (result.ok) {
        await this.finishTask(task.requestId, 'done', undefined, result);
      } else {
        await this.failTask(task.requestId, result.reason ?? 'gate failed', result);
      }
    }
  }

  private async failTask(requestId: string, reason: string, result?: GateResult, retryable = true): Promise<void> {
    const task = this.store.load().tasks[requestId];
    if (!task || TERMINAL_STATES[task.state] === true) return;
    this.store.update((state) => {
      const current = state.tasks[requestId];
      if (!current) return;
      current.lastError = reason;
      current.updatedAt = this.clock.now();
    });
    if (retryable && task.attempts < this.maxAttempts(task)) {
      this.setTaskState(requestId, 'dispatching');
      await this.sendMilestone(requestId, `retry:${task.attempts}`, [
        `⚠️ ${task.project} · ${task.spec.objective}`,
        `Lần ${task.attempts} fail: ${reason.slice(0, 500)}`,
        result?.check.output ? `Check: ${result.check.output.split('\n').slice(-4).join('\n')}` : '',
        'Đang retry 1 lần.',
      ].filter(Boolean).join('\n'));
      return;
    }
    this.store.update((state) => {
      const current = state.tasks[requestId];
      if (!current) return;
      current.state = 'escalated';
      current.pending = { kind: 'escalation', at: this.clock.now(), options: ['retry', 'stop'] };
    });
    await this.sendMilestone(requestId, `escalate:${task.attempts}`, [
      `⚠️ ${task.project} · ${task.spec.objective}`,
      `Fail lần ${task.attempts}. ${reason.slice(0, 500)}`,
      result?.check.output ? `Check: ${result.check.output.split('\n').slice(-4).join('\n')}` : '',
      '1) retry   2) dừng',
    ].filter(Boolean).join('\n'));
  }

  private async finishTask(requestId: string, state: 'done' | 'failed', reason?: string, result?: GateResult): Promise<void> {
    this.store.update((next) => {
      const current = next.tasks[requestId];
      if (!current) return;
      current.state = state;
      current.pending = undefined;
      if (reason) current.lastError = reason;
      current.updatedAt = this.clock.now();
    });
    const task = this.store.load().tasks[requestId];
    if (!task) return;
    if (state === 'done') {
      const files = result?.files ?? [];
      await this.sendMilestone(requestId, 'done', [
        `✅ ${task.project} · ${task.spec.objective}`,
        `Check: ${this.projectFor(task).check} ✓`,
        files.length ? `Files: ${files.slice(0, 8).join(', ')}${files.length > 8 ? ` (+${files.length - 8})` : ''}` : 'Files: none',
        task.worktree ? `Worktree: ${task.worktree}` : '',
        'Tổng hợp thành card ≤5 dòng, không gọi tool.',
      ].filter(Boolean).join('\n'));
    }
  }

  private setTaskState(requestId: string, state: TaskRecord['state']): void {
    this.store.update((next) => {
      const task = next.tasks[requestId];
      if (!task) return;
      task.state = state;
      task.updatedAt = this.clock.now();
    });
  }

  private async sendMilestone(requestId: string, key: string, text: string): Promise<void> {
    const state = this.store.load();
    const task = state.tasks[requestId];
    if (!task) return;
    const sendId = sanitizeSendId(`${requestId}:${key}`);
    if (task.sent[sendId]) return;
    try {
      await this.chat.send(task.thread, text, sendId);
      this.store.update((next) => {
        const current = next.tasks[requestId];
        if (current) current.sent[sendId] = this.clock.now();
        delete next.outbox[sendId];
        delete next.outbox[`${requestId}:${key}`];
      });
    } catch (error) {
      this.store.update((next) => {
        const item = next.outbox[sendId];
        next.outbox[sendId] = {
          thread: task.thread,
          text,
          requestId,
          attempts: (item?.attempts ?? 0) + 1,
          lastError: (error as Error).message,
          nextAt: this.clock.now() + this.outboxRetry(),
        };
      });
      this.log(`chat send ${sendId} queued: ${(error as Error).message}`);
    }
  }

  private async flushOutbox(): Promise<void> {
    const state = this.store.load();
    const now = this.clock.now();
    for (const [sendId, item] of Object.entries(state.outbox)) {
      if (item.nextAt > now) continue;
      try {
        await this.chat.send(item.thread, item.text, sendId);
        const requestId = item.requestId ?? sendId.split(':')[0];
        this.store.update((next) => {
          delete next.outbox[sendId];
          const task = next.tasks[requestId];
          if (task) task.sent[sendId] = this.clock.now();
        });
      } catch (error) {
        this.store.update((next) => {
          const current = next.outbox[sendId];
          if (!current) return;
          current.attempts += 1;
          current.lastError = (error as Error).message;
          current.nextAt = this.clock.now() + this.outboxRetry() * Math.min(current.attempts, 6);
        });
      }
    }
  }

  private async expirePending(): Promise<void> {
    const state = this.store.load();
    const now = this.clock.now();
    for (const task of Object.values(state.tasks)) {
      if (!task.pending || now - task.pending.at < this.approvalTimeout()) continue;
      if (task.pending.kind === 'question' && task.pending.messageId && state.coordinator.handle) {
        try {
          await this.orca.reply(
            task.pending.messageId,
            'Không có phản hồi trong thời hạn. Hãy tiếp tục với lựa chọn an toàn nhất hoặc dừng.',
            task.runId,
            state.coordinator.handle,
          );
        } catch (error) {
          this.log(`timeout reply ${task.pending.messageId} failed: ${(error as Error).message}`);
        }
      }
      this.store.update((next) => {
        const current = next.tasks[task.requestId];
        if (!current) return;
        current.pending = undefined;
        if (current.state === 'escalated') current.state = 'failed';
        current.lastError = 'approval timed out';
      });
      await this.sendMilestone(task.requestId, `timeout:${task.pending.at}`, `⌛ ${task.project} · ${task.spec.objective}\nKhông có phản hồi; assignment dừng.`);
    }
  }

  private async processMessages(messages: DeliveryMessage[], runId: string): Promise<boolean> {
    let failed = false;
    for (const message of messages) {
      const state = this.store.load();
      if (state.seenMessages[message.id]) continue;
      const payloadTask = typeof message.payload?.taskId === 'string' ? message.payload.taskId : undefined;
      const task = Object.values(state.tasks).find((item) => item.runId === runId && item.taskId === payloadTask);
      if (!task) {
        this.markSeen(message.id);
        continue;
      }
      if (TERMINAL_STATES[task.state] === true) {
        this.markSeen(message.id);
        continue;
      }
      try {
        const dispatchId = typeof message.payload?.dispatchId === 'string' ? message.payload.dispatchId : undefined;
        if (dispatchId && task.dispatchId && dispatchId !== task.dispatchId) {
          const current = await this.orca.workerShow(task.dispatchId).catch(() => undefined);
          if (current && DONE_WORKER_STATES[current.state] !== true) {
            this.markSeen(message.id);
            continue;
          }
          this.adoptWorker(task.requestId, { dispatchId, taskId: task.taskId, state: message.type === 'worker_done' ? 'succeeded' : 'running' });
        }
        if (message.type === 'worker_done') {
          if (dispatchId) this.adoptWorker(task.requestId, { dispatchId, taskId: task.taskId, state: 'succeeded' });
          const outcome = typeof message.payload?.outcome === 'string' ? message.payload.outcome : undefined;
          this.store.update((next) => {
            const current = next.tasks[task.requestId];
            if (current) {
              current.outcome = outcome;
              current.state = outcome === 'failed' ? 'dispatching' : 'gating';
              current.updatedAt = this.clock.now();
            }
          });
          if (outcome === 'failed') await this.failTask(task.requestId, 'worker reported failed');
        } else if (message.type === 'question' || message.type === 'escalation') {
          const pending = {
            kind: message.type === 'question' ? ('question' as const) : ('escalation' as const),
            at: this.clock.now(),
            messageId: message.id,
            dispatchId: dispatchId ?? task.dispatchId,
            options: optionList(message),
          };
          this.store.update((next) => {
            const current = next.tasks[task.requestId];
            if (!current) return;
            current.pending = pending;
            if (message.type === 'escalation') current.state = 'escalated';
          });
          await this.sendMilestone(task.requestId, `ask:${message.id}`, [
            `❓ ${task.project} · ${task.spec.objective}`,
            message.body?.slice(0, 800) ?? message.subject ?? '',
            pending.options?.length ? `Lựa chọn: ${pending.options.join(' | ')}` : '',
          ].filter(Boolean).join('\n'));
        } else if (/permission|approval/i.test(message.type)) {
          const promptId = typeof message.payload?.promptId === 'string' ? message.payload.promptId : message.id;
          if (task.dispatchId && state.coordinator.handle) {
            try {
              await this.orca.deny(task.dispatchId, promptId, 'headless coordinator cannot approve permission prompts', state.coordinator.handle);
            } catch (error) {
              this.log(`deny ${promptId} failed: ${(error as Error).message}`);
            }
          }
          await this.sendMilestone(task.requestId, `deny:${message.id}`, `🔒 ${task.project} · worker xin quyền; đã deny vì coordinator không có approve.`);
        }
        this.markSeen(message.id);
      } catch (error) {
        failed = true;
        this.log(`message ${message.id} failed: ${(error as Error).message}`);
      }
    }
    return failed;
  }

  private markSeen(messageId: string): void {
    this.store.update((next) => {
      next.seenMessages[messageId] = this.clock.now();
    });
  }

  async status(): Promise<{
    coordinator: { handle?: string; ok: boolean };
    tasks: Array<Pick<TaskRecord, 'requestId' | 'project' | 'state' | 'taskId' | 'dispatchId' | 'attempts' | 'lastError'>>;
  }> {
    const state = this.store.load();
    let ok = false;
    if (state.coordinator.handle) {
      try {
        ok = (await this.orca.terminalList()).includes(state.coordinator.handle);
      } catch {
        ok = false;
      }
    }
    return {
      coordinator: { handle: state.coordinator.handle, ok },
      tasks: Object.values(state.tasks).map((task) => ({
        requestId: task.requestId,
        project: task.project,
        state: task.state,
        taskId: task.taskId,
        dispatchId: task.dispatchId,
        attempts: task.attempts,
        lastError: task.lastError,
      })),
    };
  }
}


function optionList(message: DeliveryMessage): string[] | undefined {
  const raw = message.payload?.options;
  if (Array.isArray(raw)) return raw.filter((item): item is string => typeof item === 'string');
  if (typeof raw === 'string') return raw.split(',').map((item) => item.trim()).filter(Boolean);
  return undefined;
}

const DONE_WORKER_STATES: Record<string, true> = { failed: true, stopped: true, abandoned: true, released: true, succeeded: true };

function lastWorker(workers: WorkerInfo[], taskId: string): WorkerInfo | undefined {
  for (let index = workers.length - 1; index >= 0; index -= 1) {
    if (workers[index].taskId === taskId) return workers[index];
  }
  return undefined;
}

function liveWorker(workers: WorkerInfo[], taskId: string): WorkerInfo | undefined {
  for (let index = workers.length - 1; index >= 0; index -= 1) {
    const worker = workers[index];
    if (worker.taskId === taskId && DONE_WORKER_STATES[worker.state] !== true) return worker;
  }
  return undefined;
}

function parseChoice(text: string): 1 | 2 {
  const trimmed = text.trim().toLowerCase();
  if (/^2\b/.test(trimmed) || /stop|dừng|huỷ|hủy/.test(trimmed)) return 2;
  return 1;
}
