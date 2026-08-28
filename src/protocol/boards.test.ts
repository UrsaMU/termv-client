import { describe, expect, it } from 'vitest';
import { parseBoardList, parseBoardPosts } from './boards';

describe('parseBoardList', () => {
  it('reads board rows with counts', () => {
    const boards = parseBoardList([
      { id: 'board-1', num: 1, title: 'Street Noise', category: 'grid', postCount: 4, unreadCount: 2 },
      { id: 'x', title: 'drop' },
    ]);
    expect(boards).toEqual([
      { id: 'board-1', num: 1, title: 'Street Noise', category: 'GRID', posts: 4, unread: 2 },
    ]);
  });
});

describe('parseBoardPosts', () => {
  it('reads { posts } from /boards/:id/posts', () => {
    const posts = parseBoardPosts({
      total: 1,
      posts: [{ id: 'p1', num: 1, subject: 'Lamp', authorName: 'KESS', body: 'still looping', createdAt: 9 }],
    });
    expect(posts).toEqual([
      {
        id: 'p1',
        num: 1,
        subject: 'Lamp',
        from: 'KESS',
        body: 'still looping',
        date: 9,
        sticky: false,
        replies: [],
      },
    ]);
  });
});
