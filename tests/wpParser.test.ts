import assert from 'node:assert/strict';
import test from 'node:test';
import { isNoticeActive, parseWPPost, rewriteLegacyWordPressUrl, type WPPostPayload } from '../src/utils/wpParser';

const payload = (overrides: Partial<WPPostPayload> = {}): WPPostPayload => ({
  id: 1,
  slug: 'training-update',
  date: '2026-08-25T10:00:00+01:00',
  title: { rendered: 'Training update' },
  content: { rendered: '<p>Training is now at Woodlawn on Friday.</p>' },
  excerpt: { rendered: '<p>Old training information.</p>' },
  ...overrides,
});

test('uses current content rather than a stale WordPress excerpt', () => {
  assert.equal(parseWPPost(payload()).excerpt, 'Training is now at Woodlawn on Friday.');
});

test('parses active notice metadata and applies an exclusive expiry boundary', () => {
  const post = parseWPPost(payload({
    meta: {
      ka_notice_team: 'Senior A',
      ka_notice_starts_at: '2026-08-25T17:00:00+01:00',
      ka_notice_expires_at: '2026-08-25T21:00:00+01:00',
    },
  }));

  assert.equal(post.notice?.team, 'Senior A');
  assert.equal(isNoticeActive(post, new Date('2026-08-25T18:00:00+01:00')), true);
  assert.equal(isNoticeActive(post, new Date('2026-08-25T21:00:00+01:00')), false);
});

test('ignores incomplete or invalid notice metadata', () => {
  const post = parseWPPost(payload({ meta: { ka_notice_team: 'Senior A' } }));
  assert.equal(post.notice, undefined);
  assert.equal(isNoticeActive(post), false);
});

test('rewrites legacy WordPress URLs to the CMS origin', () => {
  assert.equal(
    rewriteLegacyWordPressUrl('http://www.killarneyathletic.com/wp-content/uploads/photo.jpg'),
    'https://killarneyathletic.com/wp-content/uploads/photo.jpg',
  );

  const post = parseWPPost(payload({
    link: 'https://www.killarneyathletic.com/training-update/',
    content: {
      rendered: '<p><img src="https://www.killarneyathletic.com/wp-content/uploads/photo.jpg"></p>',
    },
    _embedded: {
      'wp:featuredmedia': [{
        source_url: 'http://killarneyathletic.com/wp-content/uploads/featured.jpg',
      }],
    },
  }));

  assert.match(post.content, /https:\/\/killarneyathletic\.com\/wp-content\/uploads\/photo\.jpg/);
  assert.equal(post.featuredImageUrl, 'https://killarneyathletic.com/wp-content/uploads/featured.jpg');
  assert.equal(post.link, 'https://killarneyathletic.com/training-update/');
});

test('uses the first safe inline WordPress upload when featured media is missing', () => {
  const post = parseWPPost(payload({
    content: {
      rendered: '<p><img src="http://www.killarneyathletic.com/wp-content/uploads/2026/academy.jpg"></p>',
    },
  }));

  assert.equal(post.featuredImageUrl, 'https://killarneyathletic.com/wp-content/uploads/2026/academy.jpg');
  assert.equal(post.heroImage.src, 'https://killarneyathletic.com/wp-content/uploads/2026/academy.jpg');
});
