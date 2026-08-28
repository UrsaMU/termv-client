import { buildSlash, parseSlashLine } from './slash';

export const INPUT_MODES = ['pose', 'say', 'emote', 'raw'] as const;
export type SpeechMode = (typeof INPUT_MODES)[number];
export type InputMode = SpeechMode;

export const INPUT_MODE_META: Record<
  SpeechMode,
  { label: string; syntax: string; placeholder: string }
> = {
  pose: { label: 'POSE', syntax: 'POSE', placeholder: '…' },
  say: { label: 'SAY', syntax: 'SAY "…"', placeholder: '…' },
  emote: { label: 'EMOTE', syntax: 'EMOTE :…', placeholder: '…' },
  raw: { label: 'WIRE', syntax: 'AS TYPED', placeholder: '…' },
};

export function routeInput(raw: string, mode: InputMode): string {
  const line = raw.trim();
  if (line.length === 0) return '';
  const slash = parseSlashLine(line);
  if (slash) return buildSlash(slash.cmd, slash.target);
  if (mode === 'raw') return line;
  if (isCommand(line)) return line;
  if (mode === 'say') return `say ${line}`;
  if (mode === 'emote') {
    const body = line.startsWith(':') ? line.slice(1).trim() : line;
    return `:${body}`;
  }
  return `pose ${line}`;
}

export function isCommand(line: string): boolean {
  if (line.length === 0) return false;
  const lead = line[0];
  return (
    lead === '+' ||
    lead === '@' ||
    lead === '&' ||
    lead === ':' ||
    lead === ';' ||
    lead === '"' ||
    lead === "'" ||
    lead === '?'
  );
}
