import { describe, expect, it } from 'vitest';
import { deriveRequestId, mergedScope, parseSpec, specIdFromOrca, withRequestId } from '../src/spec.js';
import type { ProjectConfig } from '../src/types.js';

const project: ProjectConfig = {
  repo: 'id:r1',
  path: '/tmp/p',
  agent: 'claude',
  check: 'true',
  allow: ['src/**'],
  deny: ['**/migrations/**'],
};

describe('TaskSpec', () => {
  it('parses a valid spec and keeps optional arrays', () => {
    const spec = parseSpec({ objective: 'do it', context: ['a.ts'], done_when: ['true'] });
    expect(spec.objective).toBe('do it');
    expect(spec.context).toEqual(['a.ts']);
    expect(spec.done_when).toEqual(['true']);
  });

  it('rejects a missing objective', () => {
    expect(() => parseSpec({})).toThrow(/objective/);
  });

  it('rejects a bad max_attempts', () => {
    expect(() => parseSpec({ objective: 'x', max_attempts: 0 })).toThrow(/max_attempts/);
  });

  it('rejects non-string array members', () => {
    expect(() => parseSpec({ objective: 'x', context: [1] })).toThrow(/array of strings/);
  });

  it('derives a stable request id and stamps it into the spec', () => {
    const spec = parseSpec({ objective: 'do it' });
    const first = deriveRequestId('thread-1', 'tms', spec);
    const second = deriveRequestId('thread-1', 'tms', spec);
    expect(first).toBe(second);
    expect(first).toHaveLength(16);
    expect(withRequestId(spec, first).id).toBe(first);
  });

  it('reads the request id back from a serialized Orca task', () => {
    const spec = withRequestId(parseSpec({ objective: 'x' }), 'abc123');
    expect(specIdFromOrca(JSON.stringify(spec))).toBe('abc123');
    expect(specIdFromOrca('not json')).toBeUndefined();
  });

  it('merges project and spec scope with deny-wins semantics', () => {
    const spec = parseSpec({ objective: 'x', scope: { allow: ['lib/**'], deny: ['**/secrets/**'] } });
    expect(mergedScope(project, spec)).toEqual({
      allow: ['src/**', 'lib/**'],
      deny: ['**/migrations/**', '**/secrets/**'],
    });
  });
});
