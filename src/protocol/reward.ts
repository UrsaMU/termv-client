export type PayoutKind = 'kill' | 'gig' | 'hack';

export type Payout = {
  kind: PayoutKind;
  label: string;
  bityuan: number;
  ap: number;
};

const LOOT_LINE =
  /LOOT\s+\+(\d+)\s*b¥(?:\s*[·.]\s*\+(\d+)\s*AP)?(?:\s*\(([^)]+)\))?/i;
const GIG_PAY = /\+(\d+)\s*b¥\s*[·.]\s*\+(\d+)\s*AP/i;

export function parseLootLine(raw: string): Payout | null {
  const line = raw.trim();
  const loot = LOOT_LINE.exec(line);
  if (loot) {
    return {
      kind: 'kill',
      label: (loot[3] ?? 'DOWN').trim(),
      bityuan: Number(loot[1]) || 0,
      ap: Number(loot[2]) || 0,
    };
  }
  return null;
}

export function parsePayoutText(raw: string, kind: PayoutKind = 'gig'): Payout | null {
  const hit = GIG_PAY.exec(raw);
  if (!hit) return parseLootLine(raw);
  return {
    kind,
    label: kind === 'gig' ? 'GIG' : kind.toUpperCase(),
    bityuan: Number(hit[1]) || 0,
    ap: Number(hit[2]) || 0,
  };
}

export function payoutNotice(p: Payout): { kind: 'payout'; title: string; body: string; to?: string } {
  const bits: string[] = [];
  if (p.bityuan > 0) bits.push(`+${p.bityuan} b¥`);
  if (p.ap > 0) bits.push(`+${p.ap} AP`);
  const body = bits.join(' · ') || 'PAID';
  if (p.kind === 'gig') {
    return { kind: 'payout', title: 'GIG PAID', body, to: '/gig/done' };
  }
  return { kind: 'payout', title: p.label.toUpperCase() || 'LOOT', body };
}

export function payoutFromData(data: Record<string, unknown>): Payout | null {
  const kind = String(data.kind ?? 'kill');
  const bityuan = Number(data.bityuan ?? 0);
  const ap = Number(data.ap ?? 0);
  if (!Number.isFinite(bityuan) && !Number.isFinite(ap)) return null;
  if (bityuan <= 0 && ap <= 0) return null;
  const k: PayoutKind = kind === 'gig' || kind === 'hack' ? kind : 'kill';
  return {
    kind: k,
    label: String(data.label ?? k),
    bityuan: Math.max(0, Math.floor(bityuan)),
    ap: Math.max(0, Math.floor(ap)),
  };
}
