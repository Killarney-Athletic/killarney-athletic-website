import { z } from 'zod';

const renderedField = z.object({
  rendered: z.string().default(''),
  protected: z.boolean().optional().default(false),
});

const titleField = z.object({
  rendered: z.string().default('Untitled Update'),
  protected: z.boolean().optional().default(false),
});

const featuredMediaSchema = z.object({
  source_url: z.string().optional(),
  alt_text: z.string().optional().default('Killarney Athletic A.F.C.'),
  media_details: z.object({
    sizes: z.record(z.string(), z.object({
      source_url: z.string(),
      width: z.number().optional(),
      height: z.number().optional(),
    })).optional(),
  }).optional(),
});

export const WPRawPostSchema = z.object({
  id: z.number().int().nonnegative(),
  date: z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid publication date'),
  date_gmt: z.string().optional(),
  slug: z.string().trim().min(1),
  status: z.string().default('publish'),
  title: titleField.default({ rendered: 'Untitled Update', protected: false }),
  content: renderedField.default({ rendered: '', protected: false }),
  excerpt: renderedField.default({ rendered: '', protected: false }),
  featured_media: z.number().default(0),
  author: z.number().optional(),
  categories: z.array(z.number()).default([]),
  link: z.string().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
  _embedded: z.object({
    author: z.array(z.object({
      name: z.string().optional(),
      avatar_urls: z.record(z.string(), z.string()).optional(),
    })).optional(),
    'wp:term': z.array(z.array(z.object({
      id: z.number().optional(),
      name: z.string().optional(),
      slug: z.string().optional(),
      taxonomy: z.string().optional(),
    }))).optional(),
    'wp:featuredmedia': z.array(featuredMediaSchema).optional(),
  }).optional(),
});

export type WPRawPost = z.infer<typeof WPRawPostSchema>;
export type WPRawPostInput = z.input<typeof WPRawPostSchema>;

export interface ClubPost {
  id: number;
  slug: string;
  title: string;
  contentHtml: string;
  excerpt: string;
  publishedAt: Date;
  heroImage: {
    src: string;
    alt: string;
  };
  content: string;
  date: Date;
  authorName: string;
  categories: Array<{ id: number; name: string; slug: string }>;
  featuredImageUrl?: string;
  featuredImageAlt: string;
  hasClubforceLink: boolean;
  link: string;
  notice?: {
    team: string;
    startsAt: Date;
    expiresAt: Date;
  };
}
