import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { Store, emptyState, statePath } from '../src/state.js';

let dir: string | undefined;

afterEach(() => {
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

describe('state store', () => {
  it('returns an empty state when the file is missing', () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mausbot-orca-state-'));
    expect(new Store(dir).load()).toEqual(emptyState());
  });

  it('round-trips and writes atomically with owner-only permissions', () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mausbot-orca-state-'));
    const store = new Store(dir);
    store.update((state) => {
      state.coordinator.handle = 'term_1';
      state.runs.tms = 'run_1';
      state.tasks.req = {
        requestId: 'req',
        thread: 't1',
        project: 'tms',
        spec: { id: 'req', objective: 'x' },
        state: 'dispatching',
        createdAt: 1,
        updatedAt: 1,
        runId: 'run_1',
        taskId: 'task_1',
        attempts: 0,
        sent: {},
      };
    });
    const loaded = store.load();
    expect(loaded.coordinator.handle).toBe('term_1');
    expect(loaded.tasks.req.taskId).toBe('task_1');
    expect(fs.statSync(statePath(dir)).mode & 0o777).toBe(0o600);
  });

  it('rejects a state file from an unknown version', () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mausbot-orca-state-'));
    fs.writeFileSync(statePath(dir), JSON.stringify({ version: 2 }));
    expect(() => new Store(dir).load()).toThrow(/unsupported state/);
  });
});
