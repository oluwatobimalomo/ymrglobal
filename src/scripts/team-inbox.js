const root = document.querySelector('[data-team-inbox]');

if (root instanceof HTMLElement) {
  const baseUrl = (root.dataset.endpoint || '').replace(/\/$/, '');
  const apiKey = root.dataset.apiKey || '';
  const team = root.dataset.team || '';
  const table = root.dataset.table || '';
  const fields = root.dataset.fields || '';
  const storageKey = `ymr-team-session-${team}`;
  const form = root.querySelector('[data-login]');
  const status = root.querySelector('[data-status]');
  const records = root.querySelector('[data-records]');
  const logoutButton = root.querySelector('[data-logout]');
  const rows = root.querySelector('[data-rows]');
  const count = root.querySelector('[data-count]');
  const downloadButton = root.querySelector('[data-download]');
  let activeSession = null;

  const announce = (message, kind = '') => {
    if (!status) return;
    status.textContent = message;
    status.dataset.kind = kind;
  };

  const storeSession = (session) => {
    activeSession = session;
    sessionStorage.setItem(storageKey, JSON.stringify(session));
  };

  const refreshSession = async () => {
    if (!activeSession?.refresh_token) throw new Error('Your session expired. Please sign in again.');
    const response = await fetch(`${baseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { apikey: apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: activeSession.refresh_token }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.access_token) {
      activeSession = null;
      sessionStorage.removeItem(storageKey);
      throw new Error('Your session expired. Please sign in again.');
    }
    storeSession({
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
      expires_at: Date.now() + (payload.expires_in || 3600) * 1000,
    });
  };

  const request = async (path, options = {}) => {
    if (!activeSession?.access_token) throw new Error('Please sign in again to continue.');
    if (activeSession.expires_at <= Date.now() + 60_000) await refreshSession();
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${activeSession.access_token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
    if (!response.ok) {
      if (response.status === 401) {
        activeSession = null;
        sessionStorage.removeItem(storageKey);
      }
      const body = await response.json().catch(() => ({}));
      throw new Error(response.status === 401 ? 'Your session expired. Please sign in again.' : body.message || body.msg || 'Unable to load this inbox.');
    }
    return response.status === 204 ? null : response.json();
  };

  const cell = (value) => {
    const td = document.createElement('td');
    td.textContent = value == null ? '' : String(value);
    return td;
  };

  const renderRows = (items) => {
    if (!(rows instanceof HTMLElement)) return;
    rows.replaceChildren();
    for (const item of items) {
      const tr = document.createElement('tr');
      const date = item.created_at ? new Date(item.created_at).toLocaleString() : '';
      if (team === 'prayer') {
        tr.append(cell(date), cell(item.name || 'Not provided'), cell(item.email || 'Not provided'), cell(item.prayer_focus), cell(item.prayer_request));
      } else {
        tr.append(cell(date), cell(item.name), cell(item.category), cell(item.status), cell(item.testimony));
      }
      rows.append(tr);
    }
    if (count) count.textContent = `${items.length} recent ${team === 'prayer' ? 'requests' : 'submissions'}`;
  };

  const loadInbox = async () => {
    const membership = await request(`/rest/v1/team_access?select=team&team=eq.${encodeURIComponent(team)}&limit=1`);
    if (!membership.length) throw new Error('This account is not assigned to this team. Contact the YMR site administrator.');
    const selectedFields = fields.split(',').map(encodeURIComponent).join(',');
    const recent = await request(`/rest/v1/${table}?select=${selectedFields}&order=created_at.desc&limit=100`);
    renderRows(recent);
    if (form) form.hidden = true;
    if (records) records.hidden = false;
    if (logoutButton) logoutButton.hidden = false;
    announce('Inbox loaded. Submissions are visible only to authorized team accounts.', 'success');
  };

  const login = async (email, password) => {
    if (!baseUrl || !apiKey) throw new Error('The team inbox is not configured. Contact the YMR site administrator.');
    const response = await fetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.access_token) throw new Error('Sign-in failed. Check your details or contact the YMR site administrator.');
    storeSession({ access_token: payload.access_token, refresh_token: payload.refresh_token, expires_at: Date.now() + (payload.expires_in || 3600) * 1000 });
    await loadInbox();
  };

  const csvValue = (value) => {
    const text = String(value ?? '');
    // Prevent spreadsheet apps from evaluating user-submitted text as a formula.
    const safeText = /^[\s\u0000-\u001f]*[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safeText.replaceAll('"', '""')}"`;
  };
  const downloadCsv = async () => {
    if (!activeSession?.access_token) return;
    downloadButton?.setAttribute('disabled', '');
    announce('Preparing the complete CSV…');
    try {
      const selectedFields = fields.split(',').map(encodeURIComponent).join(',');
      const allRows = [];
      const pageSize = 500;
      for (let offset = 0; ; offset += pageSize) {
        const batch = await request(`/rest/v1/${table}?select=${selectedFields}&order=created_at.desc&limit=${pageSize}&offset=${offset}`);
        allRows.push(...batch);
        if (batch.length < pageSize) break;
      }
      if (!allRows.length) throw new Error('There are no submissions to download yet.');
      const headers = fields.split(',');
      const csv = [headers.map(csvValue).join(','), ...allRows.map((item) => headers.map((key) => csvValue(item[key])).join(','))].join('\r\n');
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = href;
      anchor.download = `ymr-${team}-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(href);
      announce(`Downloaded ${allRows.length} ${team === 'prayer' ? 'requests' : 'testimonies'}.`, 'success');
    } catch (error) {
      announce(error instanceof Error ? error.message : 'The CSV could not be prepared.', 'error');
    } finally {
      downloadButton?.removeAttribute('disabled');
    }
  };

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const submit = form.querySelector('button[type="submit"]');
    if (submit instanceof HTMLButtonElement) submit.disabled = true;
    announce('Signing in…');
    try {
      await login(String(data.get('email') || '').trim(), String(data.get('password') || ''));
    } catch (error) {
      activeSession = null;
      sessionStorage.removeItem(storageKey);
      announce(error instanceof Error ? error.message : 'Unable to sign in.', 'error');
    } finally {
      if (submit instanceof HTMLButtonElement) submit.disabled = false;
    }
  });

  logoutButton?.addEventListener('click', async () => {
    const accessToken = activeSession?.access_token;
    activeSession = null;
    sessionStorage.removeItem(storageKey);
    if (form) form.hidden = false;
    if (records) records.hidden = true;
    if (logoutButton) logoutButton.hidden = true;
    if (rows) rows.replaceChildren();
    announce('You have signed out.');
    if (accessToken && baseUrl && apiKey) {
      try {
        await fetch(`${baseUrl}/auth/v1/logout`, {
          method: 'POST',
          headers: { apikey: apiKey, Authorization: `Bearer ${accessToken}` },
        });
      } catch {
        // The local session is already cleared, so sign-out still completes offline.
      }
    }
  });

  downloadButton?.addEventListener('click', downloadCsv);

  const saved = sessionStorage.getItem(storageKey);
  if (saved) {
    try {
      const session = JSON.parse(saved);
      if (session.refresh_token && session.access_token) {
        activeSession = session;
        loadInbox().catch((error) => {
          activeSession = null;
          sessionStorage.removeItem(storageKey);
          if (form) form.hidden = false;
          if (records) records.hidden = true;
          if (logoutButton) logoutButton.hidden = true;
          announce(error instanceof Error ? error.message : 'Please sign in again.', 'error');
        });
      } else {
        sessionStorage.removeItem(storageKey);
      }
    } catch {
      sessionStorage.removeItem(storageKey);
    }
  }
}
