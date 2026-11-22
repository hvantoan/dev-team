import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Engine } from '../src/engine.js';
import { OrcaError } from '../src/orca.js';
import { sanitizeSendId } from '../src/spec.js';
import { Store } from '../src/state.js';
import type {
  BridgeConfig,
  ChatPort,
  Clock,
  DeliveryMessage,
  OrcaPort,
  TaskSpec,
  WorkerInfo,
  WorkerStartOptions,
} from '../src/types.js';

class FakeOrca implements OrcaPort {
  handle = 'term_1';
  runs: string[] = [];
  tasks: Array<{ id: string; spec: string; status: string }> = [];
  workers: WorkerInfo[] = [];
  history: DeliveryMessage[] = [];
  queue: DeliveryMessage[] = [];
  replies: Array<{ id: string; body: string }> = [];
  starts: WorkerStartOptions[] = [];
  workspace = '';

  async appVersion() {
    return '1.4.263';
  }
  async repoList() {
    return ['id:repo_123'];
  }
  async agentInstalled() {
    return ['claude'];
  }
  async terminalCreate() {
    return this.handle;
  }
  async terminalList() {
    return [this.handle];
  }
  async terminalClose() {}
  async runCreate() {
    const id = `run_${this.runs.length + 1}`;
    this.runs.push(id);
    return id;
  }
  async runUse() {}
  async runList() {
    return this.runs.map((id) => ({ id, objective: `mausbot-orca:${id}` }));
  }
  async taskCreate(spec: TaskSpec) {
    const id = `task_${this.tasks.length + 1}`;
    this.tasks.push({ id, spec: JSON.stringify(spec), status: 'ready' });
    return id;
  }
  async taskList() {
    return this.tasks;
  }
  async workerStart(options: WorkerStartOptions) {
    this.starts.push(options);
    const id = `ctx_${this.starts.length}`;
    this.workers.push({ dispatchId: id, taskId: options.taskId, state: 'running', workspace: `wt::${this.workspace}` });
    return id;
  }
  async workerList() {
    return this.workers;
  }
  async workerShow(dispatchId: string) {
    const worker = this.workers.find((item) => item.dispatchId === dispatchId);
    if (!worker) throw new Error(`no worker ${dispatchId}`);
    return { ...worker, worktree: this.workspace };
  }
  async checkWait() {
    return this.queue.splice(0);
  }
  async inbox() {
    return [...this.history];
  }
  async reply(id: string, body: string) {
    this.replies.push({ id, body });
  }
  async deny() {}

  deliver(message: DeliveryMessage) {
    this.history.push(message);
    this.queue.push(message);
  }
  settle(dispatchId: string, state = 'succeeded') {
    const worker = this.workers.find((item) => item.dispatchId === dispatchId);
    if (worker) worker.state = state;
  }
}

class FakeChat implements ChatPort {
  sent: Array<{ thread: string; text: string; sendId: string }> = [];
  failures = 0;
  async send(thread: string, text: string, sendId: string) {
    if (this.failures > 0) {
      this.failures -= 1;
      throw new Error('chat is down');
    }
    this.sent.push({ thread, text, sendId });
  }
}

let repo: string;
let dir: string;
let now: number;
let clock: Clock;
let orca: FakeOrca;
let chat: FakeChat;
let engine: Engine;
let config: BridgeConfig;

function git(...args: string[]) {
  execFileSync('git', ['-C', repo, ...args], { stdio: 'ignore' });
}

function build(check = 'true') {
  config = {
    projects: {
      tms: {
        repo: 'id:repo_123',
        path: repo,
        agent: 'claude',
        base_branch: 'main',
        setup: 'run',
        check,
        allow: ['src/**'],
        deny: [],
      },
    },
    defaults: { max_attempts: 2, wait_timeout_ms: 10, approval_timeout_ms: 100_000, gate_timeout_ms: 10_000 },
  };
  orca = new FakeOrca();
  orca.workspace = repo;
  chat = new FakeChat();
  engine = new Engine({ config, store: new Store(dir), orca, chat, clock, log: () => {} });
}

function submit(requestId = 'req1') {
  return engine.submit({
    thread: 'thread-1',
    project: 'tms',
    requestId,
    spec: { id: requestId, objective: 'do the thing' },
  });
}

