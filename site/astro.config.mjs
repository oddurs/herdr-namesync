// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  markdown: {
    shikiConfig: {
      // Emit CSS variables rather than baked-in colours, so highlighting is
      // mapped to the Gotham palette in global.css instead of fighting it.
      theme: 'css-variables',
      wrap: false,
    },
  },
});
