import { parseWPPost, type WPPost, type WPPostPayload } from '../utils/wpParser';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const DEFAULT_API_URL = 'https://www.killarneyathletic.com/wp-json/wp/v2';
const REQUEST_TIMEOUT_MS = 8_000;
const POSTS_CACHE_PATH = resolve(process.cwd(), '.cache/wp-posts-cache.json');
const MAX_POSTS = 100;

type CachedNotice = {
  team: string;
  startsAt: string;
  expiresAt: string;
};

type CachedWPPost = Omit<WPPost, 'date' | 'notice'> & {
  date: string;
  notice?: CachedNotice;
};

function isCachedNotice(value: unknown): value is CachedNotice {
  if (!value || typeof value !== 'object') return false;
  const notice = value as Partial<CachedNotice>;
  return typeof notice.team === 'string'
    && typeof notice.startsAt === 'string'
    && !Number.isNaN(Date.parse(notice.startsAt))
    && typeof notice.expiresAt === 'string'
    && !Number.isNaN(Date.parse(notice.expiresAt));
}

function isCachedPost(value: unknown): value is CachedWPPost {
  if (!value || typeof value !== 'object') return false;
  const post = value as Partial<CachedWPPost>;
  return typeof post.slug === 'string'
    && typeof post.title === 'string'
    && typeof post.content === 'string'
    && typeof post.date === 'string'
    && !Number.isNaN(Date.parse(post.date))
    && (post.notice === undefined || isCachedNotice(post.notice));
}

async function writePostsCache(posts: WPPost[]): Promise<void> {
  await mkdir(dirname(POSTS_CACHE_PATH), { recursive: true });
  await writeFile(POSTS_CACHE_PATH, JSON.stringify(posts, null, 2), 'utf8');
}

async function readPostsCache(): Promise<WPPost[]> {
  const cached = JSON.parse(await readFile(POSTS_CACHE_PATH, 'utf8')) as unknown;
  if (!Array.isArray(cached) || cached.length === 0 || !cached.every(isCachedPost)) {
    throw new Error('The WordPress last-known-good cache is empty or invalid.');
  }

  return cached.map((post) => ({
    ...post,
    date: new Date(post.date),
    notice: post.notice ? {
      ...post.notice,
      startsAt: new Date(post.notice.startsAt),
      expiresAt: new Date(post.notice.expiresAt),
    } : undefined,
  }));
}

export class WordPressError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'WordPressError';
  }
}

let postsPromise: Promise<WPPost[]> | undefined;

function getApiUrl(): string {
  return (import.meta.env.PUBLIC_WP_API_URL || DEFAULT_API_URL).replace(/\/$/, '');
}

async function request<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const url = new URL(`${getApiUrl()}/${path.replace(/^\//, '')}`);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new WordPressError(
        `WordPress returned ${response.status} ${response.statusText}`,
        response.status,
      );
    }

    return await response.json() as T;
  } catch (error) {
    if (error instanceof WordPressError) throw error;

    throw new WordPressError('Unable to reach the Killarney Athletic news service.', undefined, error);
  }
}

async function loadPosts(): Promise<WPPost[]> {
  try {
    const posts = await request<WPPostPayload[]>('posts', {
      _embed: 1,
      per_page: MAX_POSTS,
    });
    const normalizedPosts = posts.map(parseWPPost);

    if (normalizedPosts.length === 0) {
      throw new WordPressError('WordPress returned an empty post archive.');
    }

    await writePostsCache(normalizedPosts);
    return normalizedPosts;
  } catch (liveError) {
    try {
      const cachedPosts = await readPostsCache();
      console.warn('WordPress is unavailable; using the last-known-good post cache.');
      return cachedPosts;
    } catch (cacheError) {
      throw new WordPressError(
        'WordPress is unavailable and no valid last-known-good cache exists; aborting the build.',
        undefined,
        { liveError, cacheError },
      );
    }
  }
}

export async function getPosts(limit = 6): Promise<WPPost[]> {
  postsPromise ??= loadPosts();
  const posts = await postsPromise;
  return posts.slice(0, Math.min(Math.max(limit, 1), posts.length));
}

export interface GalleryImage {
  src: string;
  alt: string;
}

export interface GalleryPost extends WPPost {
  images: GalleryImage[];
  coverImageUrl: string;
}

function decodeGalleryAttribute(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/^http:\/\//, 'https://');
}

function extractGalleryImages(content: string, title: string): GalleryImage[] {
  const images: GalleryImage[] = [];
  const seen = new Set<string>();
  const linkedImagePattern = /<a[^>]+href=(['"])(https?:\/\/[^'"]+?\.(?:jpe?g|png|webp|gif))(?:\?[^'"]*)?\1[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = linkedImagePattern.exec(content))) {
    const src = decodeGalleryAttribute(match[2]);
    if (seen.has(src)) continue;

    const imageMarkup = match[3];
    const altMatch = imageMarkup.match(/\balt=(['"])(.*?)\1/i);
    const titleMatch = match[0].match(/\b(?:data-rl_title|title)=(['"])(.*?)\1/i);
    const alt = decodeGalleryAttribute(altMatch?.[2] || titleMatch?.[2] || title);

    seen.add(src);
    images.push({ src, alt });
  }

  return images;
}

export async function getGalleryPosts(limit = 100): Promise<GalleryPost[]> {
  try {
    const posts = await request<WPPostPayload[]>('posts', {
      _embed: 1,
      categories: 39,
      per_page: Math.min(Math.max(limit, 1), 100),
    });

    return posts
      .map((payload) => {
        const post = parseWPPost(payload);
        const images = extractGalleryImages(payload.content?.rendered ?? '', post.title);

        return {
          ...post,
          images,
          coverImageUrl: post.featuredImageUrl || images[0]?.src || '',
        };
      })
      .filter((post) => post.images.length > 0);
  } catch (error) {
    console.warn(error instanceof WordPressError ? error.message : error);
    return [];
  }
}

export async function getPostPaths(limit = 100): Promise<Array<{ params: { slug: string }; props: { post: WPPost } }>> {
  const posts = await getPosts(limit);

  return posts.map((post) => ({
    params: { slug: post.slug },
    props: { post },
  }));
}
