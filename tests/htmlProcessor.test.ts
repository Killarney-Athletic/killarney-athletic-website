import assert from 'node:assert/strict';
import test from 'node:test';
import { firstWpContentImage, optimizeWpContentHtml } from '../src/lib/html-processor';

test('finds the first safe WordPress upload for use as a legacy cover image', () => {
  const image = firstWpContentImage(`
    <img src="https://example.com/not-club.jpg">
    <img src="http://www.killarneyathletic.com/wp-content/uploads/2026/team.jpg">
  `);

  assert.equal(image, 'https://killarneyathletic.com/wp-content/uploads/2026/team.jpg');
});

test('adds lazy loading and responsive containment to inline WordPress images', () => {
  const html = optimizeWpContentHtml('<p><img src="https://killarneyathletic.com/wp-content/uploads/team.jpg" alt="Team"></p>');

  assert.match(html, /loading="lazy"/);
  assert.match(html, /decoding="async"/);
  assert.match(html, /class="[^"]*wp-content-image[^"]*"/);
});

test('retains dimensions and removes fixed image sizing styles', () => {
  const html = optimizeWpContentHtml('<img src="photo.jpg" width="800" height="450" style="width: 800px; height: 450px; margin: auto;">');

  assert.match(html, /width="800"/);
  assert.match(html, /height="450"/);
  assert.doesNotMatch(html, /width:\s*800px/i);
  assert.doesNotMatch(html, /height:\s*450px/i);
  assert.match(html, /margin:\s*auto/i);
});

test('adds lazy loading to embedded media', () => {
  const html = optimizeWpContentHtml('<iframe src="https://www.youtube.com/embed/example"></iframe>');
  assert.match(html, /loading="lazy"/);
  assert.match(html, /class="wp-content-embed"/);
});
