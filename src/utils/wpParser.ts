import sanitizeHtml from 'sanitize-html';

export interface WPPostPayload {
  id: number;
  slug: string;
  title?: {
    rendered?: string;
  };
  content?: {
    rendered?: string;
    protected?: boolean;
  };
  excerpt?: {
    rendered?: string;
    protected?: boolean;
  };
  date: string;
  author?: number;
  categories?: number[];
  link?: string;
  _embedded?: {
    author?: Array<{
      name?: string;
      avatar_urls?: Record<string, string>;
    }>;
    'wp:term'?: Array<Array<{
      id?: number;
      name?: string;
      slug?: string;
      taxonomy?: string;
    }>>;
    'wp:featuredmedia'?: Array<{
      source_url?: string;
      alt_text?: string;
    }>;
  };
}

export interface WPPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  date: Date;
  authorName: string;
  categories: Array<{ id: number; name: string; slug: string }>;
  featuredImageUrl?: string;
  featuredImageAlt: string;
  hasClubforceLink: boolean;
  link: string;
}

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

function sanitizeContent(value: string): string {
  return sanitizeHtml(decodeEntities(value), {
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
  const excerpt = toPlainText(payload.excerpt?.rendered ?? '');
  const rawContent = payload.content?.rendered ?? '';
  const plainContent = toPlainText(rawContent);
  const content = sanitizeContent(rawContent);

  const categories = (payload._embedded?.['wp:term'] ?? [])
    .flat()
    .filter((term) => term.taxonomy === 'category')
    .map((term) => ({
      id: term.id ?? 0,
      name: decodeEntities(term.name ?? 'General'),
      slug: term.slug ?? 'general',
    }));

  const featuredImageUrl = payload._embedded?.['wp:featuredmedia']?.[0]?.source_url;
  const featuredImageAlt = toPlainText(
    payload._embedded?.['wp:featuredmedia']?.[0]?.alt_text ?? '',
  ) || title;
  const authorName = payload._embedded?.author?.[0]?.name ?? 'Killarney Athletic';
  const hasClubforceLink = /clubforce|register|membership/i.test(excerpt + ' ' + plainContent);

  return {
    slug: payload.slug,
    title,
    excerpt: excerpt || 'Read the latest update from Killarney Athletic AFC.',
    content: content || '<p>No content available yet.</p>',
    date: new Date(payload.date),
    authorName,
    categories,
    featuredImageUrl,
    featuredImageAlt,
    hasClubforceLink,
    link: payload.link ?? '/',
  };
}
