/** Canonical object guard for this package; import it, never redefine it. */
export function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
