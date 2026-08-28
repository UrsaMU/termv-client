import { describe, expect, it } from 'vitest';
import { parseWire, wsUri } from './transport';
import { mailStateOf } from '../protocol/mail';

describe('parseWire', () => {
  it('keeps structured ui data', () => {
    const msg = parseWire(
      JSON.stringify({
        msg: '%chhello%cn',
        data: { ui: { type: 'chat', kind: 'pose', name: 'KESS', text: 'waves' } },
      }),
    );
    expect(msg.text).toBe('hello');
    expect((msg.data.ui as { kind: string }).kind).toBe('pose');
  });

  it('falls back to plain text on bad json', () => {
    expect(parseWire('not-json').text).toBe('not-json');
  });
});

describe('mailStateOf', () => {
  it('reads the boolean read flag from /api/v1/mail', () => {
    expect(mailStateOf({ read: true, subject: 'hi' })).toBe('read');
    expect(mailStateOf({ read: false, subject: 'hi' })).toBe('unread');
    expect(mailStateOf({ state: 'read' })).toBe('read');
  });
});

describe('wsUri', () => {
  it('forces clientType=web so the plugin emits JSON frames', () => {
    expect(wsUri('ws://127.0.0.1:4302')).toBe('ws://127.0.0.1:4302/?clientType=web');
    expect(wsUri('ws://127.0.0.1:4302?clientType=web')).toContain('clientType=web');
  });
});
