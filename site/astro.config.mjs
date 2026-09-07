// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  // GitHub project pages. `base` is why internal links go through src/lib/url.
  site: 'https://oddurs.github.io',
  base: '/herdr-namesync',
  trailingSlash: 'ignore',
  markdown: {
    shikiConfig: {
      // Emit CSS variables rather than baked-in colours, so highlighting is
      // mapped to the Gotham palette in global.css instead of fighting it.
      theme: 'css-variables',
      wrap: false,
    },
  },
});
