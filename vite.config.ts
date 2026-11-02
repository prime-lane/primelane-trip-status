import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Link-preview crawlers need absolute image URLs, so %SITE_URL% in index.html
// is filled from VITE_PUBLIC_URL at build time.
function siteUrl(url: string): Plugin {
  return {
    name: 'site-url',
    transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', url),
    configResolved(config) {
      if (config.command === 'build' && !url) {
        config.logger.warn('VITE_PUBLIC_URL is not set — link previews will have no image.');
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.');
  const url = (env.VITE_PUBLIC_URL ?? '').replace(/\/+$/, '');
  return {
    plugins: [react(), tailwindcss(), siteUrl(url)],
  };
});
