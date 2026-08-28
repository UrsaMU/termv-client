/** UrsaMU REST auth — packages/mush/src/routes/auth.ts */
export const AUTH_LOGIN = '/api/v1/login';
export const AUTH_REGISTER = '/api/v1/register';

export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 512;
export const MAX_USERNAME = 64;
export const MAX_EMAIL = 254;

export type AuthMode = 'login' | 'register';

export function authReady(
  mode: AuthMode,
  fields: { handle: string; password: string; email?: string },
): boolean {
  const handle = fields.handle.trim();
  if (!handle || handle.length > MAX_USERNAME) return false;
  if (fields.password.length < MIN_PASSWORD || fields.password.length > MAX_PASSWORD) {
    return false;
  }
  if (mode === 'register') {
    const email = (fields.email ?? '').trim();
    if (!email || email.length > MAX_EMAIL || !email.includes('@')) return false;
  }
  return true;
}
