import { galleryPhotos } from '../data/gallery';

export const prerender = true;

export function GET() {
  const site = 'https://ymrglobal.org';
  const routes = [
    '/', '/nations', '/initiatives', '/delegates', '/accommodation', '/faq',
    '/testimonies', '/prayer-wall', '/giving', '/partner', '/counselling', '/privacy',
    '/gallery',
    ...Array.from({ length: Math.ceil(galleryPhotos.length / 12) - 1 }, (_, index) => `/gallery/${index + 2}`),
  ];
  const urls = routes.map((route) => `  <url><loc>${site}${route}</loc></url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
