import * as cheerio from 'cheerio';

export function firstWpContentImage(rawHtml: string): string | undefined {
  if (!rawHtml || typeof rawHtml !== 'string') return undefined;

  const $ = cheerio.load(rawHtml, null, false);
  const candidates = $('img[src]').toArray();

  for (const element of candidates) {
    const source = $(element).attr('src');
    if (!source) continue;

    try {
      const url = new URL(source);
      if (
        ['killarneyathletic.com', 'www.killarneyathletic.com'].includes(url.hostname)
        && url.pathname.startsWith('/wp-content/uploads/')
      ) {
        url.protocol = 'https:';
        url.hostname = 'killarneyathletic.com';
        return url.href;
      }
    } catch {
      // Ignore malformed legacy image URLs and continue looking for a safe candidate.
    }
  }

  return undefined;
}

export function optimizeWpContentHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';

  const $ = cheerio.load(rawHtml, null, false);

  $('img').each((_, element) => {
    const image = $(element);
    if (!image.attr('src')) return;

    image.attr('loading', 'lazy');
    image.attr('decoding', 'async');

    if (!image.attr('width') || !image.attr('height')) {
      image.addClass('wp-content-image aspect-auto h-auto max-w-full');
    }

    const style = image.attr('style');
    if (style) {
      const cleanStyle = style
        .replace(/(?:^|;)\s*width\s*:[^;]+;?/gi, ';')
        .replace(/(?:^|;)\s*height\s*:[^;]+;?/gi, ';')
        .replace(/^;+|;+$/g, '')
        .trim();

      if (cleanStyle) image.attr('style', cleanStyle);
      else image.removeAttr('style');
    }
  });

  $('iframe').each((_, element) => {
    $(element)
      .attr('loading', 'lazy')
      .addClass('wp-content-embed');
  });

  return $.html();
}
