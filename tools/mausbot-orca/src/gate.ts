import { defaultExec, type Exec } from './orca.js';
import { scopeViolations, type Scope } from './glob.js';

export interface CheckResult {
  code: number;
  output: string;
}

export async function runCheck(worktree: string, command: string, timeoutMs: number, exec: Exec = defaultExec): Promise<CheckResult> {
  const result = await exec('sh', ['-c', command], { cwd: worktree, timeoutMs });
  return { code: result.code, output: `${result.stdout}${result.stderr}`.trim().slice(0, 4_000) };
}

export async function changedFiles(worktree: string, baseBranch: string | undefined, exec: Exec = defaultExec): Promise<string[]> {
  const files = new Set<string>();
  const status = await exec('git', ['-C', worktree, 'status', '--porcelain=v1', '-uall'], { timeoutMs: 60_000 });
  if (status.code !== 0) {
    throw new Error(`git status failed in ${worktree}: ${status.stderr.trim().slice(0, 300)}`);
  }
  for (const line of status.stdout.split('\n')) {
    if (line.length < 4) continue;
    const path = line.slice(3);
    const renamed = path.includes(' -> ') ? path.split(' -> ').pop() ?? path : path;
    files.add(renamed.trim());
  }
  if (baseBranch) {
    const diff = await exec('git', ['-C', worktree, 'diff', '--name-only', `${baseBranch}...HEAD`], { timeoutMs: 60_000 });
    if (diff.code !== 0) {
      throw new Error(`git diff ${baseBranch}...HEAD failed in ${worktree}: ${diff.stderr.trim().slice(0, 300)}`);
    }
    for (const line of diff.stdout.split('\n')) {
      if (line.trim()) files.add(line.trim());
    }
  }
  return [...files].sort();
}

export interface GateResult {
  ok: boolean;
  files: string[];
  violations: string[];
  check: CheckResult;
  reason?: string;
}

export async function gate(
  worktree: string,
  checkCommand: string,
  scope: Scope,
  timeoutMs: number,
  baseBranch: string | undefined,
  exec: Exec = defaultExec,
): Promise<GateResult> {
  let files: string[];
  try {
    files = await changedFiles(worktree, baseBranch, exec);
  } catch (error) {
    return {
      ok: false,
      files: [],
      violations: [],
      check: { code: 1, output: '' },
      reason: `cannot determine changed files: ${(error as Error).message}`,
    };
  }
  const violations = scopeViolations(files, scope);
  const check = await runCheck(worktree, checkCommand, timeoutMs, exec);
  if (violations.length > 0) {
    return { ok: false, files, violations, check, reason: `files outside scope: ${violations.join(', ')}` };
  }
  if (check.code !== 0) {
    return { ok: false, files, violations, check, reason: `check exited ${check.code}` };
  }
  return { ok: true, files, violations, check };
}
