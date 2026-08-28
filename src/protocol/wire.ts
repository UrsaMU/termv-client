import { splitLines } from './ansi';
import { sprawlFromWire, type WireMessage } from './frames';
import { isCmdEcho, isLoginUi, isLookUi } from './look';

function loginNoise(line: string): boolean {
  const text = line.trim();
  if (/has connected\.?$/i.test(text)) return true;
  if (/^you have joined channel\b/i.test(text)) return true;
  if (/^added alias\b/i.test(text)) return true;
  return false;
}

function metaTypeOf(message: WireMessage): string {
  const ui = message.data.ui;
  if (!ui || typeof ui !== 'object') return '';
  const rec = ui as Record<string, unknown>;
  const meta = rec.meta;
  if (meta && typeof meta === 'object') {
    return String((meta as { type?: unknown }).type ?? '');
  }
  return String(rec.type ?? '');
}

const SKIP_LAYOUT = /^(look|login|sprawl|channels|channel|chan|cmd-echo)/i;

/** Leftover command output that no designed view claimed. */
export function leftoverLines(message: WireMessage): string[] {
  if (sprawlFromWire(message)) return [];
  if (isLookUi(message) || isLoginUi(message) || isCmdEcho(message)) return [];
  const kind = metaTypeOf(message);
  if (kind && SKIP_LAYOUT.test(kind)) return [];
  const ui = message.data.ui;
  if (ui && typeof ui === 'object' && (ui as { type?: string }).type === 'chat') {
    return [];
  }
  const seen = new Set<string>();
  const lines: string[] = [];
  const add = (raw: string) => {
    for (const piece of splitLines(raw)) {
      if (!piece || seen.has(piece) || loginNoise(piece)) continue;
      seen.add(piece);
      lines.push(piece);
    }
  };
  if (message.text.trim()) add(message.text);
  if (kind === 'help' && ui && typeof ui === 'object') {
    const rec = ui as Record<string, unknown>;
    const bits: string[] = [];
    const walk = (node: Record<string, unknown>) => {
      if (typeof node.title === 'string') bits.push(node.title);
      if (typeof node.content === 'string') bits.push(node.content);
      if (typeof node.text === 'string') bits.push(node.text);
      if (Array.isArray(node.components)) {
        for (const child of node.components) {
          if (child && typeof child === 'object') walk(child as Record<string, unknown>);
        }
      }
    };
    walk(rec);
    add(bits.join('\n'));
    return lines;
  }
  return lines;
}
