import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { BridgeError, UnavailableError } from './errors.js';
import { isRecord } from './guards.js';
import type { AnswerRequest, SubmitRequest } from './types.js';

export function socketPath(dir: string): string {
  return path.join(dir, 'watcher.sock');
}

export interface SocketHandler {
  submit(request: SubmitRequest): Promise<unknown>;
  answer(request: AnswerRequest): Promise<unknown>;
}

interface WireRequest {
  type: 'submit' | 'answer';
  payload: unknown;
}

export async function startSocket(dir: string, handler: SocketHandler): Promise<{ close: () => Promise<void> }> {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  try {
    fs.chmodSync(dir, 0o700);
  } catch {
    // best effort; the socket mode still protects the endpoint
  }
  const file = socketPath(dir);
  if (fs.existsSync(file)) {
    const alive = await new Promise<boolean>((resolve) => {
      const probe = net.createConnection(file);
      const finish = (value: boolean) => {
        probe.destroy();
        resolve(value);
      };
      probe.once('connect', () => finish(true));
      probe.once('error', () => finish(false));
      probe.setTimeout(1_000, () => finish(false));
    });
    if (alive) throw new UnavailableError('another watcher is already running');
    try {
      fs.unlinkSync(file);
    } catch {
      // already gone
    }
  }
  const server = net.createServer((socket) => {
    let buffer = '';
    socket.setEncoding('utf8');
    socket.on('data', (chunk: string) => {
      buffer += chunk;
      if (buffer.length > 1_048_576) {
        socket.end(`${JSON.stringify({ ok: false, error: { message: 'request too large', exitCode: 2 } })}\n`);
        return;
      }
      const newline = buffer.indexOf('\n');
      if (newline < 0) return;
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      void handleLine(line, handler)
        .then((response) => socket.end(`${JSON.stringify(response)}\n`))
        .catch((error: unknown) => {
          socket.end(
            `${JSON.stringify({
              ok: false,
              error: {
                message: error instanceof Error ? error.message : String(error),
                exitCode: error instanceof BridgeError ? error.exitCode : 1,
              },
            })}\n`,
          );
        });
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(file, () => resolve());
  });
  fs.chmodSync(file, 0o600);
  return {
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => {
          try {
            fs.unlinkSync(file);
          } catch {
            // already gone
          }
          resolve();
        });
      }),
  };
}

async function handleLine(line: string, handler: SocketHandler): Promise<unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return { ok: false, error: { message: 'request is not valid JSON', exitCode: 2 } };
  }
  if (!isRecord(parsed) || (parsed.type !== 'submit' && parsed.type !== 'answer') || !isRecord(parsed.payload)) {
    return { ok: false, error: { message: 'request must be {type: submit|answer, payload: object}', exitCode: 2 } };
  }
  const request = parsed as unknown as WireRequest;
  try {
    if (request.type === 'submit') return { ok: true, result: await handler.submit(request.payload as SubmitRequest) };
    return { ok: true, result: await handler.answer(request.payload as AnswerRequest) };
  } catch (error) {
    return {
      ok: false,
      error: { message: error instanceof Error ? error.message : String(error), exitCode: error instanceof BridgeError ? error.exitCode : 1 },
    };
  }
}

export async function callSocket(dir: string, request: WireRequest, timeoutMs = 120_000): Promise<unknown> {
  const file = socketPath(dir);
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(file);
    let buffer = '';
    let done = false;
    const finish = (error: unknown, value?: unknown) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      socket.destroy();
      if (error) reject(error);
      else resolve(value);
    };
    const timer = setTimeout(() => finish(new UnavailableError(`watcher did not answer within ${timeoutMs}ms`)), timeoutMs);
    socket.setEncoding('utf8');
    socket.on('connect', () => socket.write(`${JSON.stringify(request)}\n`));
    socket.on('data', (chunk: string) => {
      buffer += chunk;
      const newline = buffer.indexOf('\n');
      if (newline < 0) return;
      const line = buffer.slice(0, newline);
      try {
        const response: unknown = JSON.parse(line);
        if (!isRecord(response) || typeof response.ok !== 'boolean') {
          finish(new Error('watcher returned a malformed response'));
          return;
        }
        if (response.ok) {
          finish(undefined, response.result);
          return;
        }
        const error = isRecord(response.error) ? response.error : {};
        const message = typeof error.message === 'string' ? error.message : 'watcher rejected the request';
        const exitCode = typeof error.exitCode === 'number' ? error.exitCode : 1;
        finish(new BridgeError(message, exitCode));
      } catch (error) {
        finish(error);
      }
    });
    socket.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT' || error.code === 'ECONNREFUSED') {
        finish(new UnavailableError(`watcher is not running (${file})`));
      } else {
        finish(error);
      }
    });
  });
}
