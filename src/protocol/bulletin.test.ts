import { describe, expect, it } from 'vitest';
import {
  NOTICE_TTL_MS,
  buildMotd,
  emptyFold,
  foldBulletin,
  jobNotice,
  mailNotice,
  unreadMailCount,
} from './bulletin';

describe('NOTICE_TTL_MS', () => {
  it('is one minute so stacked notices have time to be read', () => {
    expect(NOTICE_TTL_MS).toBe(60_000);
  });
});

describe('foldBulletin', () => {
  it('captures @motd between the engine banners', () => {
    const next = foldBulletin(emptyFold(), [
      '--- Message of the Day ---',
      'Reboot Sunday 02:00 UTC',
      'Stay frosty.',
      '--------------------------',
      'Welcome back, Kess.',
      'Last login: 8/24/2026, 9:00:00 PM',
      'You have 3 unread mail messages.',
      '[Sprawl] Chargen in progress. Use +chargen.',
      'Someone posed in the room.',
    ]);
    expect(next.motdLines).toEqual(['Reboot Sunday 02:00 UTC', 'Stay frosty.']);
    expect(next.lastLogin).toBe('8/24/2026, 9:00:00 PM');
    expect(next.notices.map((n) => n.kind)).toEqual(['mail', 'system']);
    expect(next.feed).toEqual(['Someone posed in the room.']);
    expect(next.capturing).toBe(false);
  });

  it('holds motd capture across leftover frames', () => {
    const mid = foldBulletin(emptyFold(), ['--- Message of the Day ---', 'Line one']);
    const done = foldBulletin(mid, ['Line two', '--------------------------']);
    expect(done.motdLines).toEqual(['Line one', 'Line two']);
    expect(done.capturing).toBe(false);
  });

  it('does not duplicate a mail notice', () => {
    const once = foldBulletin(emptyFold(), ['You have 1 unread mail message.']);
    const twice = foldBulletin(once, ['You have 1 unread mail message.']);
    expect(twice.notices).toHaveLength(1);
  });

  it('treats a MAIL: delivery line as a new-mail notice', () => {
    const next = foldBulletin(emptyFold(), [
      'MAIL: You have a new message from OPS.',
    ]);
    expect(next.notices).toEqual([
      { kind: 'mail', title: 'MAIL', body: 'NEW MESSAGE', to: '/comms' },
    ]);
  });

  it('keeps a job reply ping in the feed and raises a JOBS notice', () => {
    const next = foldBulletin(emptyFold(), [
      '>JOBS: Ada replied on #5 "Lamp".',
    ]);
    expect(next.notices).toEqual([
      { kind: 'jobs', title: 'JOBS', body: 'REPLY', to: '/comms' },
    ]);
    expect(next.feed).toEqual(['>JOBS: Ada replied on #5 "Lamp".']);
  });

  it('does not treat a local comment-added ack as a reply ping', () => {
    const next = foldBulletin(emptyFold(), ['>JOBS: Comment added to job #5.']);
    expect(next.notices).toEqual([]);
    expect(next.feed).toEqual(['>JOBS: Comment added to job #5.']);
  });
});

describe('buildMotd', () => {
  it('only builds when the engine sent a real @motd', () => {
    expect(buildMotd(emptyFold())).toBeNull();
    const fold = foldBulletin(emptyFold(), [
      '--- Message of the Day ---',
      'Staff note.',
      '--------------------------',
    ]);
    expect(buildMotd(fold)).toEqual({ title: 'MOTD', body: 'Staff note.' });
  });
});

describe('mailNotice', () => {
  it('counts unread only', () => {
    expect(unreadMailCount([{ state: 'unread' }, { state: 'read' }])).toBe(1);
    expect(mailNotice(0)).toBeNull();
    expect(mailNotice(2)?.body).toBe('02 UNREAD');
  });
});

describe('jobNotice', () => {
  it('counts new jobs and routes staff to the desk', () => {
    expect(jobNotice(0)).toBeNull();
    expect(jobNotice(2)).toEqual({
      kind: 'jobs',
      title: 'JOBS',
      body: '02 NEW',
      to: '/comms',
    });
    expect(jobNotice(1, '/staff')?.to).toBe('/staff');
  });
});
