// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: process.env.ASTRO_SITE ?? 'https://www.killarneyathletic.com',
  base: process.env.ASTRO_BASE ?? '/',
  redirects: {
    '/membership': '/registration',
    '/contact-us': '/contact',
    '/child-welfare-course': '/contact',
    '/7-a-side-archive': '/fixtures-results',
  },
  image: {
    domains: ['killarneyathletic.com', 'www.killarneyathletic.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.killarneyathletic.com',
        pathname: '/wp-content/uploads/**',
      },
    ],
  },
  integrations: [
    sitemap({
      filter: (page) => {
        const pathname = new URL(page).pathname;

        return ![
          '/404.html',
          '/contact-us/',
          '/membership/',
          '/ui-kit/',
        ].includes(pathname) && !/^\/match-centre\/\d+\/$/.test(pathname);
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
