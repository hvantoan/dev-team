import { createHash } from 'node:crypto';
import { UsageError } from './errors.js';
import { isRecord } from './guards.js';
export function parseSpec(raw, source = 'spec') {
    if (!isRecord(raw))
        throw new UsageError(`${source} must be a JSON object`);
    const objective = raw.objective;
    if (typeof objective !== 'string' || !objective.trim()) {
        throw new UsageError(`${source}.objective must be a non-empty string`);
    }
    const maxAttempts = raw.max_attempts;
    if (maxAttempts !== undefined && (typeof maxAttempts !== 'number' || !Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 5)) {
        throw new UsageError(`${source}.max_attempts must be an integer from 1 to 5`);
    }
    const model = raw.model;
    if (model !== undefined && model !== null && typeof model !== 'string') {
        throw new UsageError(`${source}.model must be a string or null`);
    }
    let scope;
    if (raw.scope !== undefined) {
        if (!isRecord(raw.scope))
            throw new UsageError(`${source}.scope must be an object`);
        scope = {
            allow: optionalStringArray(raw.scope.allow, `${source}.scope.allow`),
            deny: optionalStringArray(raw.scope.deny, `${source}.scope.deny`),
        };
    }
    return {
        id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : '',
        objective: objective.trim(),
        context: optionalStringArray(raw.context, `${source}.context`),
        scope,
        non_goals: optionalStringArray(raw.non_goals, `${source}.non_goals`),
        done_when: optionalStringArray(raw.done_when, `${source}.done_when`),
        model: model === null ? null : model,
        max_attempts: maxAttempts,
        deps: optionalStringArray(raw.deps, `${source}.deps`),
        agent: typeof raw.agent === 'string' && raw.agent.trim() ? raw.agent.trim() : undefined,
    };
}
function optionalStringArray(value, where) {
    if (value === undefined)
        return undefined;
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
        throw new UsageError(`${where} must be an array of strings`);
    }
    return value;
}
/** Stable request id when the caller does not supply one. */
export function deriveRequestId(thread, project, spec) {
    const body = JSON.stringify({ thread, project, objective: spec.objective, context: spec.context ?? [], done_when: spec.done_when ?? [] });
    return createHash('sha256').update(body).digest('hex').slice(0, 16);
}
/** `id` must equal the request id so Task reconciliation can match the stored spec. */
export function withRequestId(spec, requestId) {
    return { ...spec, id: requestId };
}
export function serializeSpec(spec) {
    return JSON.stringify(spec);
}
/** Parse a TaskSpec stored by Orca without throwing at call sites that only need matching. */
export function specIdFromOrca(raw) {
    try {
        const value = JSON.parse(raw);
        if (!isRecord(value))
            return undefined;
        return typeof value.id === 'string' ? value.id : undefined;
    }
    catch {
        return undefined;
    }
}
export function mergedScope(project, spec) {
    return {
        allow: [...new Set([...(project.allow ?? []), ...(spec.scope?.allow ?? [])])],
        deny: [...new Set([...(project.deny ?? []), ...(spec.scope?.deny ?? [])])],
    };
}
export function maxAttempts(project, spec, fallback) {
    return spec.max_attempts ?? fallback;
}
/** `openmausbot send --send-id` accepts only 16-80 of letters, digits, `-` and `_`; stable for idempotent retries. */
export function sanitizeSendId(raw) {
    const cleaned = raw.replace(/[^A-Za-z0-9_-]/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '');
    if (cleaned.length >= 16 && cleaned.length <= 80)
        return cleaned;
    const hash = createHash('sha256').update(raw).digest('hex').slice(0, 12);
    const body = (cleaned || 'send').slice(0, Math.max(0, 79 - hash.length - 1));
    return `${body}-${hash}`.slice(0, 80);
}
export function slugFor(project, requestId) {
    return `${project}-${requestId}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 60);
}
