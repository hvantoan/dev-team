import { describe, expect, it } from 'vitest';
import { validateConfig } from '../src/config.js';

const project = {
  repo: 'id:repo_123',
  path: '/tmp/project',
  agent: 'claude',
  check: 'true',
};

describe('config validation', () => {
  it('accepts a minimal project and applies setup defaults', () => {
    const config = validateConfig({ projects: { tms: project } });
    expect(config.projects.tms.setup).toBe('run');
    expect(config.projects.tms.repo).toBe('id:repo_123');
  });

  it('rejects an empty project map', () => {
    expect(() => validateConfig({ projects: {} })).toThrow(/non-empty/);
  });

  it('rejects a repo that is not an Orca selector', () => {
    expect(() => validateConfig({ projects: { tms: { ...project, repo: 'repo_123' } } })).toThrow(/selector/);
  });

  it('rejects a relative project path', () => {
    expect(() => validateConfig({ projects: { tms: { ...project, path: './tms' } } })).toThrow(/absolute/);
  });

  it('rejects a missing check command', () => {
    expect(() => validateConfig({ projects: { tms: { ...project, check: '' } } })).toThrow(/check/);
  });

  it('rejects a non-positive default timeout', () => {
    expect(() => validateConfig({ projects: { tms: project }, defaults: { wait_timeout_ms: 0 } })).toThrow(/positive integer/);
  });

  it('keeps allow and deny lists', () => {
    const config = validateConfig({ projects: { tms: { ...project, allow: ['src/**'], deny: ['**/migrations/**'] } } });
    expect(config.projects.tms.allow).toEqual(['src/**']);
    expect(config.projects.tms.deny).toEqual(['**/migrations/**']);
  });
});
