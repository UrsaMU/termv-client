import { describe, expect, it } from 'vitest';
import {
  aliasFor,
  channelFromWire,
  channelJoinLine,
  channelKey,
  channelSendLine,
  isDefinedChannel,
  parseChannelHistory,
  parseChannelList,
  parseChannelPost,
  postsForChannel,
} from './channel';
import { speechFromWire } from './feed';

describe('parseChannelList', () => {
  it('reads a bare array or { items } and drops nameless rows', () => {
    const rows = parseChannelList({
      items: [
        { id: 'public', name: 'Public', alias: 'pub', lock: 'connected' },
        { id: 'x', name: '', alias: 'x' },
      ],
    });
    expect(rows).toEqual([
      { id: 'public', name: 'Public', alias: 'pub', lock: 'connected', header: 'PUBLIC' },
    ]);
    expect(parseChannelList([{ name: 'Ops', alias: 'ops' }])[0]?.alias).toBe('ops');
  });
});

describe('channel identity', () => {
  it('requires a defined channel name and never invents Street', () => {
    expect(isDefinedChannel('Public')).toBe(true);
    expect(isDefinedChannel('   ')).toBe(false);
    expect(channelKey('PUBLIC')).toBe('public');
    expect(aliasFor('', 'Public')).toBe('pub');
    expect(parseChannelPost({ text: 'copy', name: 'KESS' })).toBeNull();
    expect(parseChannelPost({ channel: 'Public', text: 'copy', name: 'KESS' })?.channel).toBe(
      'Public',
    );
  });
});

describe('channelFromWire vs street feed', () => {
  it('keeps a named channel post off the street feed', () => {
    const message = {
      text: '',
      data: {
        ui: { type: 'chat', kind: 'channel', channel: 'Public', name: 'KESS', text: 'copy' },
      },
    };
    expect(speechFromWire(message)).toBeNull();
    expect(channelFromWire(message)).toMatchObject({
      channel: 'Public',
      from: 'KESS',
      body: 'copy',
    });
  });

  it('drops a channel frame with no channel name so it cannot land on street', () => {
    const message = {
      text: 'KESS says, copy',
      data: { ui: { type: 'chat', kind: 'channel', name: 'KESS', text: 'copy' } },
    };
    expect(channelFromWire(message)).toBeNull();
    expect(speechFromWire(message)).toBeNull();
  });

  it('does not treat a room say as a channel post', () => {
    const message = {
      text: '',
      data: { ui: { type: 'chat', kind: 'say', name: 'KESS', text: 'on the street' } },
    };
    expect(channelFromWire(message)).toBeNull();
    expect(speechFromWire(message)?.body).toContain('on the street');
  });
});

describe('channel lines', () => {
  it('sends through the channel alias, pose as :action', () => {
    expect(channelSendLine('pub', 'copy')).toBe('pub copy');
    expect(channelSendLine('pub', 'waves', 'pose')).toBe('pub :waves');
    expect(channelSendLine('pub', 'line one\nline two')).toBe('pub line one%rline two');
    expect(channelSendLine('pub', 'line one\nline two', 'pose')).toBe('pub :line one%rline two');
    expect(parseChannelPost({ channel: 'Public', text: 'line one%rline two' })?.body).toBe(
      'line one\nline two',
    );
    expect(channelSendLine('', 'copy')).toBe('');
    expect(channelJoinLine('pub', 'Public')).toBe('addcom pub=Public');
  });
});

describe('postsForChannel', () => {
  it('keeps only posts stamped with that channel', () => {
    const posts = parseChannelHistory(
      [
        { chanName: 'Public', playerName: 'KESS', message: 'copy', timestamp: 1 },
        { chanName: 'Ops', playerName: 'OPS', message: 'staff', timestamp: 2 },
      ],
      '',
    );
    expect(postsForChannel(posts, 'Public').map((row) => row.body)).toEqual(['copy']);
    expect(postsForChannel(posts, '')).toEqual([]);
  });
});
