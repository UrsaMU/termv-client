import { describe, expect, it } from 'vitest';
import {
  channelFromWire,
  channelJoinLine,
  channelSendLine,
  parseChannelList,
  parseChannelPost,
  postsForChannel,
} from './channel';
import { speechFromWire } from './feed';
import { leftoverLines } from './wire';

const publicChan = { id: 'public', name: 'Public', alias: 'pub', lock: 'connected' };

describe('channels e2e use-cases', () => {
  it('lists defined channels without inventing a Street fallback', () => {
    expect(parseChannelList([publicChan, { name: '' }]).map((row) => row.name)).toEqual(['Public']);
  });

  it('player joins then speaks on that alias only', () => {
    expect(channelJoinLine('pub', 'Public')).toBe('addcom pub=Public');
    expect(channelSendLine('pub', 'copy that')).toBe('pub copy that');
    expect(channelSendLine('pub', 'line one\nline two')).toBe('pub line one%rline two');
  });

  it('decodes multiline channel output onto the named channel only', () => {
    const wire = {
      text: '',
      data: {
        ui: {
          type: 'chat',
          kind: 'channel',
          channel: 'Public',
          name: 'KESS',
          text: 'line one%rline two',
        },
      },
    };
    expect(speechFromWire(wire)).toBeNull();
    expect(channelFromWire(wire)?.body).toBe('line one\nline two');
  });

  it('incoming channel traffic stays on the named channel and off street', () => {
    const wire = {
      text: '<Public> KESS says, copy that',
      data: {
        ui: { type: 'chat', kind: 'channel', channel: 'Public', name: 'KESS', text: 'copy that' },
      },
    };
    expect(speechFromWire(wire)).toBeNull();
    expect(leftoverLines(wire)).toEqual([]);
    const post = channelFromWire(wire);
    expect(post?.channel).toBe('Public');
    expect(postsForChannel([post!], 'Public')).toHaveLength(1);
    expect(postsForChannel([post!], 'Ops')).toHaveLength(0);
  });

  it('refuses a channel post that is not stamped with a channel', () => {
    expect(parseChannelPost({ name: 'KESS', text: 'copy' })).toBeNull();
    expect(
      channelFromWire({
        text: '',
        data: { ui: { type: 'chat', kind: 'channel', name: 'KESS', text: 'copy' } },
      }),
    ).toBeNull();
  });
});
