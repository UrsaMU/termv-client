export type WikiStub = {
  path: string;
  title: string;
  tags: string[];
};

export type WikiPage = {
  path: string;
  title: string;
  body: string;
};

function rec(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function parseWikiList(raw: unknown): WikiStub[] {
  const rows = Array.isArray(raw)
    ? raw
    : rec(raw)?.pages;
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((item) => {
    const row = rec(item);
    if (!row) return [];
    const path = String(row.path ?? '').trim();
    if (!path) return [];
    const tags = Array.isArray(row.tags) ? row.tags.map(String) : [];
    return [{ path, title: String(row.title ?? path), tags }];
  });
}

export function parseWikiPage(raw: unknown, fallback = ''): WikiPage | null {
  const row = rec(raw);
  if (!row) return null;
  const path = String(row.path ?? fallback).trim();
  const body = String(row.body ?? '');
  if (!path && !body) return null;
  return {
    path: path || fallback,
    title: String(row.title ?? path ?? fallback),
    body,
  };
}

/** Enough markdown for wiki cards: strip fences, keep text. */
export function wikiBodyText(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_~`]/g, '')
    .trim();
}
