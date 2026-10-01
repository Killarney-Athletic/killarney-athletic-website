import sanitizeHtml from 'sanitize-html';
import type { ClubPost, WPRawPostInput } from '../lib/schema/post';

export type WPPostPayload = WPRawPostInput;
export type WPPost = ClubPost;

const HTML_ENTITY_MAP: Record<string, string> = {
  amp: '&',
  apos: "'",
  lt: '<',
  gt: '>',
  quot: '"',
  hellip: '…',
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
};

const CMS_ORIGIN = 'https://killarneyathletic.com';
const DEFAULT_HERO_IMAGE = '/android-chrome-512x512.png';

export function rewriteLegacyWordPressUrl(value: string): string {
  return value.replace(/https?:\/\/(?:www\.)?killarneyathletic\.com(?=\/)/gi, CMS_ORIGIN);
}

function decodeEntitiesOnce(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code: string) => {
    if (/^#x/i.test(code)) {
      return String.fromCodePoint(parseInt(code.slice(2), 16));
    }

    if (code.startsWith('#')) {
      return String.fromCodePoint(parseInt(code.slice(1), 10));
    }

    return HTML_ENTITY_MAP[code.toLowerCase()] ?? entity;
  });
}

function decodeEntities(value: string): string {
  let decoded = value;

  for (let index = 0; index < 5; index += 1) {
    const next = decodeEntitiesOnce(decoded);
    if (next === decoded) return decoded;
    decoded = next;
  }

  return decoded;
}

function validHttpUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? value : undefined;
  } catch {
    return undefined;
  }
}

function toPlainText(value: string): string {
  return decodeEntities(value)
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+=("[^"]*"|'[^']*')/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function summarize(value: string, maximumLength = 260): string {
  if (value.length <= maximumLength) return value;
  const shortened = value.slice(0, maximumLength + 1);
  const lastSpace = shortened.lastIndexOf(' ');
  return `${shortened.slice(0, lastSpace > maximumLength * 0.7 ? lastSpace : maximumLength).trim()}…`;
}

function parseNotice(meta: Record<string, unknown> | undefined): WPPost['notice'] {
  const team = typeof meta?.ka_notice_team === 'string' ? meta.ka_notice_team.trim() : '';
  const startsAtValue = typeof meta?.ka_notice_starts_at === 'string' ? meta.ka_notice_starts_at : '';
  const expiresAtValue = typeof meta?.ka_notice_expires_at === 'string' ? meta.ka_notice_expires_at : '';
  const startsAt = new Date(startsAtValue);
  const expiresAt = new Date(expiresAtValue);

  if (!team || Number.isNaN(startsAt.getTime()) || Number.isNaN(expiresAt.getTime()) || startsAt >= expiresAt) {
    return undefined;
  }

  return { team, startsAt, expiresAt };
}

function sanitizeContent(value: string): string {
  return sanitizeHtml(rewriteLegacyWordPressUrl(decodeEntities(value)), {
    allowedTags: ['p', 'br', 'a', 'img'],
    disallowedTagsMode: 'discard',
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: 'a',
        attribs: {
          ...attribs,
          ...(attribs.target === '_blank' ? { rel: 'noopener noreferrer' } : {}),
        },
      }),
      img: (_tagName, attribs) => ({
        tagName: 'img',
        attribs: {
          src: attribs.src,
          alt: attribs.alt ?? '',
          title: attribs.title,
          width: attribs.width,
          height: attribs.height,
          loading: attribs.loading || 'lazy',
        },
      }),
    },
  });
}

export function parseWPPost(payload: WPPostPayload): WPPost {
  const title = decodeEntities(payload.title?.rendered ?? 'Untitled post');
  const wordpressExcerpt = toPlainText(payload.excerpt?.rendered ?? '');
  const rawContent = payload.content?.rendered ?? '';
  const plainContent = toPlainText(rawContent);
  const excerpt = summarize(plainContent || wordpressExcerpt);
  const content = sanitizeContent(rawContent);

  const categories = (payload._embedded?.['wp:term'] ?? [])
    .flat()
    .filter((term) => term.taxonomy === 'category')
    .map((term) => ({
      id: term.id ?? 0,
      name: decodeEntities(term.name ?? 'General'),
      slug: term.slug ?? 'general',
    }));

  const featuredImageUrlValue = validHttpUrl(payload._embedded?.['wp:featuredmedia']?.[0]?.source_url);
  const featuredImageUrl = featuredImageUrlValue
    ? rewriteLegacyWordPressUrl(featuredImageUrlValue)
    : undefined;
  const featuredImageAlt = toPlainText(
    payload._embedded?.['wp:featuredmedia']?.[0]?.alt_text ?? '',
  ) || title;
  const authorName = payload._embedded?.author?.[0]?.name ?? 'Killarney Athletic';
  const hasClubforceLink = /clubforce|register|membership/i.test(excerpt + ' ' + plainContent);

  return {
    id: payload.id,
    slug: payload.slug,
    title,
    excerpt: excerpt || 'Read the latest update from Killarney Athletic AFC.',
    content: content || '<p>No content available yet.</p>',
    date: new Date(payload.date),
    contentHtml: content || '<p>No content available yet.</p>',
    publishedAt: new Date(payload.date),
    heroImage: {
      src: featuredImageUrl || DEFAULT_HERO_IMAGE,
      alt: featuredImageAlt,
    },
    authorName,
    categories,
    featuredImageUrl,
    featuredImageAlt,
    hasClubforceLink,
    link: rewriteLegacyWordPressUrl(payload.link ?? '/'),
    notice: parseNotice(payload.meta),
  };
}

export function isNoticeActive(post: WPPost, now = new Date()): boolean {
  if (!post.notice || Number.isNaN(now.getTime())) return false;
  return post.notice.startsAt <= now && now < post.notice.expiresAt;
}
