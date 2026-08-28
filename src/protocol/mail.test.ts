import { describe, expect, it } from 'vitest';
import {
  composeReady,
  fromLabel,
  parseMail,
  parseMailList,
  replyAddress,
  replyDraft,
  replySubject,
  splitRecipients,
} from './mail';

describe('parseMail', () => {
  it('reads a /api/v1/mail record', () => {
    const mail = parseMail({
      id: 'abc',
      from: '#0',
      to: ['#2'],
      subject: 'Wire check',
      message: 'You are on the list.',
      date: 1700000000000,
      read: false,
      starred: true,
      folder: 'trash',
    });
    expect(mail).toEqual({
      id: 'abc',
      subject: 'Wire check',
      from: 'OPS',
      fromRef: '#0',
      to: ['2'],
      body: 'You are on the list.',
      date: 1700000000000,
      state: 'unread',
      folder: 'trash',
      starred: true,
    });
  });

  it('prefers fromName / toNames over dbrefs', () => {
    const mail = parseMail({
      id: 'n',
      from: '#68',
      fromName: 'gLitch.exe',
      to: ['#2'],
      toNames: ['ops-desk'],
      subject: 'hi',
      message: 'x',
    });
    expect(mail?.from).toBe('gLitch.exe');
    expect(mail?.to).toEqual(['ops-desk']);
  });

  it('drops records with no id or subject', () => {
    expect(parseMail({ subject: 'no id' })).toBeNull();
    expect(parseMail({ id: 'x' })).toBeNull();
  });
});

describe('fromLabel', () => {
  it('maps system #0 to OPS', () => {
    expect(fromLabel('#0')).toBe('OPS');
    expect(fromLabel('#12')).toBe('12');
  });
});

describe('parseMailList', () => {
  it('keeps valid rows only', () => {
    expect(
      parseMailList([{ id: '1', subject: 'A', read: true }, { subject: 'drop' }]).map((m) => m.id),
    ).toEqual(['1']);
  });
});

describe('replySubject', () => {
  it('prefixes Re: once', () => {
    expect(replySubject('WIRE CHECK')).toBe('Re: WIRE CHECK');
    expect(replySubject('Re: WIRE CHECK')).toBe('Re: WIRE CHECK');
  });
});

describe('replyDraft', () => {
  it('addresses the display name and does not paste the original body', () => {
    expect(replyDraft({ from: 'gLitch.exe', fromRef: '#68', subject: 'WIRE CHECK' })).toEqual({
      to: 'gLitch.exe',
      subject: 'Re: WIRE CHECK',
      body: '',
    });
  });

  it('replies to OPS on #0 so send can resolve the system desk', () => {
    expect(replyAddress({ from: 'OPS', fromRef: '#0' })).toBe('#0');
    expect(replyAddress({ from: '12', fromRef: '#12' })).toBe('#12');
  });
});

describe('composeReady', () => {
  it('needs to, subject, and body', () => {
    expect(composeReady({ to: 'ops', subject: 'hi', body: 'go' })).toBe(true);
    expect(composeReady({ to: '', subject: 'hi', body: 'go' })).toBe(false);
    expect(splitRecipients('ops, #2 ; glitch.exe')).toEqual(['ops', '#2', 'glitch.exe']);
  });
});
