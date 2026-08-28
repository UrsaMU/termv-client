import { describe, expect, it } from 'vitest';
import { DEFAULT_SPLASH, gameMediaSrc, parseSplash, splashSrc, splashUrl } from './splash';

describe('splash', () => {
  it('reads the plugin JSON and resolves host-relative art', () => {
    expect(parseSplash({ image: DEFAULT_SPLASH })).toBe(DEFAULT_SPLASH);
    expect(parseSplash({})).toBe('');
    expect(splashUrl('http://127.0.0.1:4303')).toBe(
      'http://127.0.0.1:4303/api/v1/sprawl/splash',
    );
    expect(splashSrc('http://127.0.0.1:4303', DEFAULT_SPLASH)).toBe(
      'http://127.0.0.1:4303/api/v1/sprawl/splash.jpg',
    );
    expect(splashSrc('http://127.0.0.1:4303', 'https://cdn.example/n.jpg')).toBe(
      'https://cdn.example/n.jpg',
    );
    expect(gameMediaSrc('http://127.0.0.1:4303', '/images/12.jpg')).toBe(
      'http://127.0.0.1:4303/images/12.jpg',
    );
    expect(gameMediaSrc('http://127.0.0.1:4303', '/splash.jpg')).toBe('/splash.jpg');
    expect(gameMediaSrc('http://127.0.0.1:4303', 'https://cdn.example/n.jpg')).toBe(
      'https://cdn.example/n.jpg',
    );
  });
});