beforeEach(() => {
  repo = fs.mkdtempSync(path.join(os.tmpdir(), 'mausbot-orca-engine-'));
  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  fs.mkdirSync(path.join(repo, 'src'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'src/a.ts'), 'export const a = 1;\n');
  fs.writeFileSync(path.join(repo, 'README.md'), '# test\n');
  git('add', '.');
  git('commit', '-qm', 'init');
  git('branch', '-M', 'main');
  fs.appendFileSync(path.join(repo, 'src/a.ts'), '// change\n');
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mausbot-orca-data-'));
  now = 1_000;
  clock = { now: () => now, sleep: async () => {} };
});

afterEach(() => {
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('engine submit and dispatch', () => {
  it('creates one Run and Task and dedupes the same request id', async () => {
    build();
    const first = await submit();
    expect(first).toMatchObject({ duplicate: false, taskId: 'task_1', runId: 'run_1' });
    const second = await submit();
    expect(second).toMatchObject({ duplicate: true, taskId: 'task_1', runId: 'run_1' });
    expect(orca.tasks).toHaveLength(1);
    expect(orca.runs).toHaveLength(1);
    expect(orca.starts).toHaveLength(0);
  });

  it('recreates the coordinator and retries when submit is fenced', async () => {
    build();
    const original = orca.taskCreate.bind(orca);
    let attempts = 0;
    orca.taskCreate = async (spec: TaskSpec) => {
      attempts += 1;
      if (attempts === 1) throw new OrcaError('consumer_fenced', 'fenced');
      return original(spec);
    };
    const created = await submit();
    expect(created).toMatchObject({ duplicate: false, taskId: 'task_1', runId: 'run_1' });
    expect(attempts).toBe(2);
    expect(orca.tasks).toHaveLength(1);
  });

  it('dispatches once and adopts an existing live worker instead of starting again', async () => {
    build();
    await submit();
    await engine.tick(1);
    expect(orca.starts).toHaveLength(1);
    expect(orca.starts[0].comment).toBe('req1');
    const state = new Store(dir).load();
    expect(state.tasks.req1.state).toBe('running');
    expect(state.tasks.req1.dispatchId).toBe('ctx_1');
    await engine.tick(1);
    expect(orca.starts).toHaveLength(1);
  });

  it('gates a succeeded worker, sends one card, and ignores the duplicate message', async () => {
    build();
    await submit();
    await engine.tick(1);
    orca.settle('ctx_1');
    const message: DeliveryMessage = {
      id: 'msg_1',
      type: 'worker_done',
      payload: { taskId: 'task_1', dispatchId: 'ctx_1', outcome: 'succeeded' },
    };
    orca.deliver(message);
    await engine.tick(1);
    expect(new Store(dir).load().tasks.req1.state).toBe('gating');
    await engine.tick(1);
    expect(new Store(dir).load().tasks.req1.state).toBe('done');
    expect(chat.sent).toHaveLength(1);
    expect(chat.sent[0].sendId).toBe(sanitizeSendId('req1:done'));
    expect(chat.sent[0].text).toContain('Check: true');
    expect(chat.sent[0].text).toContain('src/a.ts');

    orca.deliver(message);
    await engine.tick(1);
    await engine.tick(1);
    expect(chat.sent).toHaveLength(1);
  });
});

describe('engine failure paths', () => {
  it('retries once with --retry-of, then escalates', async () => {
    build('false');
    await submit();
    await engine.tick(1);
    orca.settle('ctx_1');
    orca.deliver({ id: 'msg_1', type: 'worker_done', payload: { taskId: 'task_1', dispatchId: 'ctx_1', outcome: 'succeeded' } });
    await engine.tick(1);
    await engine.tick(1);
    expect(new Store(dir).load().tasks.req1.state).toBe('dispatching');
    expect(chat.sent.map((item) => item.sendId)).toContain(sanitizeSendId('req1:retry:1'));

    await engine.tick(1);
    expect(orca.starts).toHaveLength(2);
    expect(orca.starts[1].retryOf).toBe('ctx_1');
    expect(orca.starts[1].worktree).toBe(repo);
    orca.settle('ctx_2');
    orca.deliver({ id: 'msg_2', type: 'worker_done', payload: { taskId: 'task_1', dispatchId: 'ctx_2', outcome: 'succeeded' } });
    await engine.tick(1);
    await engine.tick(1);
    expect(new Store(dir).load().tasks.req1.state).toBe('escalated');
    expect(chat.sent.map((item) => item.sendId)).toContain(sanitizeSendId('req1:escalate:2'));
  });

  it('retries a worker-reported failure with the failed dispatch worktree', async () => {
    build();
    await submit();
    await engine.tick(1);
    orca.settle('ctx_1', 'failed');
    orca.deliver({ id: 'msg_1', type: 'worker_done', payload: { taskId: 'task_1', dispatchId: 'ctx_1', outcome: 'failed' } });
    await engine.tick(1);
    await engine.tick(1);
    expect(orca.starts).toHaveLength(2);
    expect(orca.starts[1].retryOf).toBe('ctx_1');
    expect(orca.starts[1].worktree).toBe(repo);
  });

  it('rejects a changed file outside the allow list', async () => {
    build('true');
    await submit();
    await engine.tick(1);
    orca.settle('ctx_1');
    fs.appendFileSync(path.join(repo, 'README.md'), 'outside scope\n');
    orca.deliver({ id: 'msg_1', type: 'worker_done', payload: { taskId: 'task_1', dispatchId: 'ctx_1', outcome: 'succeeded' } });
    await engine.tick(1);
    await engine.tick(1);
    const retry = chat.sent.find((item) => item.sendId === sanitizeSendId('req1:retry:1'));
    expect(retry?.text).toContain('README.md');
  });

  it('pauses instead of failing when Orca is unavailable during gating', async () => {
    build();
    await submit();
    await engine.tick(1);
    orca.settle('ctx_1');
    orca.deliver({ id: 'msg_1', type: 'worker_done', payload: { taskId: 'task_1', dispatchId: 'ctx_1', outcome: 'succeeded' } });
    await engine.tick(1);
    orca.workerShow = async () => {
      throw new OrcaError('unavailable', 'orca is down');
    };
    await engine.tick(1);
    expect(new Store(dir).load().tasks.req1.state).toBe('paused');
  });

  it('does not retry a worker-start failure blindly', async () => {
    build();
    await submit();
    orca.workerStart = async () => {
      throw new Error('start failed');
    };
    await engine.tick(1);
    const task = new Store(dir).load().tasks.req1;
    expect(task.state).toBe('escalated');
    expect(chat.sent.map((item) => item.sendId)).toContain(sanitizeSendId('req1:escalate:1'));
    expect(orca.starts).toHaveLength(0);
  });
});

describe('engine chat and questions', () => {
  it('queues a failed chat send and flushes it with the same send id', async () => {
    build();
    await submit();
    await engine.tick(1);
    orca.settle('ctx_1');
    chat.failures = 1;
    orca.deliver({ id: 'msg_1', type: 'worker_done', payload: { taskId: 'task_1', dispatchId: 'ctx_1', outcome: 'succeeded' } });
    await engine.tick(1);
    await engine.tick(1);
    expect(chat.sent).toHaveLength(0);
    expect(new Store(dir).load().outbox[sanitizeSendId('req1:done')]).toBeDefined();
    now += 10_000;
    await engine.tick(1);
    expect(chat.sent[0].sendId).toBe(sanitizeSendId('req1:done'));
    expect(new Store(dir).load().outbox[sanitizeSendId('req1:done')]).toBeUndefined();
  });

  it('forwards a question and routes the answer back to Orca', async () => {
    build();
    await submit();
    await engine.tick(1);
    orca.deliver({
      id: 'msg_q',
      type: 'question',
      body: 'Shared or page-only?',
      payload: { taskId: 'task_1', dispatchId: 'ctx_1', options: ['shared', 'page-only'] },
    });
    await engine.tick(1);
    expect(chat.sent.some((item) => item.sendId === sanitizeSendId('req1:ask:msg_q'))).toBe(true);
    const result = await engine.answer({ thread: 'thread-1', text: 'page-only' });
    expect(result.routed).toBe('reply');
    expect(orca.replies).toEqual([{ id: 'msg_q', body: 'page-only' }]);
  });

  it('ignores a question from a superseded dispatch', async () => {
    build();
    await submit();
    await engine.tick(1);
    orca.deliver({
      id: 'msg_q1',
      type: 'question',
      body: 'first',
      payload: { taskId: 'task_1', dispatchId: 'ctx_1' },
    });
    await engine.tick(1);
    orca.deliver({
      id: 'msg_old',
      type: 'question',
      body: 'old',
      payload: { taskId: 'task_1', dispatchId: 'ctx_old' },
    });
    await engine.tick(1);
    const state = new Store(dir).load();
    expect(state.tasks.req1.pending?.messageId).toBe('msg_q1');
    expect(chat.sent.some((item) => item.sendId === sanitizeSendId('req1:ask:msg_old'))).toBe(false);
  });

  it('routes escalation option 1 to a forced retry and option 2 to stop', async () => {
    build('false');
    await submit();
    await engine.tick(1);
    orca.settle('ctx_1');
    orca.deliver({ id: 'msg_1', type: 'worker_done', payload: { taskId: 'task_1', dispatchId: 'ctx_1', outcome: 'succeeded' } });
    await engine.tick(1);
    await engine.tick(1);
    await engine.tick(1);
    orca.settle('ctx_2');
    orca.deliver({ id: 'msg_2', type: 'worker_done', payload: { taskId: 'task_1', dispatchId: 'ctx_2', outcome: 'succeeded' } });
    await engine.tick(1);
    await engine.tick(1);
    expect(new Store(dir).load().tasks.req1.state).toBe('escalated');
    const retry = await engine.answer({ thread: 'thread-1', text: '1' });
    expect(retry.routed).toBe('retry');
    expect(new Store(dir).load().tasks.req1.state).toBe('dispatching');
    expect(new Store(dir).load().tasks.req1.spec.max_attempts).toBe(3);

    await engine.tick(1);
    orca.settle('ctx_3', 'failed');
    orca.deliver({ id: 'msg_3', type: 'worker_done', payload: { taskId: 'task_1', dispatchId: 'ctx_3', outcome: 'failed' } });
    await engine.tick(1);
    expect(new Store(dir).load().tasks.req1.state).toBe('escalated');
    expect(chat.sent.map((item) => item.sendId)).toContain(sanitizeSendId('req1:escalate:3'));
    const stop = await engine.answer({ thread: 'thread-1', text: '2' });
    expect(stop.routed).toBe('stop');
    expect(new Store(dir).load().tasks.req1.state).toBe('failed');
  });
});

describe('engine recovery', () => {
  it('keeps a dispatching retry instead of re-gating the previous success', async () => {
    build('false');
    await submit();
    await engine.tick(1);
    orca.settle('ctx_1');
    orca.deliver({ id: 'msg_1', type: 'worker_done', payload: { taskId: 'task_1', dispatchId: 'ctx_1', outcome: 'succeeded' } });
    await engine.tick(1);
    await engine.tick(1);
    expect(new Store(dir).load().tasks.req1.state).toBe('dispatching');

    const restarted = new Engine({ config, store: new Store(dir), orca, chat, clock, log: () => {} });
    await restarted.startup();
    expect(new Store(dir).load().tasks.req1.state).toBe('dispatching');
  });

  it('reconstructs an unseen handled message from inbox after the seen set is lost', async () => {
    build();
    await submit();
    await engine.tick(1);
    orca.settle('ctx_1');
    const message: DeliveryMessage = {
      id: 'msg_1',
      type: 'worker_done',
      payload: { taskId: 'task_1', dispatchId: 'ctx_1', outcome: 'succeeded' },
    };
    orca.deliver(message);
    await engine.tick(1);
    await engine.tick(1);
    expect(chat.sent).toHaveLength(1);

    const store = new Store(dir);
    store.update((state) => {
      delete state.seenMessages.msg_1;
      state.tasks.req1.state = 'running';
    });
    await engine.startup();
    await engine.tick(1);
    expect(store.load().tasks.req1.state).toBe('done');
    expect(chat.sent.filter((item) => item.sendId === sanitizeSendId('req1:done'))).toHaveLength(1);
  });
});
