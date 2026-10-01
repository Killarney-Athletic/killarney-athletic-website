import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePostsPayload, WordPressError } from '../src/lib/wordpress';
import { WPRawPostSchema } from '../src/lib/schema/post';

const validPost = {
  id: 42,
  slug: 'club-update',
  date: '2026-09-30T12:00:00+01:00',
  title: { rendered: 'Club &amp; academy update' },
  content: { rendered: '<p>Training is on Friday.</p>' },
};

test('applies safe defaults to optional WordPress post fields', () => {
  const result = WPRawPostSchema.parse({
    id: 1,
    slug: 'minimal-update',
    date: '2026-09-30T12:00:00+01:00',
  });

  assert.equal(result.title.rendered, 'Untitled Update');
  assert.equal(result.content.rendered, '');
  assert.equal(result.excerpt.rendered, '');
  assert.equal(result.featured_media, 0);
  assert.deepEqual(result.categories, []);
});

test('skips malformed posts while retaining valid posts', () => {
  const posts = parsePostsPayload([
    validPost,
    { id: 99, slug: '', date: 'not-a-date' },
  ]);

  assert.equal(posts.length, 1);
  assert.equal(posts[0].id, 42);
  assert.equal(posts[0].title, 'Club & academy update');
  assert.equal(posts[0].publishedAt.toISOString(), '2026-09-30T11:00:00.000Z');
});

test('uses the club crest when featured media is absent or malformed', () => {
  const posts = parsePostsPayload([{
    ...validPost,
    _embedded: {
      'wp:featuredmedia': [{ source_url: 'not a valid URL', alt_text: '' }],
    },
  }]);

  assert.equal(posts[0].heroImage.src, '/android-chrome-512x512.png');
  assert.equal(posts[0].heroImage.alt, 'Club & academy update');
});

test('rejects a non-array API payload', () => {
  assert.throws(() => parsePostsPayload({ posts: [] }), WordPressError);
});
