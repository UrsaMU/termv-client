export type ConsoleLine = {
  id: string;
  body: string;
};

export type ConsoleTone = 'echo' | 'err' | 'plain';

/** Plugin ERR lead-in is `%cr!!%cn ` — leftover TTY keeps the `!!`. */
export function isConsoleError(body: string): boolean {
  return /^!!(?:\s|$)/.test(body.trim());
}

export function bangError(message: string): string {
  const text = message.trim().replace(/^!!\s*/, '');
  return text ? `!! ${text}` : '!!';
}

export function consoleTone(body: string): ConsoleTone {
  const text = body.trim();
  if (text.startsWith('> ')) return 'echo';
  if (isConsoleError(text)) return 'err';
  return 'plain';
}

export const CONSOLE_CAP = 200;

let consoleSeq = 0;

export function resetConsoleIds(): void {
  consoleSeq = 0;
}

export function appendConsole(prev: ConsoleLine[], bodies: string[]): ConsoleLine[] {
  const next = [...prev];
  for (const raw of bodies) {
    const body = raw.trim();
    if (!body) continue;
    consoleSeq += 1;
    next.push({ id: `c${consoleSeq}`, body });
  }
  return next.length > CONSOLE_CAP ? next.slice(-CONSOLE_CAP) : next;
}

export function consoleEcho(line: string): string {
  return `> ${line.trim()}`;
}

export function lookToConsole(view: {
  name: string;
  description?: string;
  lists?: Array<{ label: string; items: Array<{ label: string }> }>;
}): string[] {
  const lines = [view.name.trim()].filter(Boolean);
  const desc = view.description?.trim();
  if (desc) lines.push(desc);
  for (const list of view.lists ?? []) {
    const names = list.items.map((item) => item.label.trim()).filter(Boolean);
    if (names.length) lines.push(`${list.label}: ${names.join(', ')}`);
  }
  return lines;
}

export function speechToConsole(entry: { speaker?: string; body: string }): string {
  const body = entry.body.trim();
  const who = entry.speaker?.trim() ?? '';
  if (!who) return body;
  if (!body || body.startsWith(who)) return body || who;
  return `${who} ${body}`;
}
