const root = document.querySelector('[data-studio]');

if (root instanceof HTMLElement) {
  const base = (root.dataset.endpoint || '').replace(/\/$/, '');
  const apiKey = root.dataset.apiKey || '';
  const table = `${base}/rest/v1/blog_posts`;
  const storageKey = 'ymr-editorial-session';
  const loginPanel = root.querySelector('[data-studio-login]');
  const app = root.querySelector('[data-studio-app]');
  const loginForm = root.querySelector('[data-login]');
  const loginStatus = root.querySelector('[data-studio-login] [data-status]');
  const studioStatus = root.querySelector('[data-studio-status]');
  const editor = root.querySelector('[data-editor]');
  const list = root.querySelector('[data-list]');
  const editorStatus = root.querySelector('[data-editor-status]');
  const uploadStatus = root.querySelector('[data-upload-status]');
  const fields = editor;
  const bodyEditor = editor?.querySelector('[data-body-editor]');
  const bodySource = editor?.elements.body;
  let session = null;
  let posts = [];
  let current = null;

  const announce = (element, text, kind = '') => { if (element) { element.textContent = text; element.dataset.kind = kind; } };
  const saveSession = (value) => { session = value; sessionStorage.setItem(storageKey, JSON.stringify(value)); };
  const refresh = async () => {
    const response = await fetch(`${base}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: session.refresh_token }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.access_token) throw new Error('Your session expired. Sign in again.');
    saveSession({ access_token: data.access_token, refresh_token: data.refresh_token, expires_at: Date.now() + (data.expires_in || 3600) * 1000 });
  };
  const authorized = async (url, options = {}) => {
    if (!session?.access_token) throw new Error('Please sign in again.');
    if (session.expires_at <= Date.now() + 60000) await refresh();
    const response = await fetch(url, { ...options, headers: { apikey: apiKey, Authorization: `Bearer ${session.access_token}`, ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) } });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.message || result.msg || 'The request could not be completed.');
    }
    return response.status === 204 ? null : response.json().catch(() => null);
  };
  const slugify = (value) => value.toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 180);
  const renderList = () => {
    if (!list) return;
    list.replaceChildren();
    if (!posts.length) { list.innerHTML = '<p class="studio-empty">No articles yet. Start with a new story.</p>'; return; }
    posts.forEach((post) => {
      const row = document.createElement('article');
      row.className = 'studio-post';
      row.innerHTML = `<div class="studio-post__preview" aria-hidden="true"></div><div class="studio-post__content"><div class="studio-post__meta"><span class="studio-post__status"></span><time></time></div><strong></strong><p></p><div class="studio-post__actions"><button type="button" data-edit="${post.id}">Edit story</button><button type="button" data-toggle="${post.id}"></button></div></div>`;
      const preview = row.querySelector('.studio-post__preview');
      if (post.cover_image) { const image = document.createElement('img'); image.src = post.cover_image; image.alt = ''; image.loading = 'lazy'; preview.append(image); }
      else preview.textContent = (post.category || 'YMR').slice(0, 2).toUpperCase();
      row.querySelector('.studio-post__status').textContent = post.status === 'published' ? 'Published' : 'Draft';
      row.querySelector('time').textContent = new Date(post.updated_at || post.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
      row.querySelector('strong').textContent = post.title;
      row.querySelector('.studio-post__content > p').textContent = post.category || 'Uncategorised';
      row.querySelector('[data-toggle]').textContent = post.status === 'published' ? 'Unpublish' : 'Publish';
      list.append(row);
    });
  };
  const clearEditor = () => { fields.reset(); current = null; editor.hidden = true; announce(editorStatus, ''); };
  const openEditor = (post = null) => {
    current = post;
    editor.reset();
    editor.elements.title.value = post?.title || '';
    editor.elements.excerpt.value = post?.excerpt || '';
    editor.elements.category.value = post?.category || '';
    editor.elements.slug.value = post?.slug || '';
    editor.dataset.slugAuto = String(!post);
    editor.elements.cover_image.value = post?.cover_image || '';
    editor.elements.cover_alt.value = post?.cover_alt || '';
    if (bodyEditor) bodyEditor.innerHTML = markdownToEditorHtml(post?.body || '');
    bodySource.value = post?.body || '';
    editor.querySelector('[data-editor-mode]').textContent = post ? (post.status === 'published' ? 'PUBLISHED STORY' : 'DRAFT STORY') : 'NEW STORY';
    editor.querySelector('[data-editor-title]').textContent = post ? 'Edit story' : 'Write a story';
    editor.querySelector('[data-save]').textContent = 'Save draft';
    editor.querySelector('[data-delete]').hidden = !post;
    editor.querySelector('[data-publish]').textContent = post?.status === 'published' ? 'Update story' : 'Publish';
    editor.hidden = false;
    announce(editorStatus, '');
    editor.elements.title.focus();
  };
  const loadPosts = async () => {
    posts = await authorized(`${table}?select=*&order=updated_at.desc`);
    renderList();
    announce(studioStatus, `${posts.length} ${posts.length === 1 ? 'story' : 'stories'}`);
  };
  const save = async (publish) => {
    const data = new FormData(editor);
    const body = editorHtmlToMarkdown(bodyEditor);
    bodySource.value = body;
    if (!body.trim()) { announce(editorStatus, 'Add some story content before saving.'); bodyEditor?.focus(); return; }
    const title = String(data.get('title') || '').trim();
    const slug = slugify(String(data.get('slug') || title));
    const coverImage = String(data.get('cover_image') || '').trim();
    const coverAlt = String(data.get('cover_alt') || '').trim();
    if (coverImage && !coverAlt) { announce(editorStatus, 'Describe the cover image before saving.'); editor.elements.cover_alt.focus(); return; }
    if (!slug) { announce(editorStatus, 'Add a title to create the story URL.'); return; }
    const payload = { title, slug, excerpt: String(data.get('excerpt') || '').trim(), category: String(data.get('category') || '').trim(), cover_image: coverImage || null, cover_alt: coverAlt || null, body: body.trim(), status: publish ? 'published' : 'draft', published_at: publish ? (current?.published_at || new Date().toISOString()) : null, updated_at: new Date().toISOString() };
    const duplicate = posts.find((post) => post.slug === slug && post.id !== current?.id);
    if (duplicate) { announce(editorStatus, 'That URL slug is already in use. Choose another.'); editor.elements.slug.focus(); return; }
    const button = editor.querySelector(publish ? '[data-publish]' : '[data-save]');
    button.disabled = true;
    announce(editorStatus, publish ? 'Publishing…' : 'Saving draft…');
    try {
      if (current) await authorized(`${table}?id=eq.${current.id}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) });
      else await authorized(table, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) });
      announce(editorStatus, publish ? 'Story published.' : 'Draft saved.', 'success');
      await loadPosts();
      if (publish) clearEditor(); else {
        current = posts.find((post) => post.slug === slug) || null;
        editor.querySelector('[data-delete]').hidden = !current;
      }
    } catch (error) { announce(editorStatus, error instanceof Error ? error.message : 'Unable to save story.'); }
    finally { button.disabled = false; }
  };
  const upload = async (file, kind) => {
    if (session.expires_at <= Date.now() + 60_000) await refresh();
    const safeName = file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-');
    const path = `${session.user_id}/${crypto.randomUUID()}-${safeName}`;
    const url = `${base}/storage/v1/object/ymr-blog-media/${path}`;
    const response = await fetch(url, { method: 'POST', headers: { apikey: apiKey, Authorization: `Bearer ${session.access_token}`, 'Content-Type': file.type, 'x-upsert': 'false' }, body: file });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Upload failed. Check that the YMR blog media bucket is configured.');
    return `${base}/storage/v1/object/public/ymr-blog-media/${path}`;
  };
  const markdownToEditorHtml = (source = '') => {
    const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
    const safeUrl = (url) => /^(https:\/\/|\/(?!\/))/.test(url) ? url : '';
    const inline = (text) => escapeHtml(text)
      .replace(/!\[([^\]]*)\]\(([^\s)]+)\)/g, (_, alt, url) => safeUrl(url) ? `<img src="${escapeHtml(safeUrl(url))}" alt="${alt}">` : '')
      .replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, (_, label, url) => safeUrl(url) ? `<a href="${escapeHtml(safeUrl(url))}">${label}</a>` : label)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
    const lines = String(source).split(/\r?\n/);
    const output = [];
    let list = null;
    const closeList = () => { if (list) { output.push(`</${list}>`); list = null; } };
    for (const line of lines) {
      const text = line.trim();
      if (/^[-*] /.test(text) || /^\d+\. /.test(text)) {
        const type = /^\d+\. /.test(text) ? 'ol' : 'ul';
        if (list !== type) { closeList(); output.push(`<${type}>`); list = type; }
        output.push(`<li>${inline(text.replace(/^(?:[-*]|\d+\.) /, ''))}</li>`);
      } else {
        closeList();
        if (!text) continue;
        if (text.startsWith('### ')) output.push(`<h3>${inline(text.slice(4))}</h3>`);
        else if (text.startsWith('## ') || text.startsWith('# ')) output.push(`<h2>${inline(text.replace(/^#{1,2} /, ''))}</h2>`);
        else if (/^https:\/\/\S+\.(mp4|webm)(\?\S*)?$/i.test(text)) output.push(`<video controls src="${escapeHtml(text)}"></video>`);
        else output.push(`<p>${inline(text)}</p>`);
      }
    }
    closeList();
    return output.join('') || '<p><br></p>';
  };
  const editorHtmlToMarkdown = (editorEl) => {
    if (!editorEl) return '';
    const serialize = (node) => {
      if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || '';
      if (!(node instanceof HTMLElement)) return '';
      const children = [...node.childNodes].map(serialize).join('');
      if (node.tagName === 'BR') return '\n';
      if (node.tagName === 'IMG') return `![${(node.getAttribute('alt') || 'Story image').replace(/[\]]/g, '')}](${node.getAttribute('src') || ''})`;
      if (node.tagName === 'VIDEO') return `\n${node.getAttribute('src') || node.querySelector('source')?.getAttribute('src') || ''}\n`;
      if (node.tagName === 'A') return `[${children}](${node.getAttribute('href') || ''})`;
      if (node.tagName === 'STRONG' || node.tagName === 'B') return `**${children}**`;
      if (node.tagName === 'EM' || node.tagName === 'I') return `*${children}*`;
      if (node.tagName === 'H2') return `\n## ${children.trim()}\n`;
      if (node.tagName === 'H3') return `\n### ${children.trim()}\n`;
      if (node.tagName === 'LI') return `- ${children.trim()}\n`;
      if (node.tagName === 'UL' || node.tagName === 'OL') return `\n${children}\n`;
      if (node.tagName === 'P' || node.tagName === 'DIV' || node.tagName === 'BLOCKQUOTE') return `\n${children.trim()}\n`;
      return children;
    };
    return [...editorEl.childNodes].map(serialize).join('').replace(/\n{3,}/g, '\n\n').trim();
  };
  const insertNodeAtCaret = (node) => {
    if (!bodyEditor) return;
    bodyEditor.focus();
    const selection = window.getSelection();
    let range;
    if (selection?.rangeCount && bodyEditor.contains(selection.anchorNode)) range = selection.getRangeAt(0);
    else { range = document.createRange(); range.selectNodeContents(bodyEditor); range.collapse(false); }
    range.deleteContents();
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection?.removeAllRanges(); selection?.addRange(range);
    bodyEditor.dispatchEvent(new InputEvent('input', { bubbles: true }));
  };
  const uploadFiles = async (input, kind) => {
    const files = [...input.files];
    if (!files.length) return;
    announce(uploadStatus, `Uploading ${files.length} ${files.length === 1 ? 'file' : 'files'}…`);
    for (const file of files) {
      try {
        const url = await upload(file, kind);
        if (kind === 'image' && !editor.elements.cover_image.value) editor.elements.cover_image.value = url;
        if (kind === 'image') { const image = document.createElement('img'); image.src = url; image.alt = file.name.replace(/\.[^.]+$/, ''); image.loading = 'lazy'; insertNodeAtCaret(image); }
        else { const video = document.createElement('video'); video.src = url; video.controls = true; video.preload = 'metadata'; insertNodeAtCaret(video); }
      } catch (error) { announce(uploadStatus, error instanceof Error ? error.message : 'Upload failed.'); return; }
    }
    announce(uploadStatus, `${files.length} ${files.length === 1 ? 'file' : 'files'} added to your draft.`);
    input.value = '';
  };
  const signIn = async (email, password) => {
    if (!base || !apiKey) throw new Error('The blog studio is not configured yet.');
    const response = await fetch(`${base}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.access_token) throw new Error('Sign in failed. Check your email and password.');
    saveSession({ access_token: data.access_token, refresh_token: data.refresh_token, expires_at: Date.now() + (data.expires_in || 3600) * 1000, user_id: data.user?.id });
    await verifyAccess();
  };
  const verifyAccess = async () => {
    const membership = await authorized(`${base}/rest/v1/team_access?select=team&team=in.(writer,secretariat)&limit=1`);
    if (!membership?.length) throw new Error('This account does not have writer access. Ask the YMR site administrator to add it.');
    loginPanel.hidden = true;
    app.hidden = false;
    await loadPosts();
  };

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = loginForm.querySelector('button'); button.disabled = true;
    const data = new FormData(loginForm);
    try { await signIn(String(data.get('email') || '').trim(), String(data.get('password') || '')); }
    catch (error) { session = null; sessionStorage.removeItem(storageKey); announce(loginStatus, error instanceof Error ? error.message : 'Unable to sign in.'); }
    finally { button.disabled = false; }
  });
  root.querySelector('[data-new]')?.addEventListener('click', () => openEditor());
  root.querySelector('[data-close]')?.addEventListener('click', clearEditor);
  root.querySelector('[data-logout]')?.addEventListener('click', async () => { const access = session?.access_token; session = null; sessionStorage.removeItem(storageKey); if (access) { try { await fetch(`${base}/auth/v1/logout`, { method: 'POST', headers: { apikey: apiKey, Authorization: `Bearer ${access}` } }); } catch { /* Local sign-out still completes. */ } } window.location.reload(); });
  list?.addEventListener('click', async (event) => {
    const edit = event.target.closest('[data-edit]');
    const toggle = event.target.closest('[data-toggle]');
    if (edit) openEditor(posts.find((post) => post.id === edit.dataset.edit));
    if (toggle) {
      const post = posts.find((item) => item.id === toggle.dataset.toggle);
      if (!post) return;
      const publish = post.status !== 'published';
      if (publish && !window.confirm(`Publish “${post.title}” now?`)) return;
      try { await authorized(`${table}?id=eq.${post.id}`, { method: 'PATCH', body: JSON.stringify({ status: publish ? 'published' : 'draft', published_at: publish ? (post.published_at || new Date().toISOString()) : null, updated_at: new Date().toISOString() }) }); await loadPosts(); }
      catch (error) { announce(studioStatus, error instanceof Error ? error.message : 'Unable to update story.'); }
    }
  });
  editor?.addEventListener('submit', (event) => { event.preventDefault(); save(false); });
  editor?.querySelector('[data-publish]')?.addEventListener('click', () => { if (editor.reportValidity()) save(true); });
  editor?.querySelector('[data-delete]')?.addEventListener('click', async () => {
    if (!current || !window.confirm(`Delete “${current.title}” permanently? This cannot be undone.`)) return;
    try { await authorized(`${table}?id=eq.${current.id}`, { method: 'DELETE' }); clearEditor(); await loadPosts(); }
    catch (error) { announce(editorStatus, error instanceof Error ? error.message : 'Unable to delete story.'); }
  });
  editor?.elements.title.addEventListener('input', () => { if (!current && editor.dataset.slugAuto === 'true') editor.elements.slug.value = slugify(editor.elements.title.value); });
  editor?.elements.slug.addEventListener('input', () => { editor.dataset.slugAuto = 'false'; });
  editor?.querySelector('[data-image-upload]')?.addEventListener('change', (event) => uploadFiles(event.currentTarget, 'image'));
  editor?.querySelectorAll('[data-command]').forEach((button) => button.addEventListener('click', (event) => { event.preventDefault(); bodyEditor?.focus(); const command = button.dataset.command; document.execCommand(command, false, button.dataset.value || null); bodyEditor?.dispatchEvent(new InputEvent('input', { bubbles: true })); }));
  bodyEditor?.addEventListener('input', () => { if (bodySource) bodySource.value = editorHtmlToMarkdown(bodyEditor); });
  bodyEditor?.addEventListener('dragover', (event) => { if ([...event.dataTransfer.items].some((item) => item.kind === 'file')) event.preventDefault(); });
  bodyEditor?.addEventListener('drop', async (event) => { const files = [...event.dataTransfer.files]; if (!files.length) return; event.preventDefault(); const images = files.filter((file) => file.type.startsWith('image/')); const videos = files.filter((file) => file.type.startsWith('video/')); for (const group of [[...images, 'image'], [...videos, 'video']]) { const [first, kind] = group; if (!first) continue; const transfer = new DataTransfer(); group.slice(0, -1).forEach((file) => transfer.items.add(file)); const input = editor.querySelector(kind === 'image' ? '[data-image-upload]' : '[data-video-upload]'); input.files = transfer.files; await uploadFiles(input, kind); } });
  editor?.querySelector('[data-video-upload]')?.addEventListener('change', (event) => uploadFiles(event.currentTarget, 'video'));

  const saved = sessionStorage.getItem(storageKey);
  if (saved) {
    try { session = JSON.parse(saved); verifyAccess().catch((error) => { session = null; sessionStorage.removeItem(storageKey); announce(loginStatus, error instanceof Error ? error.message : 'Sign in again.'); }); }
    catch { sessionStorage.removeItem(storageKey); }
  }
}
