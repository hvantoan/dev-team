import { describe, expect, it } from 'vitest';
import { Chat } from '../src/chat.js';
import type { Exec, ExecResult } from '../src/orca.js';

function fakeExec(code = 0): { exec: Exec; calls: Array<{ args: string[] }> } {
  const calls: Array<{ args: string[] }> = [];
  return {
    calls,
    exec: async (_command, args) => {
      calls.push({ args });
      return { code, stdout: '', stderr: '' } satisfies ExecResult;
    },
  };
}

describe('Chat adapter', () => {
  it('uses --channel for channel:<id> targets (rooms)', async () => {
    const { exec, calls } = fakeExec();
    await new Chat('openmausbot', exec).send('channel:e59a7168-fda8-42a4-98e4-815924de3d3c', 'hi', 'send_1');
    expect(calls[0].args).toEqual([
      'send', '--channel', 'e59a7168-fda8-42a4-98e4-815924de3d3c', '--text', 'hi', '--send-id', 'send_1',
    ]);
  });

  it('uses --thread for bare ids and strips thread: prefix', async () => {
    const { exec, calls } = fakeExec();
    await new Chat('openmausbot', exec).send('thread:conv_123', 'a', 'send_2');
    await new Chat('openmausbot', exec).send('conv_456', 'b', 'send_3');
    expect(calls[0].args[1]).toBe('--thread');
    expect(calls[0].args[2]).toBe('conv_123');
    expect(calls[1].args[1]).toBe('--thread');
    expect(calls[1].args[2]).toBe('conv_456');
  });

  it('throws on non-zero exit', async () => {
    const { exec } = fakeExec(2);
    await expect(new Chat('openmausbot', exec).send('conv_1', 'x', 's')).rejects.toThrow('openmausbot send failed');
  });
});
