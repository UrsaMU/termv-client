export type ChargenGate = 'unknown' | 'needed' | 'submitted' | 'ready';

export function gateFromSheet(sheet: { status: string } | null): ChargenGate {
  if (!sheet) return 'unknown';
  const status = sheet.status.trim().toUpperCase();
  if (status === 'LIVE' || status === 'APPROVED') return 'ready';
  if (status === 'SUBMITTED') return 'submitted';
  return 'needed';
}

/** Sheet payload wins — leftover +chargen chrome must not trap an approved goon. */
export function playableGate(
  gate: ChargenGate,
  sheet: { status: string } | null,
): ChargenGate {
  const fromSheet = gateFromSheet(sheet);
  if (fromSheet === 'ready' || fromSheet === 'submitted') return fromSheet;
  if (gate === 'ready' || gate === 'submitted') return gate;
  return fromSheet === 'unknown' ? gate : fromSheet;
}

export function inChargen(gate: ChargenGate): boolean {
  return gate === 'needed';
}

export function afterLinkPath(gate: ChargenGate): '/chargen' | '/sheet' | '/play' {
  if (gate === 'needed') return '/chargen';
  return '/play';
}

export function isChargenPrompt(line: string): boolean {
  const text = line.trim();
  if (!text) return false;
  if (/^no sheet\.\s*type \+chargen/i.test(text)) return true;
  if (/type \+chargen\/start first/i.test(text)) return true;
  return false;
}

export function isSheetApprovedNotice(line: string): boolean {
  const text = line.trim();
  if (!text) return false;
  return /sheet approved/i.test(text) || /already approved/i.test(text);
}
