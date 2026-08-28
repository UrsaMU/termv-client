export const DEFAULT_SPLASH = '/api/v1/sprawl/splash.jpg';

export function parseSplash(raw: unknown): string {
  if (!raw || typeof raw !== 'object') return '';
  const image = (raw as { image?: unknown }).image;
  return typeof image === 'string' ? image.trim() : '';
}

export function splashSrc(host: string, image: string): string {
  const img = image.trim();
  if (!img) return '';
  if (/^https?:\/\//i.test(img) || img.startsWith('data:')) return img;
  const base = host.replace(/\/$/, '');
  if (!base) return img.startsWith('/') ? img : `/${img}`;
  return img.startsWith('/') ? `${base}${img}` : `${base}/${img}`;
}

export function splashUrl(host: string): string {
  return `${host.replace(/\/$/, '')}/api/v1/sprawl/splash`;
}

const GAME_MEDIA = /^\/(images|avatars|site|api)\b/;

export function gameMediaSrc(host: string, image: string): string {
  const img = image.trim();
  if (!img) return '';
  if (/^https?:\/\//i.test(img) || img.startsWith('data:')) return img;
  if (GAME_MEDIA.test(img)) return splashSrc(host, img);
  return img;
}
