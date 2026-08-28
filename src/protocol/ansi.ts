const ANSI = /\u001b\[[0-9;]*[A-Za-z]|\x1b\[[0-9;]*m/g;
const MUSH_PERCENT = /%[cCxX](?:<#[0-9A-Fa-f]{3,6}>|[hnrgbybmcwxHNRGBYBMCWXIiuU])?|%[nrtbNRTB]/g;
const HEX_TAG = /<#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})>/g;
const HEX_TAIL = /<#[0-9A-Fa-f]{0,6}$/g;
const OTHER_TAG = /<[^>]+>/g;

export function stripTerminal(raw: string): string {
  return raw
    .replace(ANSI, '')
    .replace(/%r/gi, '\n')
    .replace(/%t/gi, '\t')
    .replace(/%b/gi, ' ')
    .replace(MUSH_PERCENT, '')
    .replace(HEX_TAG, '')
    .replace(HEX_TAIL, '')
    .replace(OTHER_TAG, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

export function splitLines(raw: string): string[] {
  return stripTerminal(raw)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
