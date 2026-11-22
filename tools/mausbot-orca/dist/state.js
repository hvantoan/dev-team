import fs from 'node:fs';
import path from 'node:path';
import { isRecord } from './guards.js';
export function statePath(dir) {
    return path.join(dir, 'state.json');
}
export function emptyState() {
    return { version: 1, coordinator: {}, runs: {}, tasks: {}, threads: {}, seenMessages: {}, outbox: {} };
}
export class Store {
    dir;
    constructor(dir) {
        this.dir = dir;
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
        try {
            fs.chmodSync(dir, 0o700);
        }
        catch {
            // best effort; the state file is also created below
        }
    }
    load() {
        const file = statePath(this.dir);
        let raw;
        try {
            raw = fs.readFileSync(file, 'utf8');
        }
        catch {
            return emptyState();
        }
        const parsed = JSON.parse(raw);
        if (!isRecord(parsed) || parsed.version !== 1) {
            throw new Error(`unsupported state file: ${file}`);
        }
        const state = { ...emptyState(), ...parsed };
        for (const key of ['coordinator', 'runs', 'tasks', 'threads', 'seenMessages', 'outbox']) {
            if (!isRecord(state[key]))
                throw new Error(`state.${key} must be an object: ${file}`);
        }
        for (const task of Object.values(state.tasks)) {
            if (!isRecord(task) || typeof task.requestId !== 'string' || !isRecord(task.sent)) {
                throw new Error(`state.tasks is corrupt: ${file}`);
            }
            task.sent ??= {};
        }
        return state;
    }
    save(state) {
        fs.mkdirSync(this.dir, { recursive: true });
        const file = statePath(this.dir);
        const tmp = `${file}.${process.pid}.tmp`;
        fs.writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
        fs.renameSync(tmp, file);
    }
    update(mutate) {
        const state = this.load();
        mutate(state);
        this.save(state);
        return state;
    }
}
