// src/pages/robots.txt.js
export async function GET({ request }) {
  const host = request.headers.get('host') || 'clicinmobiliaria.com';
  
  const robotsContent = `User-agent: *
Allow: /

# Sitemaps
Sitemap: https://${host}/sitemap.xml

# Block admin areas
Disallow: /admin/
Disallow: /api/
Disallow: /_astro/
Disallow: /debug

# Block search parameters
Disallow: /*?utm_*
Disallow: /*?ref=*
Disallow: /*?fbclid=*

# Crawl delay (optional)
Crawl-delay: 1`;

  return new Response(robotsContent, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400', // 24 horas
    },
  });
}