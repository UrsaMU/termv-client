import type { PingPayload } from './frames';

export type PingSet = { field: string; value: string | null };

export function parsePingSet(raw: string): PingSet | null {
  const s = raw.trim();
  if (!s) return null;
  const eq = s.indexOf('=');
  if (eq < 0) {
    const field = s.toLowerCase().replace(/\s+/g, '-');
    return field ? { field, value: null } : null;
  }
  const field = s.slice(0, eq).trim().toLowerCase().replace(/\s+/g, '-');
  if (!field) return null;
  return { field, value: s.slice(eq + 1).trim() };
}

export function pingSetLine(field: string, value: string): string {
  const key = field.trim().toLowerCase().replace(/\s+/g, '-');
  if (!key) return '';
  return value ? `+ping/set ${key}=${value}` : `+ping/set ${key}=`;
}

export function pingLookLine(who = ''): string {
  const name = who.trim();
  return name ? `+ping ${name}` : '+ping';
}

export function pingAttrLine(field: string, value: string, who = 'me'): string {
  const key = field.trim().toLowerCase().replace(/\s+/g, '-');
  if (!key) return '';
  const target = who.trim() || 'me';
  return `&ping-${key} ${target}=${value}`;
}

export function pingCardTitle(card: PingPayload | null | undefined): string {
  if (!card?.name) return 'PING';
  return card.name.toUpperCase();
}
