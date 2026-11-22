import { defaultExec } from './orca.js';
export class Chat {
    command;
    exec;
    constructor(command = 'openmausbot', exec = defaultExec) {
        this.command = command;
        this.exec = exec;
    }
    /** `channel:<id>` forces send_channel_message (rooms); `thread:<id>` or a bare id uses --thread. */
    async send(thread, text, sendId) {
        let flag = '--thread';
        let target = thread;
        if (thread.startsWith('channel:')) {
            flag = '--channel';
            target = thread.slice('channel:'.length);
        }
        else if (thread.startsWith('thread:')) {
            target = thread.slice('thread:'.length);
        }
        const result = await this.exec(this.command, ['send', flag, target, '--text', text, '--send-id', sendId], { timeoutMs: 60_000 });
        if (result.code !== 0) {
            throw new Error(`openmausbot send failed (${result.code}): ${(result.stderr || result.stdout).trim().slice(0, 300)}`);
        }
    }
}
