import { spawn } from 'node:child_process';
import { isRecord } from './guards.js';
export function defaultExec(command, args, options = {}) {
    return new Promise((resolve) => {
        const child = spawn(command, args, { cwd: options.cwd, stdio: ['pipe', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';
        let settled = false;
        const finish = (result) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            resolve(result);
        };
        const timer = setTimeout(() => {
            child.kill('SIGKILL');
            finish({ code: 124, stdout, stderr: `${stderr}\ncommand timed out after ${options.timeoutMs ?? 0}ms` });
        }, options.timeoutMs ?? 60_000);
        child.stdout.on('data', (chunk) => {
            stdout += chunk.toString('utf8');
        });
        child.stderr.on('data', (chunk) => {
            stderr += chunk.toString('utf8');
        });
        child.on('error', (error) => finish({ code: 127, stdout, stderr: `${stderr}\n${error.message}` }));
        child.on('close', (code) => finish({ code: code ?? 1, stdout, stderr }));
        child.stdin.on('error', () => {
            // The command exited without reading stdin (for example `sh -c true`).
        });
        try {
            child.stdin.end(options.input ?? '');
        }
        catch {
            // The command exited before reading stdin; the close handler reports the code.
        }
    });
}
export class OrcaError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'OrcaError';
    }
}
/** Parse the CLI JSON envelope. Prefer whole-stdout JSON (orca ≥1.4.265 pretty-prints); fall back to last single-line envelope, ignoring keepalives. */
export function parseEnvelope(stdout) {
    const whole = stdout
        .split('\n')
        .filter((line) => !line.includes('_keepalive'))
        .join('\n')
        .trim();
    if (whole.startsWith('{')) {
        try {
            const value = JSON.parse(whole);
            if (isRecord(value) && typeof value.ok === 'boolean')
                return value;
        }
        catch {
            // not a single envelope; fall back to line scanning
        }
    }
    // Envelope embedded in noise: try each "{" line as start, dropping trailing lines until it parses.
    const lines = stdout.split('\n');
    for (let start = 0; start < lines.length; start += 1) {
        if (!lines[start].trim().startsWith('{') || lines[start].includes('_keepalive'))
            continue;
        for (let end = lines.length; end > start; end -= 1) {
            try {
                const value = JSON.parse(lines.slice(start, end).join('\n').trim());
                if (isRecord(value) && typeof value.ok === 'boolean')
                    return value;
            }
            catch {
                // keep trimming
            }
        }
    }
    const candidates = stdout
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('{') && !line.includes('_keepalive'));
    for (let index = candidates.length - 1; index >= 0; index -= 1) {
        try {
            const value = JSON.parse(candidates[index]);
            if (isRecord(value) && typeof value.ok === 'boolean')
                return value;
        }
        catch {
            // keep scanning
        }
    }
    throw new OrcaError('bad_envelope', `orca did not return a JSON envelope: ${stdout.slice(0, 400)}`);
}
function deepFind(value, key) {
    if (Array.isArray(value)) {
        for (const item of value) {
            const found = deepFind(item, key);
            if (found)
                return found;
        }
        return undefined;
    }
    if (!isRecord(value))
        return undefined;
    const direct = value[key];
    if (typeof direct === 'string' && direct)
        return direct;
    for (const child of Object.values(value)) {
        const found = deepFind(child, key);
        if (found)
            return found;
    }
    return undefined;
}
function findFirst(value, keys) {
    for (const key of keys) {
        const found = deepFind(value, key);
        if (found)
            return found;
    }
    return undefined;
}
function asArray(value, key) {
    if (!isRecord(value))
        return [];
    const direct = value[key];
    if (Array.isArray(direct))
        return direct.filter(isRecord);
    const nested = deepFindObjects(value, key);
    return nested;
}
function deepFindObjects(value, key) {
    if (Array.isArray(value)) {
        for (const item of value) {
            const found = deepFindObjects(item, key);
            if (found.length > 0)
                return found;
        }
        return [];
    }
    if (!isRecord(value))
        return [];
    const direct = value[key];
    if (Array.isArray(direct))
        return direct.filter(isRecord);
    for (const child of Object.values(value)) {
        const found = deepFindObjects(child, key);
        if (found.length > 0)
            return found;
    }
    return [];
}
function parsePayload(raw) {
    if (isRecord(raw))
        return raw;
    if (typeof raw !== 'string' || !raw.trim())
        return undefined;
    try {
        const value = JSON.parse(raw);
        return isRecord(value) ? value : undefined;
    }
    catch {
        return undefined;
    }
}
function pickString(value, keys) {
    for (const key of keys) {
        const item = value[key];
        if (typeof item === 'string')
            return item;
    }
    return undefined;
}
function messageFrom(raw) {
    const payload = parsePayload(raw.payload) ?? {};
    const taskId = pickString(raw, ['taskId', 'task_id']) ?? pickString(payload, ['taskId', 'task_id']);
    const dispatchId = pickString(raw, ['dispatchId', 'dispatch_id']) ?? pickString(payload, ['dispatchId', 'dispatch_id']);
    if (taskId)
        payload.taskId = taskId;
    if (dispatchId)
        payload.dispatchId = dispatchId;
    const id = pickString(raw, ['id', 'messageId', 'message_id']);
    const type = pickString(raw, ['type', 'kind']);
    if (!id || !type)
        return undefined;
    return {
        id,
        type,
        subject: pickString(raw, ['subject', 'summary']),
        body: pickString(raw, ['body', 'text', 'message']),
        payload,
        handled: typeof raw.handled === 'boolean' ? raw.handled : undefined,
    };
}
function messagesFrom(envelope) {
    const result = envelope.result;
    const rows = asArray(result, 'messages');
    return rows.map(messageFrom).filter((item) => item !== undefined);
}
function worktreeFrom(workspace) {
    if (!workspace)
        return undefined;
    if (workspace.includes('::'))
        return workspace.split('::').slice(1).join('::');
    if (workspace.startsWith('path:'))
        return workspace.slice(5);
    return workspace.startsWith('/') ? workspace : undefined;
}
export class Orca {
    command;
    exec;
    constructor(command = 'orca', exec = defaultExec) {
        this.command = command;
        this.exec = exec;
    }
    async run(args, options = {}) {
        const result = await this.exec(this.command, args, { input: options.input, timeoutMs: options.timeoutMs });
        if (result.code === 127 && !result.stdout.trim()) {
            throw new OrcaError('unavailable', `cannot run ${this.command}: ${result.stderr.trim() || 'not found'}`);
        }
        const envelope = parseEnvelope(result.stdout);
        if (envelope.ok !== true) {
            const error = isRecord(envelope.error) ? envelope.error : {};
            const code = typeof error.code === 'string' ? error.code : 'orca_error';
            const message = typeof error.message === 'string' ? error.message : `orca ${args.join(' ')} failed`;
            throw new OrcaError(code, message);
        }
        return envelope;
    }
    async appVersion() {
        const envelope = await this.run(['status', '--json']);
        return findFirst(envelope.result, ['appVersion', 'version']) ?? 'unknown';
    }
    async repoList() {
        const envelope = await this.run(['repo', 'list', '--json']);
        return asArray(envelope.result, 'repos').flatMap((repo) => {
            const id = typeof repo.id === 'string' ? repo.id : undefined;
            const repoPath = typeof repo.path === 'string' ? repo.path : undefined;
            return [id ? `id:${id}` : undefined, repoPath ? `path:${repoPath}` : undefined].filter((value) => value !== undefined);
        });
    }
    async agentInstalled() {
        const envelope = await this.run(['agent', 'installed', '--json']);
        return asArray(envelope.result, 'agents')
            .map((agent) => (typeof agent.id === 'string' ? agent.id : undefined))
            .filter((id) => id !== undefined);
    }
    async terminalCreate(worktree, title) {
        const envelope = await this.run([
            'terminal', 'create',
            '--worktree', `path:${worktree}`,
            '--title', title,
            '--command', 'sleep infinity',
            '--json',
        ]);
        const handle = findFirst(envelope.result, ['handle']);
        if (!handle)
            throw new OrcaError('bad_envelope', 'terminal create returned no handle');
        return handle;
    }
    async terminalList() {
        const envelope = await this.run(['terminal', 'list', '--json']);
        return asArray(envelope.result, 'terminals')
            .map((terminal) => (typeof terminal.handle === 'string' ? terminal.handle : undefined))
            .filter((handle) => handle !== undefined);
    }
    async terminalClose(handle) {
        await this.run(['terminal', 'close', '--terminal', handle, '--json']);
    }
    async runCreate(objective, handle) {
        const envelope = await this.run(['orchestration', 'run-create', '--objective', objective, '--from', handle, '--json']);
        const runId = findFirst(envelope.result, ['runId']);
        if (!runId)
            throw new OrcaError('bad_envelope', 'run-create returned no runId');
        return runId;
    }
    async runUse(runId, handle) {
        await this.run(['orchestration', 'run-use', '--id', runId, '--from', handle, '--json']);
    }
    async runList() {
        const envelope = await this.run(['orchestration', 'run-list', '--json']);
        return asArray(envelope.result, 'runs')
            .map((run) => ({
            id: typeof run.id === 'string' ? run.id : '',
            objective: typeof run.objective === 'string' ? run.objective : '',
        }))
            .filter((run) => run.id !== '');
    }
    async taskCreate(spec, runId, handle) {
        const envelope = await this.run(['orchestration', 'task-create', '--spec-file', '-', '--run', runId, '--from', handle, '--json'], { input: JSON.stringify(spec) });
        const taskId = findFirst(envelope.result, ['taskId']);
        if (!taskId)
            throw new OrcaError('bad_envelope', 'task-create returned no taskId');
        return taskId;
    }
    async taskList(runId) {
        const envelope = await this.run(['orchestration', 'task-list', '--run', runId, '--full', '--json']);
        return asArray(envelope.result, 'tasks').map((task) => ({
            id: typeof task.id === 'string' ? task.id : '',
            spec: typeof task.spec === 'string' ? task.spec : isRecord(task.spec) ? JSON.stringify(task.spec) : typeof task.title === 'string' ? task.title : '',
            status: typeof task.status === 'string' ? task.status : '',
        })).filter((task) => task.id !== '');
    }
    async workerStart(options) {
        const args = ['orchestration', 'worker-start', '--task', options.taskId];
        if (options.retryOf) {
            if (!options.worktree)
                throw new OrcaError('invalid_argument', 'retry needs an explicit worktree path');
            args.push('--retry-of', options.retryOf, '--worktree', `path:${options.worktree}`, '--agent', options.agent);
        }
        else {
            args.push('--worktree', 'new-top-level', '--repo', options.repo, '--name', options.name);
            args.push('--agent', options.agent, '--setup', options.setup);
            if (options.baseBranch)
                args.push('--base-branch', options.baseBranch);
            if (options.comment)
                args.push('--comment', options.comment);
        }
        if (options.model)
            args.push('--model', options.model);
        args.push('--run', options.runId, '--from', options.handle, '--json');
        const envelope = await this.run(args, { timeoutMs: 180_000 });
        const dispatchId = findFirst(envelope.result, ['dispatchId']);
        if (!dispatchId)
            throw new OrcaError('bad_envelope', 'worker-start returned no dispatchId');
        return dispatchId;
    }
    async workerList(runId) {
        const envelope = await this.run(['orchestration', 'worker-list', '--run', runId, '--json']);
        return asArray(envelope.result, 'workers').map((worker) => ({
            dispatchId: typeof worker.dispatchId === 'string' ? worker.dispatchId : '',
            taskId: typeof worker.taskId === 'string' ? worker.taskId : '',
            state: typeof worker.state === 'string' ? worker.state : 'unknown',
            workspace: typeof worker.workspace === 'string' ? worker.workspace : undefined,
            worktree: typeof worker.worktree === 'string' ? worker.worktree : undefined,
        })).filter((worker) => worker.dispatchId !== '');
    }
    async workerShow(dispatchId) {
        const envelope = await this.run(['orchestration', 'worker-show', '--dispatch', dispatchId, '--json']);
        const result = isRecord(envelope.result) ? envelope.result : {};
        const workspace = typeof result.workspace === 'string' ? result.workspace : undefined;
        const worktree = typeof result.worktree === 'string' ? result.worktree : worktreeFrom(workspace);
        return {
            dispatchId: typeof result.dispatchId === 'string' ? result.dispatchId : dispatchId,
            taskId: typeof result.taskId === 'string' ? result.taskId : '',
            state: typeof result.state === 'string' ? result.state : 'unknown',
            stage: typeof result.stage === 'string' ? result.stage : undefined,
            workspace,
            worktree,
        };
    }
    async checkWait(runId, handle, timeoutMs) {
        const envelope = await this.run([
            'orchestration', 'check',
            '--run', runId,
            '--terminal', handle,
            '--wait',
            '--types', 'worker_done,question,escalation',
            '--timeout-ms', String(timeoutMs),
            '--json',
        ], { timeoutMs: timeoutMs + 30_000 });
        return messagesFrom(envelope);
    }
    async inbox(runId) {
        const envelope = await this.run(['orchestration', 'inbox', '--run', runId, '--limit', '50', '--full', '--json']);
        return messagesFrom(envelope);
    }
    async reply(messageId, body, runId, handle) {
        await this.run(['orchestration', 'reply', '--id', messageId, '--body', body, '--run', runId, '--from', handle, '--json']);
    }
    async deny(dispatchId, promptId, reason, handle) {
        await this.run([
            'orchestration', 'deny',
            '--dispatch', dispatchId,
            '--prompt', promptId,
            '--reason', reason,
            '--from', handle,
            '--json',
        ]);
    }
}
