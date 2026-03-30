const MAX_NAME_LENGTH = 40;
const MAX_CONTEXT_LENGTH = 500;

export function sanitizeName(raw: string): string {
  return raw
    .replace(/[<>'";&\\/\x00-\x1F\x7F]/g, '')
    .trim()
    .slice(0, MAX_NAME_LENGTH);
}

export function sanitizeContext(raw: string): string {
  return raw
    .replace(/[<>'";&\\/\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
    .slice(0, MAX_CONTEXT_LENGTH);
}

export function sanitizeSubstance(raw: string, allowed: string[]): string {
  const trimmed = raw.trim();
  return allowed.includes(trimmed) ? trimmed : '';
}

export function sanitizeIsoDate(raw: string): string | null {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  if (d.getTime() > Date.now()) return null;
  if (d.getFullYear() < 1900) return null;
  return d.toISOString();
}

export function sanitizeMoodScore(score: number): number {
  const n = Math.round(score);
  return Math.max(1, Math.min(10, n));
}
