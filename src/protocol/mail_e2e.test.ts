import { describe, expect, it } from 'vitest';
import { mailNotice, unreadMailCount } from './bulletin';
import {
  composeReady,
  parseMail,
  parseMailList,
  replyDraft,
  replySubject,
  splitRecipients,
} from './mail';

const inbox = {
  id: 'm-in',
  from: '#68',
  fromName: 'KESS',
  to: ['#2'],
  toNames: ['OPS'],
  subject: 'Harbor lamp',
  message: 'still looping\nafter last night',
  date: 1700000000000,
  read: false,
  starred: false,
  folder: 'inbox',
};

const sent = {
  id: 'm-out',
  from: '#2',
  fromName: 'OPS',
  to: ['#68'],
  toNames: ['KESS'],
  subject: 'Re: Harbor lamp',
  message: 'check the ballast',
  date: 1700000001000,
  read: true,
  folder: 'inbox',
};

const trash = {
  ...inbox,
  id: 'm-tr',
  folder: 'trash',
  read: true,
};

describe('mail e2e use-cases', () => {
  it('lists inbox, sent, and trash without mixing folders', () => {
    const inBox = parseMailList([inbox, { subject: 'drop' }], 'inbox');
    const outBox = parseMailList([sent], 'sent');
    const bin = parseMailList([trash], 'trash');
    expect(inBox.map((row) => `${row.folder}:${row.state}`)).toEqual(['inbox:unread']);
    expect(outBox[0]).toMatchObject({ folder: 'sent', from: 'OPS', to: ['KESS'] });
    expect(bin[0]?.folder).toBe('trash');
  });

  it('compose needs to + subject + body and splits handles', () => {
    expect(composeReady({ to: 'KESS', subject: 'hi', body: 'go' })).toBe(true);
    expect(composeReady({ to: 'KESS', subject: 'hi', body: '' })).toBe(false);
    expect(splitRecipients('KESS, #12 ; ops')).toEqual(['KESS', '#12', 'ops']);
  });

  it('reply prefixes Re: once and keeps a resolvable to', () => {
    const item = parseMail(inbox)!;
    expect(replySubject(item.subject)).toBe('Re: Harbor lamp');
    expect(replyDraft(item)).toEqual({
      to: 'KESS',
      subject: 'Re: Harbor lamp',
      body: '',
    });
    expect(replyDraft({ ...item, from: 'OPS', fromRef: '#0', subject: 'Re: Harbor lamp' }).to).toBe(
      '#0',
    );
  });

  it('keeps multiline bodies and unread counts for the ribbon', () => {
    const item = parseMail(inbox)!;
    expect(item.body).toBe('still looping\nafter last night');
    const listed = parseMailList([inbox, { ...inbox, id: 'm2', read: true }], 'inbox');
    expect(unreadMailCount(listed)).toBe(1);
    expect(mailNotice(1)).toMatchObject({ kind: 'mail', body: '01 UNREAD', to: '/comms' });
    expect(mailNotice(0)).toBeNull();
  });

  it('stars and trash stay on the record the desk already parsed', () => {
    const item = parseMail({ ...inbox, starred: true })!;
    expect(item.starred).toBe(true);
    expect(parseMail({ ...inbox, folder: 'trash' }, 'inbox')?.folder).toBe('trash');
  });
});
