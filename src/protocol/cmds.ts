import { SLASH_COMMANDS } from './slash';

export type WiredCmd = {
  id: string;
  label: string;
  hint: string;
  send?: string;
  to?: string;
  wantsTarget?: boolean;
  action?: 'quit';
};

export function runWiredCmd(
  cmd: WiredCmd,
  act: { send: (line: string) => void; go: (to: string) => void },
): void {
  if (cmd.send) {
    act.send(cmd.send);
    if (cmd.send.startsWith('+gig')) act.send('look');
  }
  if (cmd.to) act.go(cmd.to);
}

export function wiredCommands(): WiredCmd[] {
  return SLASH_COMMANDS.filter((cmd) => cmd.listed).map((cmd) => ({
    id: cmd.id,
    label: cmd.label,
    hint: cmd.hint,
    send: cmd.wantsTarget || !cmd.verb ? undefined : cmd.verb,
    to: cmd.id === 'quit' ? '/' : cmd.id === 'console' ? '/console' : undefined,
    wantsTarget: cmd.wantsTarget,
    action: cmd.id === 'quit' ? 'quit' : undefined,
  }));
}

import { attackCmd, fireModeCmd, rangeCmd } from './combat';

export { attackCmd, fireModeCmd, rangeCmd };

export function coverCmd(): string {
  return rangeCmd('street');
}

export function marketBuyCmd(slug: string, qty = 1): string {
  if (!slug) return '';
  return qty > 1 ? `+market/buy ${slug}=${qty}` : `+market/buy ${slug}`;
}

export function wearCmd(name: string, slot: 'wear' | 'wield' | 'stow'): string {
  if (!name) return '';
  if (slot === 'stow') return `+gear/stow ${name}`;
  if (slot === 'wield') return `+gear/wield ${name}`;
  return `+gear/wear ${name}`;
}

export function hackCmd(target: string): string {
  return target.trim() ? `+hack ${target.trim()}` : '';
}

export function advanceGigCmd(): string {
  return '+gig/push';
}

export function jackOutCmd(): string {
  return '+hack/jackout';
}
