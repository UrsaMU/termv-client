import { describe, expect, it } from 'vitest';
import { AUTH_LOGIN, AUTH_REGISTER, authReady } from './auth';

describe('UrsaMU auth contract', () => {
  it('uses the live mush login/register paths', () => {
    expect(AUTH_LOGIN).toBe('/api/v1/login');
    expect(AUTH_REGISTER).toBe('/api/v1/register');
  });

  it('login needs handle + 8-char password', () => {
    expect(authReady('login', { handle: 'Kess', password: 'secret12' })).toBe(true);
    expect(authReady('login', { handle: '', password: 'secret12' })).toBe(false);
    expect(authReady('login', { handle: 'Kess', password: 'short' })).toBe(false);
  });

  it('register also needs an email', () => {
    expect(
      authReady('register', { handle: 'Kess', password: 'secret12', email: 'kess@grid.local' }),
    ).toBe(true);
    expect(authReady('register', { handle: 'Kess', password: 'secret12', email: '' })).toBe(false);
    expect(authReady('register', { handle: 'Kess', password: 'secret12', email: 'nope' })).toBe(
      false,
    );
  });
});
