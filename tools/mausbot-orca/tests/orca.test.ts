import { describe, expect, it } from 'vitest';
import { Orca, OrcaError, parseEnvelope, type Exec, type ExecResult } from '../src/orca.js';

function fakeExec(responder: (args: string[], input?: string) => ExecResult): { exec: Exec; calls: Array<{ args: string[]; input?: string }> } {
  const calls: Array<{ args: string[]; input?: string }> = [];
  return {
    calls,
    exec: async (_command, args, options) => {
      calls.push({ args, input: options?.input });
      return responder(args, options?.input);
    },
  };
}

const ok = (result: unknown): ExecResult => ({ code: 0, stdout: JSON.stringify({ ok: true, result }), stderr: '' });

describe('Orca adapter', () => {
  it('ignores keepalive lines and returns the last envelope', () => {
    const envelope = parseEnvelope('{"_keepalive":1}\n{"ok":true,"result":{"x":1}}\n');
    expect(envelope).toEqual({ ok: true, result: { x: 1 } });
  });

  it('parses a pretty-printed envelope (orca ≥1.4.265)', () => {
    const pretty = JSON.stringify({ ok: true, result: { x: 2 } }, null, 2);
    expect(parseEnvelope(pretty)).toEqual({ ok: true, result: { x: 2 } });
  });

  it('parses a pretty envelope with keepalive noise and trailing junk', () => {
    const pretty = JSON.stringify({ ok: true, result: { x: 3 } }, null, 2);
    expect(parseEnvelope(`{"_keepalive":1}\n${pretty}\nPTY banner line`)).toEqual({ ok: true, result: { x: 3 } });
  });

  it('extracts a terminal handle from a nested result', async () => {
    const { exec, calls } = fakeExec(() => ok({ terminal: { handle: 'term_1' } }));
    const orca = new Orca('orca', exec);
    await expect(orca.terminalCreate('/tmp/repo', 'COORD')).resolves.toBe('term_1');
    expect(calls[0].args).toContain('--command');
    expect(calls[0].args).toContain('sleep infinity');
  });

  it('parses check messages and their JSON-string payloads', async () => {
    const { exec, calls } = fakeExec(() =>
      ok({
        messages: [
          { id: 'msg_1', type: 'worker_done', payload: '{"taskId":"task_1","dispatchId":"ctx_1","outcome":"succeeded"}' },
        ],
      }),
    );
    const orca = new Orca('orca', exec);
    const messages = await orca.checkWait('run_1', 'term_1', 5_000);
    expect(messages[0]).toMatchObject({
      id: 'msg_1',
      type: 'worker_done',
      payload: { taskId: 'task_1', dispatchId: 'ctx_1', outcome: 'succeeded' },
    });
    expect(calls[0].args).toContain('--wait');
    expect(calls[0].args.join(' ')).toContain('worker_done,question,escalation');
  });

  it('normalizes snake_case and top-level task ids', async () => {
    const { exec } = fakeExec(() =>
      ok({
        messages: [
          { id: 'msg_2', type: 'worker_done', payload: '{"outcome":"succeeded"}', task_id: 'task_1', dispatch_id: 'ctx_1' },
        ],
      }),
    );
    const orca = new Orca('orca', exec);
    const messages = await orca.checkWait('run_1', 'term_1', 5_000);
    expect(messages[0].payload).toMatchObject({ taskId: 'task_1', dispatchId: 'ctx_1', outcome: 'succeeded' });
  });

  it('throws a typed error for ok:false envelopes', async () => {
    const { exec } = fakeExec(() => ({
      code: 0,
      stdout: JSON.stringify({ ok: false, error: { code: 'consumer_fenced', message: 'fenced' } }),
      stderr: '',
    }));
    const orca = new Orca('orca', exec);
    await expect(orca.runUse('run_1', 'term_1')).rejects.toMatchObject({ code: 'consumer_fenced' } satisfies Partial<OrcaError>);
  });

  it('uses creation flags only on the first worker start', async () => {
    const { exec, calls } = fakeExec(() => ok({ dispatchId: 'ctx_1' }));
    const orca = new Orca('orca', exec);
    await orca.workerStart({
      taskId: 'task_1',
      runId: 'run_1',
      handle: 'term_1',
      repo: 'id:r1',
      agent: 'claude',
      setup: 'run',
      name: 'tms-abcd',
      baseBranch: 'develop',
      comment: 'req-1',
    });
    expect(calls[0].args.join(' ')).toContain('--worktree new-top-level');
    expect(calls[0].args.join(' ')).toContain('--setup run');
    expect(calls[0].args.join(' ')).toContain('--base-branch develop');

    await orca.workerStart({
      taskId: 'task_1',
      runId: 'run_1',
      handle: 'term_1',
      repo: 'id:r1',
      agent: 'claude',
      setup: 'run',
      name: 'tms-abcd',
      worktree: '/tmp/wt',
      retryOf: 'ctx_1',
    });
    const retry = calls[1].args.join(' ');
    expect(retry).toContain('--retry-of ctx_1');
    expect(retry).toContain('--worktree path:/tmp/wt');
    expect(retry).not.toContain('--setup');
    expect(retry).not.toContain('--repo');
  });

  it('reads a plain worktree path from worker-show', async () => {
    const { exec } = fakeExec(() => ok({ dispatchId: 'ctx_1', taskId: 'task_1', state: 'succeeded', workspace: '/tmp/wt' }));
    const orca = new Orca('orca', exec);
    const info = await orca.workerShow('ctx_1');
    expect(info.worktree).toBe('/tmp/wt');
  });

  it('reads the app version from status', async () => {
    const { exec } = fakeExec(() => ok({ appVersion: '1.4.263', ready: true }));
    const orca = new Orca('orca', exec);
    await expect(orca.appVersion()).resolves.toBe('1.4.263');
  });
});
