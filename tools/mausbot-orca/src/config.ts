import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { UsageError } from './errors.js';
import { isRecord } from './guards.js';
import type { BridgeConfig, ProjectConfig } from './types.js';

export function configPath(): string {
  const base = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(base, 'mausbot-orca', 'config.json');
}

export function dataDir(): string {
  const base = process.env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state');
  return path.join(base, 'mausbot-orca');
}

export function readConfig(file: string): BridgeConfig {
  let raw: string;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    throw new UsageError(`config not found: ${file} (run "mausbot-orca init")`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new UsageError(`config is not valid JSON: ${file}: ${(error as Error).message}`);
  }
  return validateConfig(parsed, file);
}

function stringArray(value: unknown, where: string): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new UsageError(`${where} must be an array of strings`);
  }
  return value as string[];
}

export function validateConfig(value: unknown, source = 'config'): BridgeConfig {
  if (!isRecord(value)) throw new UsageError(`${source}: config must be an object`);
  if (!isRecord(value.projects) || Object.keys(value.projects).length === 0) {
    throw new UsageError(`${source}: projects must be a non-empty object`);
  }
  const projects: Record<string, ProjectConfig> = {};
  for (const [name, raw] of Object.entries(value.projects)) {
    if (!isRecord(raw)) throw new UsageError(`${source}: project "${name}" must be an object`);
    const repo = requiredString(raw.repo, `${source}: project "${name}".repo`);
    if (!repo.startsWith('id:') && !repo.startsWith('path:') && !repo.startsWith('name:')) {
      throw new UsageError(`${source}: project "${name}".repo must be an Orca selector such as id:repo_123`);
    }
    const projectPath = requiredString(raw.path, `${source}: project "${name}".path`);
    if (!path.isAbsolute(projectPath)) {
      throw new UsageError(`${source}: project "${name}".path must be absolute`);
    }
    const agent = requiredString(raw.agent, `${source}: project "${name}".agent`);
    const check = requiredString(raw.check, `${source}: project "${name}".check`);
    const setup = raw.setup ?? 'run';
    if (setup !== 'run' && setup !== 'skip') {
      throw new UsageError(`${source}: project "${name}".setup must be "run" or "skip"`);
    }
    projects[name] = {
      repo,
      path: projectPath,
      agent,
      base_branch: optionalString(raw.base_branch, `${source}: project "${name}".base_branch`),
      setup,
      check,
      allow: stringArray(raw.allow, `${source}: project "${name}".allow`),
      deny: stringArray(raw.deny, `${source}: project "${name}".deny`),
    };
  }
  const defaults = isRecord(value.defaults) ? value.defaults : {};
  const allow = isRecord(value.allow) ? value.allow : undefined;
  const chat = isRecord(value.chat) ? value.chat : undefined;
  const orca = isRecord(value.orca) ? value.orca : undefined;
  return {
    projects,
    defaults: {
      max_attempts: positiveInt(defaults.max_attempts, `${source}: defaults.max_attempts`),
      wait_timeout_ms: positiveInt(defaults.wait_timeout_ms, `${source}: defaults.wait_timeout_ms`),
      approval_timeout_ms: positiveInt(defaults.approval_timeout_ms, `${source}: defaults.approval_timeout_ms`),
      gate_timeout_ms: positiveInt(defaults.gate_timeout_ms, `${source}: defaults.gate_timeout_ms`),
    },
    allow: allow ? { users: stringArray(allow.users, `${source}: allow.users`) } : undefined,
    chat: chat ? { command: optionalString(chat.command, `${source}: chat.command`) } : undefined,
    orca: orca ? { command: optionalString(orca.command, `${source}: orca.command`) } : undefined,
    outbox_retry_ms: positiveInt(value.outbox_retry_ms, `${source}: outbox_retry_ms`),
  };
}

function requiredString(value: unknown, where: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new UsageError(`${where} must be a non-empty string`);
  return value.trim();
}

function optionalString(value: unknown, where: string): string | undefined {
  if (value === undefined) return undefined;
  return requiredString(value, where);
}

function positiveInt(value: unknown, where: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new UsageError(`${where} must be a positive integer`);
  }
  return value;
}

export function sampleConfig(): BridgeConfig {
  return {
    projects: {
      tms: {
        repo: 'id:repo_123',
        path: '/home/you/work/tms',
        agent: 'claude',
        base_branch: 'develop',
        setup: 'run',
        check: 'pnpm test --filter api',
        deny: ['**/migrations/**'],
      },
    },
    defaults: { max_attempts: 2, wait_timeout_ms: 30_000, approval_timeout_ms: 1_800_000 },
    allow: { users: [] },
  };
}
