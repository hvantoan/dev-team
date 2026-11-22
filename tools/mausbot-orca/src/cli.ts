#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { configPath, dataDir, readConfig, sampleConfig } from './config.js';
import { BridgeError, UsageError } from './errors.js';
import { Chat } from './chat.js';
import { Engine } from './engine.js';
import { Orca } from './orca.js';
import { Store } from './state.js';
import { callSocket, startSocket } from './socket.js';
import { deriveRequestId, parseSpec, withRequestId } from './spec.js';
import type { AnswerRequest, SubmitRequest, TaskSpec } from './types.js';

interface Parsed {
  cmd: string;
  flags: Record<string, string | true>;
  positionals: string[];
}

const BOOLEAN_FLAGS = new Set(['once', 'json', 'force', 'help', 'version']);

function parseArgs(argv: string[]): Parsed {
  const [cmd = 'help', ...rest] = argv;
  const flags: Record<string, string | true> = {};
  const positionals: string[] = [];
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === '-' || !arg.startsWith('--')) {
      positionals.push(arg);
      continue;
    }
    const body = arg.slice(2);
    const equals = body.indexOf('=');
    if (equals >= 0) {
      flags[body.slice(0, equals)] = body.slice(equals + 1);
      continue;
    }
    if (BOOLEAN_FLAGS.has(body)) {
      flags[body] = true;
      continue;
    }
    const value = rest[index + 1];
    if (value === undefined) throw new UsageError(`--${body} needs a value`);
    flags[body] = value;
    index += 1;
  }
  return { cmd, flags, positionals };
}

function stringFlag(parsed: Parsed, name: string, required = true): string | undefined {
  const value = parsed.flags[name];
  if (value === undefined || value === true) {
    if (required) throw new UsageError(`--${name} is required`);
    return undefined;
  }
  return value;
}

function option(parsed: Parsed, name: string): string | undefined {
  return typeof parsed.flags[name] === 'string' ? (parsed.flags[name] as string) : undefined;
}

function readStdin(): string {
  return fs.readFileSync(0, 'utf8');
}

function readSpec(parsed: Parsed): TaskSpec {
  const file = option(parsed, 'spec-file');
  const raw = file === '-' || file === undefined ? readStdin() : fs.readFileSync(file, 'utf8');
  if (!raw.trim()) throw new UsageError('spec is empty');
  let parsedSpec: unknown;
  try {
    parsedSpec = JSON.parse(raw);
  } catch (error) {
    throw new UsageError(`spec is not valid JSON: ${(error as Error).message}`);
  }
  return parseSpec(parsedSpec);
}

function makeEngine(parsed: Parsed): { engine: Engine; dir: string; configFile: string } {
  const configFile = option(parsed, 'config') ?? configPath();
  const dir = option(parsed, 'data-dir') ?? dataDir();
  const config = readConfig(configFile);
  const orca = new Orca(config.orca?.command ?? 'orca');
  const chat = new Chat(config.chat?.command ?? 'openmausbot');
  const engine = new Engine({ config, store: new Store(dir), orca, chat });
  return { engine, dir, configFile };
}

