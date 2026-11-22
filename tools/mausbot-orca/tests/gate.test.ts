import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { changedFiles, gate, runCheck } from '../src/gate.js';

let repo: string;

function git(...args: string[]) {
  execFileSync('git', ['-C', repo, ...args], { stdio: 'ignore' });
}

beforeEach(() => {
  repo = fs.mkdtempSync(path.join(os.tmpdir(), 'mausbot-orca-gate-'));
  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  fs.mkdirSync(path.join(repo, 'src'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'src/a.ts'), 'export const a = 1;\n');
  fs.writeFileSync(path.join(repo, 'README.md'), '# test\n');
  git('add', '.');
  git('commit', '-qm', 'init');
});

afterEach(() => {
  fs.rmSync(repo, { recursive: true, force: true });
});

describe('gate', () => {
  it('reports tracked and untracked changes', async () => {
    fs.appendFileSync(path.join(repo, 'src/a.ts'), '// changed\n');
    fs.writeFileSync(path.join(repo, 'src/new.ts'), 'export const b = 2;\n');
    const files = await changedFiles(repo, undefined);
    expect(files).toEqual(['src/a.ts', 'src/new.ts']);
  });

  it('passes when the check succeeds and files stay in scope', async () => {
    fs.appendFileSync(path.join(repo, 'src/a.ts'), '// changed\n');
    const result = await gate(repo, 'true', { allow: ['src/**'], deny: [] }, 10_000, undefined);
    expect(result.ok).toBe(true);
    expect(result.files).toEqual(['src/a.ts']);
  });

  it('fails when the check command exits non-zero', async () => {
    fs.appendFileSync(path.join(repo, 'src/a.ts'), '// changed\n');
    const result = await gate(repo, 'false', { allow: ['src/**'], deny: [] }, 10_000, undefined);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/check exited/);
  });

  it('fails when a changed file is outside the allow list', async () => {
    fs.appendFileSync(path.join(repo, 'README.md'), 'changed\n');
    const result = await gate(repo, 'true', { allow: ['src/**'], deny: [] }, 10_000, undefined);
    expect(result.ok).toBe(false);
    expect(result.violations).toEqual(['README.md']);
  });

  it('fails when a changed file matches a deny pattern', async () => {
    fs.mkdirSync(path.join(repo, 'migrations'), { recursive: true });
    fs.writeFileSync(path.join(repo, 'migrations/001.sql'), 'select 1;\n');
    const result = await gate(repo, 'true', { allow: [], deny: ['**/migrations/**'] }, 10_000, undefined);
    expect(result.ok).toBe(false);
    expect(result.violations).toEqual(['migrations/001.sql']);
  });

  it('captures check output', async () => {
    const result = await runCheck(repo, 'echo hello && exit 3', 10_000);
    expect(result.code).toBe(3);
    expect(result.output).toContain('hello');
  });

  it('fails closed when the base branch cannot be diffed', async () => {
    const result = await gate(repo, 'true', { allow: [], deny: [] }, 10_000, 'does-not-exist');
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/cannot determine changed files/);
  });

  it('fails closed when the worktree is not a git repository', async () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'mausbot-orca-nogit-'));
    const result = await gate(empty, 'true', { allow: [], deny: [] }, 10_000, undefined);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/cannot determine changed files/);
    fs.rmSync(empty, { recursive: true, force: true });
  });
});
