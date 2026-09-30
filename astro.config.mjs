// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: process.env.ASTRO_SITE ?? 'https://www.killarneyathletic.com',
  base: process.env.ASTRO_BASE ?? '/',
  integrations: [
    sitemap({
      filter: (page) => ![
        '/404.html',
        '/contact-us/',
        '/membership/',
        '/ui-kit/',
      ].some((path) => page.endsWith(path)),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
