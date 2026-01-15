// src/middleware.ts
import type { APIContext, MiddlewareNext } from 'astro';

const ASSET_RE = /\.(?:png|jpe?g|webp|gif|svg|ico|css|js|map|woff2?|ttf|txt|xml|pdf|mp4|mp3)$/i;
const ASSET_DIR_RE = /^\/(?:images|img|assets|static|_astro)\//i;
const PASS_THROUGH = new Set<string>(['/sitemap.xml', '/robots.txt']);

export async function onRequest(context: APIContext, next: MiddlewareNext) {
  const p = new URL(context.request.url).pathname;

  // ⬅️ Deja pasar sitemap/robots sí o sí
  if (PASS_THROUGH.has(p)) {
    return next();
  }

  // Si es asset por carpeta, no SSR (pero NO respondas 404 aquí)
  if (ASSET_DIR_RE.test(p)) {
    return next();
  }

  // Si parece asset por extensión, deja pasar para que lo sirva el estático
  if (ASSET_RE.test(p)) {
    return next();
  }

  return next();
}
