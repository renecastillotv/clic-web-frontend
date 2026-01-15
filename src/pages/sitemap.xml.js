// src/pages/sitemap.xml.js
const SITEMAP_URL = 'https://pacewqgypevfgjmdsorz.supabase.co/functions/v1/sitemap-data';
const AUTH_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhY2V3cWd5cGV2ZmdqbWRzb3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2NjU4OTksImV4cCI6MjA2NDI0MTg5OX0.Qlg-UVy-sikr76GxYmTcfCz1EnAqPHxvFeLrdqnjuWs';

// --- helpers de normalización y detección (como en el router) ---
function normalizeHost(raw) {
    if (!raw) return null;
    let h = String(raw).trim().toLowerCase();

    // si vino con protocolo, parsear
    if (h.includes('://')) {
        try { h = new URL(h).host; } catch { /* ignore */ }
    }

    // quitar puerto si aparece :#### (evita romper IPv6 con corchetes)
    const idx = h.lastIndexOf(':');
    if (idx > -1 && !h.endsWith(']')) {
        const port = h.slice(idx + 1);
        if (/^\d+$/.test(port)) h = h.slice(0, idx);
    }

    if (h.startsWith('www.')) h = h.slice(4);
    if (h.endsWith('.')) h = h.slice(0, -1);
    return h;
}

function pickBestHost(request) {
    const url = new URL(request.url);
    const qpDomain = normalizeHost(url.searchParams.get('domain'));
    const xoHost = normalizeHost(request.headers.get('x-original-host'));
    const xfHost = normalizeHost(request.headers.get('x-forwarded-host'));
    const xrHost = normalizeHost(request.headers.get('x-real-host'));
    const host = normalizeHost(request.headers.get('host'));

    const notSupabase = (h) => !!h && !h.includes('supabase.co');

    // prioridad: query param → x-original-host → x-forwarded-host → x-real-host → host
    if (notSupabase(qpDomain)) return qpDomain;
    if (notSupabase(xoHost)) return xoHost;
    if (notSupabase(xfHost)) return xfHost;
    if (notSupabase(xrHost)) return xrHost;
    if (notSupabase(host)) return host;

    return 'clicinmobiliaria.com';
}

// --- handler ---
export async function GET({ request }) {
    try {
        const host = pickBestHost(request);

        // Construimos la llamada a la edge igual que haces en el router (pasando ?domain=)
        const fetchUrl = `${SITEMAP_URL}?domain=${encodeURIComponent(host)}`;

        // User-Agent y forward del host original para trazabilidad (alineado con router)
        const res = await fetch(fetchUrl, {
            method: 'GET',
            headers: {
                'Authorization': AUTH_TOKEN,
                'Content-Type': 'application/json',
                'User-Agent': `SitemapGenerator/${host}`,
                'X-Original-Host': host
            }
        });

        if (!res.ok) {
            const txt = await res.text().catch(() => 'Unknown error');
            console.error('Sitemap backend error:', res.status, txt);
            throw new Error(`Backend returned ${res.status}`);
        }

        const data = await res.json();
        const urls = Array.isArray(data?.urls) ? data.urls : [];

        // Generación XML (igual a tu flujo actual)
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

        for (const u of urls) {
            // es
            if (u.url_es) {
                const clean = u.url_es.startsWith('/') ? u.url_es.slice(1) : u.url_es;
                xml += `
  <url>
    <loc>https://${host}/${clean}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`;
            }
            // en
            if (u.url_en) {
                const clean = u.url_en.startsWith('/') ? u.url_en.slice(1) : u.url_en;
                xml += `
  <url>
    <loc>https://${host}/${clean}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`;
            }
            // fr
            if (u.url_fr) {
                const clean = u.url_fr.startsWith('/') ? u.url_fr.slice(1) : u.url_fr;
                xml += `
  <url>
    <loc>https://${host}/${clean}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`;
            }
        }

        xml += `
</urlset>`;

        return new Response(xml, {
            status: 200,
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 'public, max-age=3600',
                'X-Robots-Tag': 'all'
            }
        });
    } catch (err) {
        console.error('Sitemap error:', err);
        const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://clicinmobiliaria.com</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <priority>1.0</priority>
  </url>
</urlset>`;
        return new Response(fallback, {
            status: 200,
            headers: { 'Content-Type': 'application/xml; charset=utf-8' }
        });
    }
}
