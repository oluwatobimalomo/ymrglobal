const endpoint = `${(import.meta.env.PUBLIC_SUPABASE_URL || '').trim().replace(/\/$/, '')}/rest/v1/blog_posts`;
const apiKey = (import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY || '').trim();

// Keep the launch stories available in static builds too. A site deployment
// does not apply the Supabase seed SQL, so a newly provisioned production
// database can legitimately return an empty list.
const launchStories = [
  {
    id: 'launch-vision',
    title: 'YMR Global: Introducing The Vision',
    slug: 'ymr-global-introducing-the-vision',
    excerpt: 'From a gathering of young ministers to a generation carrying the presence of Jesus into every sphere, discover the vision behind YMR Global.',
    category: 'The YMR Story',
    cover_image: '/images/gallery/ymr-2017/ymr-2017-02.jpg',
    cover_alt: 'Young ministers gathered in worship at the first YMR retreat in 2017',
    published_at: '2026-11-20T09:00:00Z',
    body: `YMR began in 2017 with a simple, urgent desire: see young ministers encounter God and carry that encounter into their communities. The first retreat welcomed more than 700 people from over 24 denominations. What started as a gathering quickly became a shared assignment.

![Young people gathered in worship at YMR](/images/retreat/gathering-wide.jpg)

## A generation on fire

The vision is often expressed in three words: **Raising a Burning Generation.** YMR exists to raise, build and equip people to serve as Kingdom ambassadors in every sphere of human influence. It is a call to wholehearted faith that reaches beyond a conference room into homes, campuses, workplaces and cities.

In 2018, Pastor Daniel Olawande described a vision of people emerging like giants from fire: burning, yet not consumed. That image captured the heart of the retreat—a people formed by the presence of God, ready to live with courage, character and conviction.

Each year, prayer, worship and the teaching of Scripture sit alongside practical conversations about leadership, work, creativity and influence. The aim is not simply a memorable few days; it is a life that keeps bearing fruit after the gathering ends.

YMR Global is now preparing for its tenth Nigerian edition, **City Takers**, December 26–30, 2026. There is a place for you in this story.

[Register for YMR 2026](/register)`,
  },
  {
    id: 'launch-history',
    title: '10 Years of Revival: YMR Over The Years',
    slug: '10-years-of-revival-ymr-over-the-years',
    excerpt: 'A look at the turning points, annual themes and growing community that have shaped YMR from its first retreat to its tenth edition.',
    category: 'Milestones',
    cover_image: '/images/gallery/ymr-2024/ymr-2024-teaching.webp',
    cover_alt: 'A speaker teaches a gathering of young people at YMR 2024',
    published_at: '2026-11-20T09:05:00Z',
    body: `Ten years is more than a number. It is a record of answered prayers, new beginnings and a generation learning to carry revival into everyday life.

![A moment from YMR worship](/images/gallery/ymr-2024/ymr-2024-worship.webp)

## From one retreat to a movement

**2017 — The beginning.** The first Young Ministers Retreat gathered more than 700 people representing over 24 denominations. A vision to raise a burning generation found a community ready to run with it.

**2018 — A defining picture.** The “burning generation” vision took shape as a call to be transformed by God’s presence and sent into the world with purpose.

**2020 — A wider reach.** Even as the gathering reached people online, the annual retreat continued to grow. YMR’s historical report records more than 19,000 on-site participants and a digital reach above two million that year.

**2021–2025 — A generation equipped.** Each edition carried a distinct theme: *Weapons of War*, *Witnesses*, *The Rain*, *Floodgates* and *The New Army*. Alongside worship and teaching, the work expanded into practical development, including the Witness Club and opportunities for young entrepreneurs.

![The New Army, YMR 2025](/images/editions/ymr-2025-the-new-army.jpeg)

Now comes **City Takers**: the tenth Nigerian edition, December 26–30, 2026. The milestone points forward—to cities reached, leaders raised and faith put into action.

[Register for the 10th edition of YMR](/register)`,
  },
  {
    id: 'launch-impact',
    title: 'Impact, Testimonies and Stories of Faith',
    slug: 'impact-testimonies-and-stories-of-faith',
    excerpt: 'The truest measure of a retreat is what people carry home: renewed faith, a clearer calling and courage to serve others.',
    category: 'Stories of Faith',
    cover_image: '/images/gallery/ymr-2025/ymr-2025-stage.webp',
    cover_alt: 'A woman worships with her hands raised at YMR 2025',
    published_at: '2026-11-20T09:10:00Z',
    body: `A gathering ends. The work God begins in people continues.

![A community gathered in worship at YMR](/images/gallery/ymr-2025/ymr-2025-worship.webp)

Across YMR editions, people have shared stories of renewed faith, answered prayer and fresh direction. One public testimony tells of a scholarship interview invitation arriving as its author travelled to the 2023 retreat; that journey later led to a fully funded PhD in the United States. Others describe finding the courage to serve, returning to prayer with new conviction, or discovering a community that helped them keep going.

These stories are personal, but their impact reaches outward. Through the **Witness Club**, young people are encouraged to share their faith and serve in their communities. **Youth Aflame** creates space for practical growth, while **YMR Samaritan** reflects a commitment to care and support. Together, they show that revival can shape both the inner life and the way we treat our neighbours.

We share testimonies with gratitude, never as a promise that every story will look the same. They are reminders of lives being changed and an invitation to keep believing, serving and making room for others.

The next chapter begins at **City Takers**, YMR’s tenth Nigerian edition, December 26–30, 2026. Come ready to worship, grow and bring your faith into your city.

[Register for YMR 2026](/register) · [Read more testimonies](/testimonies)`,
  },
];

export async function getPublishedBlogPosts() {
  if (!endpoint || !apiKey) return launchStories;
  try {
    const response = await fetch(`${endpoint}?select=id,title,slug,excerpt,category,cover_image,cover_alt,body,published_at&status=eq.published&order=published_at.desc`, { headers: { apikey: apiKey } });
    if (!response.ok) return launchStories;
    const posts = await response.json();
    if (!Array.isArray(posts) || !posts.length) return launchStories;
    const bySlug = new Map(launchStories.map((post) => [post.slug, post]));
    for (const post of posts) bySlug.set(post.slug, { ...bySlug.get(post.slug), ...post });
    return [...bySlug.values()].sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0));
  } catch {
    return launchStories;
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
