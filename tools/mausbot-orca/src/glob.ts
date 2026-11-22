/** Git-relative glob matching: `*`, `**` and `?`. Deny wins over allow. */
export function globToRegExp(pattern: string): RegExp {
  const normalized = pattern.replace(/\\/g, '/').replace(/^\.\//, '');
  let out = '^';
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    if (char === '*') {
      if (normalized[index + 1] === '*') {
        index += 1;
        if (normalized[index + 1] === '/') {
          index += 1;
          out += '(?:.*/)?';
        } else {
          out += '.*';
        }
      } else {
        out += '[^/]*';
      }
    } else if (char === '?') {
      out += '[^/]';
    } else {
      out += char.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`${out}$`);
}

export function matchesGlob(pattern: string, file: string): boolean {
  return globToRegExp(pattern).test(file.replace(/\\/g, '/').replace(/^\.\//, ''));
}

export interface Scope {
  allow: string[];
  deny: string[];
}

export function scopeViolations(files: string[], scope: Scope): string[] {
  const denied = scope.deny.length > 0;
  const allowed = scope.allow.length > 0;
  return files.filter((file) => {
    if (denied && scope.deny.some((pattern) => matchesGlob(pattern, file))) return true;
    if (allowed && !scope.allow.some((pattern) => matchesGlob(pattern, file))) return true;
    return false;
  });
}
