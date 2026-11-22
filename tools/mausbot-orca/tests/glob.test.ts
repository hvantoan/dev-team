import { describe, expect, it } from 'vitest';
import { globToRegExp, matchesGlob, scopeViolations } from '../src/glob.js';

describe('glob matching', () => {
  it('matches a simple star without crossing directories', () => {
    expect(matchesGlob('apps/api/src/x*.ts', 'apps/api/src/x.ts')).toBe(true);
    expect(matchesGlob('apps/api/src/x*.ts', 'apps/api/src/nested/x.ts')).toBe(false);
  });

  it('matches ** across directories and with an empty prefix', () => {
    expect(matchesGlob('**/migrations/**', 'apps/migrations/001.ts')).toBe(true);
    expect(matchesGlob('**/migrations/**', 'migrations/001.ts')).toBe(true);
    expect(matchesGlob('src/**/*.ts', 'src/a/b/c.ts')).toBe(true);
    expect(matchesGlob('src/**/*.ts', 'src/c.ts')).toBe(true);
  });

  it('treats ? as one non-slash character', () => {
    expect(matchesGlob('a?.ts', 'ab.ts')).toBe(true);
    expect(matchesGlob('a?.ts', 'a/b.ts')).toBe(false);
  });

  it('escapes regex special characters', () => {
    expect(globToRegExp('a+b.ts').test('a+b.ts')).toBe(true);
    expect(globToRegExp('a+b.ts').test('aab.ts')).toBe(false);
  });

  it('deny wins and empty allow means everything is allowed', () => {
    const scope = { allow: [], deny: ['**/migrations/**'] };
    expect(scopeViolations(['src/a.ts'], scope)).toEqual([]);
    expect(scopeViolations(['src/migrations/001.ts'], scope)).toEqual(['src/migrations/001.ts']);
  });

  it('requires an allow match when an allow list exists', () => {
    const scope = { allow: ['src/**'], deny: [] };
    expect(scopeViolations(['src/a.ts', 'README.md'], scope)).toEqual(['README.md']);
  });
});
