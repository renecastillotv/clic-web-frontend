// astro.config.mjs
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel'; // Sin /serverless
import tailwind from '@astrojs/tailwind';

export default defineConfig({
    output: 'server', // Cambiar de 'hybrid' a 'server' por ahora
    adapter: vercel(),
    integrations: [
        tailwind()
    ]
});