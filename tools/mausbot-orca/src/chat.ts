import { defaultExec, type Exec } from './orca.js';
import type { ChatPort } from './types.js';

export class Chat implements ChatPort {
  constructor(
    private readonly command = 'openmausbot',
    private readonly exec: Exec = defaultExec,
  ) {}

  /** `channel:<id>` forces send_channel_message (rooms); `thread:<id>` or a bare id uses --thread. */
  async send(thread: string, text: string, sendId: string): Promise<void> {
    let flag = '--thread';
    let target = thread;
    if (thread.startsWith('channel:')) {
      flag = '--channel';
      target = thread.slice('channel:'.length);
    } else if (thread.startsWith('thread:')) {
      target = thread.slice('thread:'.length);
    }
    const result = await this.exec(
      this.command,
      ['send', flag, target, '--text', text, '--send-id', sendId],
      { timeoutMs: 60_000 },
    );
    if (result.code !== 0) {
      throw new Error(`openmausbot send failed (${result.code}): ${(result.stderr || result.stdout).trim().slice(0, 300)}`);
    }
  }
}
