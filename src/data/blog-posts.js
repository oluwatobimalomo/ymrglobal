const endpoint = `${(import.meta.env.PUBLIC_SUPABASE_URL || '').trim().replace(/\/$/, '')}/rest/v1/blog_posts`;
const apiKey = (import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY || '').trim();

export async function getPublishedBlogPosts() {
  if (!endpoint || !apiKey) return [];
  try {
    const response = await fetch(`${endpoint}?select=id,title,slug,excerpt,category,cover_image,cover_alt,body,published_at&status=eq.published&order=published_at.desc`, { headers: { apikey: apiKey } });
    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
}

const escape = (text) => String(text || '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const safeUrl = (url) => /^(https?:\/\/|\/(?!\/))/.test(url) ? url : '';
const inline = (text) => escape(text).replace(/!\[([^\]]*)\]\(([^\s)]+)\)/g, (_, alt, url) => safeUrl(url) ? `<img src="${escape(safeUrl(url))}" alt="${alt}" loading="lazy">` : '').replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, (_, label, url) => safeUrl(url) ? `<a href="${escape(safeUrl(url))}" rel="noopener noreferrer">${label}</a>` : label).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');

export function renderBlogMarkdown(source = '') {
  let list = null;
  const output = [];
  const closeList = () => { if (list) { output.push(`</${list}>`); list = null; } };
  for (const line of String(source).split(/\r?\n/)) {
    const text = line.trim().replace(/\[Register for (?:the 10th edition of YMR|YMR 2026)\]\(\/register\)(?:\s*·\s*)?/gi, '').trim();
    if (/^Follow (?:the journey|YMR):/i.test(text)) { closeList(); continue; }
    if (/^[-*] /.test(text) || /^\d+\. /.test(text)) {
      const type = /^\d+\. /.test(text) ? 'ol' : 'ul';
      if (list !== type) { closeList(); output.push(`<${type}>`); list = type; }
      output.push(`<li>${inline(text.replace(/^(?:[-*]|\d+\.) /, ''))}</li>`);
    } else {
      closeList();
      if (!text) continue;
      if (/^https?:\/\/\S+\.(mp4|webm)(\?\S*)?$/i.test(text)) output.push(`<video controls preload="metadata" src="${escape(text)}"></video>`);
      else if (text.startsWith('### ')) output.push(`<h3>${inline(text.slice(4))}</h3>`);
      else if (text.startsWith('## ')) output.push(`<h2>${inline(text.slice(3))}</h2>`);
      else if (text.startsWith('# ')) output.push(`<h2>${inline(text.slice(2))}</h2>`);
      else output.push(`<p>${inline(text)}</p>`);
    }
  }
  closeList();
  return output.join('\n');
}
