import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { UsageError } from '../src/errors.js';
import { callSocket, startSocket } from '../src/socket.js';

let dir: string | undefined;
let close: (() => Promise<void>) | undefined;

afterEach(async () => {
  await close?.();
  close = undefined;
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

describe('watcher socket', () => {
  it('round-trips a submit request', async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mausbot-orca-sock-'));
    close = await startSocket(dir, {
      submit: async (request) => ({ taskId: 'task_1', runId: 'run_1', project: request.project }),
      answer: async () => ({ ok: true }),
    }).then((server) => server.close);
    const result = await callSocket(dir, {
      type: 'submit',
      payload: { thread: 't1', project: 'tms', requestId: 'r1', spec: { id: 'r1', objective: 'x' } },
    });
    expect(result).toEqual({ taskId: 'task_1', runId: 'run_1', project: 'tms' });
  });

  it('propagates the handler exit code', async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mausbot-orca-sock-'));
    close = await startSocket(dir, {
      submit: async () => {
        throw new UsageError('bad project');
      },
      answer: async () => ({ ok: true }),
    }).then((server) => server.close);
    await expect(
      callSocket(dir, { type: 'submit', payload: { thread: 't1', project: 'nope', requestId: 'r1', spec: { id: 'r1', objective: 'x' } } }),
    ).rejects.toMatchObject({ exitCode: 2, message: 'bad project' });
  });

  it('refuses a second live socket', async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mausbot-orca-sock-'));
    const handler = {
      submit: async () => ({ ok: true }),
      answer: async () => ({ ok: true }),
    };
    close = (await startSocket(dir, handler)).close;
    await expect(startSocket(dir, handler)).rejects.toMatchObject({ exitCode: 4 });
  });

  it('reports exit 4 when the watcher is not running', async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mausbot-orca-sock-'));
    await expect(
      callSocket(dir, { type: 'submit', payload: { thread: 't1', project: 'tms', requestId: 'r1', spec: { id: 'r1', objective: 'x' } } }),
    ).rejects.toMatchObject({ exitCode: 4 });
  });
});