async function main(argv: string[]): Promise<number> {
  const parsed = parseArgs(argv);
  if (parsed.cmd === '--version' || parsed.flags.version) {
    process.stdout.write(`${version()}\n`);
    return 0;
  }
  if (parsed.cmd === 'help' || parsed.cmd === '--help' || parsed.cmd === '-h' || parsed.flags.help) {
    process.stdout.write(HELP);
    return 0;
  }
  if (parsed.cmd === 'init') {
    const file = option(parsed, 'config') ?? configPath();
    const dir = option(parsed, 'data-dir') ?? dataDir();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    fs.chmodSync(dir, 0o700);
    if (fs.existsSync(file) && parsed.flags.force !== true) {
      process.stdout.write(`config already exists: ${file} (pass --force to replace)\n`);
      return 0;
    }
    fs.writeFileSync(file, `${JSON.stringify(sampleConfig(), null, 2)}\n`, { mode: 0o600 });
    fs.chmodSync(file, 0o600);
    process.stdout.write(`wrote ${file}\nstate dir: ${dir}\n`);
    return 0;
  }
  if (parsed.cmd === 'projects') {
    const config = readConfig(option(parsed, 'config') ?? configPath());
    for (const [name, project] of Object.entries(config.projects)) {
      process.stdout.write(`${name}\t${project.agent}\t${project.repo}\t${project.check}\n`);
    }
    return 0;
  }

  const { engine, dir } = makeEngine(parsed);
  if (parsed.cmd === 'submit') {
    const thread = stringFlag(parsed, 'thread') as string;
    const project = stringFlag(parsed, 'project') as string;
    const spec = readSpec(parsed);
    const agent = option(parsed, 'agent');
    if (agent) spec.agent = agent;
    const requestId = option(parsed, 'request-id') ?? deriveRequestId(thread, project, spec);
    const payload: SubmitRequest = {
      thread,
      project,
      spec: withRequestId(spec, requestId),
      requestId,
      user: option(parsed, 'user'),
    };
    const result = (await callSocket(dir, { type: 'submit', payload })) as {
      duplicate: boolean;
      requestId: string;
      taskId: string;
      runId: string;
    };
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return result.duplicate ? 3 : 0;
  }
  if (parsed.cmd === 'answer') {
    const thread = stringFlag(parsed, 'thread') as string;
    const text = option(parsed, 'text') ?? readStdin();
    if (!text.trim()) throw new UsageError('answer text is empty');
    const payload: AnswerRequest = { thread, text, requestId: option(parsed, 'request-id') };
    const result = await callSocket(dir, { type: 'answer', payload });
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return 0;
  }
  if (parsed.cmd === 'status') {
    const status = await engine.status();
    if (parsed.flags.json) {
      process.stdout.write(`${JSON.stringify(status, null, 2)}\n`);
      return 0;
    }
    process.stdout.write(`coordinator: ${status.coordinator.handle ?? 'none'} ${status.coordinator.ok ? 'ok' : 'missing'}\n`);
    for (const task of status.tasks) {
      process.stdout.write(`${task.requestId}\t${task.project}\t${task.state}\tattempts=${task.attempts}\t${task.dispatchId ?? '-'}\n`);
    }
    return 0;
  }
  if (parsed.cmd === 'watch') {
    return watch(engine, dir, parsed.flags.once === true);
  }
  throw new UsageError(`unknown command "${parsed.cmd}"`);
}

async function watch(engine: Engine, dir: string, once: boolean): Promise<number> {
  let stopping = false;
  const stop = () => {
    stopping = true;
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  if (once) {
    await engine.startup();
    const oneShot = await startSocket(dir, {
      submit: (request) => engine.submit(request),
      answer: (request) => engine.answer(request),
    });
    try {
      await engine.tick(300);
      return 0;
    } finally {
      await oneShot.close();
    }
  }
  while (!stopping) {
    try {
      await engine.startup();
      break;
    } catch (error) {
      process.stderr.write(`startup failed: ${(error as Error).message}; retrying in 5s\n`);
      await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
  }
  if (stopping) return 0;
  const socket = await startSocket(dir, {
    submit: (request) => engine.submit(request),
    answer: (request) => engine.answer(request),
  });
  try {
    while (!stopping) {
      try {
        await engine.tick();
      } catch (error) {
        process.stderr.write(`tick failed: ${(error as Error).message}\n`);
        await new Promise((resolve) => setTimeout(resolve, 2_000));
      }
    }
    return 0;
  } finally {
    await socket.close();
  }
}

function version(): string {
  try {
    const file = new URL('../package.json', import.meta.url);
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as { version?: string };
    return parsed.version ?? '0.1.0';
  } catch {
    return '0.1.0';
  }
}

const HELP = `mausbot-orca — mausbot chat to Orca orchestration

  mausbot-orca init [--force] [--config FILE] [--data-dir DIR]
  mausbot-orca submit --thread ID --project NAME [--agent ID] [--spec-file FILE|-]
                      [--request-id ID] [--user ID]
  mausbot-orca answer --thread ID [--text TEXT|-] [--request-id ID]
  mausbot-orca watch [--once] [--config FILE] [--data-dir DIR]
  mausbot-orca status [--json]
  mausbot-orca projects
  mausbot-orca --version

Exit codes: 0 ok, 2 invalid input, 3 duplicate request, 4 watcher unavailable.
`;

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    if (error instanceof BridgeError) {
      process.stderr.write(`${error.message}\n`);
      process.exit(error.exitCode);
    }
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exit(1);
  });
