import { describe, expect, it } from 'vitest';
import { leftoverLines } from './wire';

describe('leftoverLines', () => {
  it('keeps +gig / +help chrome that has no designed view', () => {
    expect(
      leftoverLines({
        text: 'Left the site. +gig/enter to return.',
        data: {},
      }),
    ).toEqual(['Left the site. +gig/enter to return.']);
    expect(
      leftoverLines({
        text: '',
        data: {
          ui: {
            type: 'layout',
            meta: { type: 'help' },
            components: [
              { type: 'header', title: 'HELP' },
              { type: 'text', content: 'Type +help <topic>.' },
            ],
          },
        },
      }),
    ).toContain('HELP');
  });

  it('does not dump the channel manager into the feed', () => {
    expect(
      leftoverLines({
        text: 'Added alias pub for channel Public.',
        data: {
          ui: {
            type: 'layout',
            meta: { type: 'channels-hub' },
            components: [
              { type: 'header', title: 'Channels' },
              { type: 'actions', items: [{ label: 'Refresh' }, { label: 'Join…' }] },
            ],
          },
        },
      }),
    ).toEqual([]);
  });

  it('keeps command leftovers that mention +chargen or usage', () => {
    expect(
      leftoverLines({
        text: 'Draft online. Place 4 points with +chargen/stat.',
        data: {},
      }),
    ).toEqual(['Draft online. Place 4 points with +chargen/stat.']);
    expect(
      leftoverLines({
        text: 'Usage: +chargen/stat STAT=0-4',
        data: {},
      }),
    ).toEqual(['Usage: +chargen/stat STAT=0-4']);
  });

  it('skips look and chat', () => {
    expect(
      leftoverLines({
        text: '',
        data: { ui: { type: 'layout', meta: { type: 'look', isRoom: true } } },
      }),
    ).toEqual([]);
  });
});
