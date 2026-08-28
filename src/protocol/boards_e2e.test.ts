import { describe, expect, it } from 'vitest';
import {
  boardPostReady,
  boardReplyReady,
  markBoardRead,
  parseBoard,
  parseBoardList,
  parseBoardPost,
  parseBoardPosts,
  sortBoardPosts,
  unreadBoardCount,
} from './boards';

const board = {
  id: 'board-1',
  num: 1,
  title: 'Street Noise',
  category: 'grid',
  postCount: 2,
  unreadCount: 1,
};

const lamp = {
  id: 'p1',
  num: 2,
  subject: 'Lamp',
  authorName: 'KESS',
  body: 'still looping%r after last night',
  createdAt: 9,
  replies: [
    { num: 1, authorName: 'OPS', body: 'check the ballast', createdAt: 10 },
    { num: 2, authorName: 'OPS', body: '   ' },
  ],
};

const pin = {
  id: 'p0',
  num: 9,
  subject: 'Rules',
  authorName: 'OPS',
  body: 'keep it short',
  createdAt: 1,
  sticky: true,
  replies: [],
};

describe('boards e2e use-cases', () => {
  it('lists boards with unread and drops bad rows', () => {
    const listed = parseBoardList({
      items: [board, { id: 'board-2', num: 2, name: 'Ops', unread: 3 }, { title: 'drop' }],
    });
    expect(listed).toEqual([
      { id: 'board-1', num: 1, title: 'Street Noise', category: 'GRID', posts: 2, unread: 1 },
      { id: 'board-2', num: 2, title: 'Ops', category: 'BOARD', posts: 0, unread: 3 },
    ]);
    expect(unreadBoardCount(listed)).toBe(4);
  });

  it('opens a board with sticky first and replies attached', () => {
    const posts = parseBoardPosts({ posts: [lamp, pin] });
    expect(posts.map((row) => `${row.sticky ? '★' : ''}${row.num}`)).toEqual(['★9', '2']);
    expect(posts[0]).toMatchObject({ sticky: true, subject: 'Rules' });
    expect(posts[1]?.replies).toEqual([
      { num: 1, from: 'OPS', body: 'check the ballast', date: 10 },
    ]);
    expect(posts[1]?.body).toBe('still looping\n after last night');
  });

  it('reads a bare post array the same as { posts }', () => {
    expect(parseBoardPosts([lamp]).map((row) => row.num)).toEqual([2]);
    expect(parseBoardPost(lamp)?.from).toBe('KESS');
    expect(parseBoard(board)?.unread).toBe(1);
  });

  it('compose needs subject + body; reply needs text', () => {
    expect(boardPostReady({ subject: 'Lamp', body: 'still looping' })).toBe(true);
    expect(boardPostReady({ subject: 'Lamp', body: '' })).toBe(false);
    expect(boardPostReady({ subject: '', body: 'still looping' })).toBe(false);
    expect(boardReplyReady('check the ballast')).toBe(true);
    expect(boardReplyReady('   ')).toBe(false);
  });

  it('opening a board zeros unread and keeps later local posts after stickies', () => {
    const listed = markBoardRead(parseBoardList([board]), 'board-1');
    expect(listed[0]?.unread).toBe(0);
    expect(unreadBoardCount(listed)).toBe(0);
    const next = sortBoardPosts([
      ...parseBoardPosts([lamp, pin]),
      {
        id: 'p2',
        num: 3,
        subject: 'Ballast',
        from: 'KESS',
        body: 'swapped it',
        date: 11,
        sticky: false,
        replies: [],
      },
    ]);
    expect(next.map((row) => row.subject)).toEqual(['Rules', 'Lamp', 'Ballast']);
  });
});
