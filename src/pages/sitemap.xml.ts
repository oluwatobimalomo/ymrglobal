import { galleryPhotos } from '../data/gallery';
import { getPublishedBlogPosts } from '../data/blog-posts.js';

export const prerender = true;

export async function GET() {
  const site = 'https://ymrglobal.org';
  const routes = [
    '/', '/register', '/nations', '/initiatives', '/delegates', '/faq', '/blog', '/viewing-centre',
    '/testimonies', '/prayer-wall', '/giving', '/partner', '/counselling', '/privacy',
    '/gallery',
    ...Array.from({ length: Math.ceil(galleryPhotos.length / 12) - 1 }, (_, index) => `/gallery/${index + 2}`),
  ];
  const posts = await getPublishedBlogPosts();
  const blogRoutes = posts.map((post) => `/blog/${encodeURIComponent(post.slug)}`);
  const urls = [...routes, ...blogRoutes].map((route) => `  <url><loc>${site}${route}</loc></url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
