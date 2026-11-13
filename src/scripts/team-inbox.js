const root = document.querySelector('[data-team-inbox]');

if (root instanceof HTMLElement) {
  const baseUrl = (root.dataset.endpoint || '').replace(/\/$/, '');
  const apiKey = root.dataset.apiKey || '';
  const team = root.dataset.team || '';
  const view = root.dataset.view || 'login';
  const loginPath = root.dataset.loginPath || `/team/${team}`;
  const inboxPath = root.dataset.inboxPath || `${loginPath}/inbox`;
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
  const selectedDownloadButton = root.querySelector('[data-download-selected]');
  const selectAll = root.querySelector('[data-select-all]');
  const dateFrom = root.querySelector('[data-date-from]');
  const dateTo = root.querySelector('[data-date-to]');
  const categoryFilter = root.querySelector('[data-category]');
  const statusFilter = root.querySelector('[data-status-filter]');
  const searchFilter = root.querySelector('[data-search]');
  let activeSession = null;
  let allItems = [];
  const selectedIds = new Set();

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

  const filteredItems = () => {
    const from = dateFrom?.value || '';
    const to = dateTo?.value || '';
    const category = categoryFilter?.value || '';
    const state = statusFilter?.value || '';
    const search = (searchFilter?.value || '').trim().toLocaleLowerCase();
    return allItems.filter((item) => {
      const createdAt = item.created_at ? new Date(item.created_at) : null;
      const date = createdAt && !Number.isNaN(createdAt.valueOf())
        ? `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}-${String(createdAt.getDate()).padStart(2, '0')}`
        : '';
      if (from && (!date || date < from)) return false;
      if (to && (!date || date > to)) return false;
      if (category && (team === 'prayer' ? item.prayer_focus : item.category) !== category) return false;
      if (state && item.status !== state) return false;
      if (search) {
        const searchableText = team === 'prayer'
          ? [item.name, item.email, item.prayer_focus, item.prayer_request]
          : [item.name, item.category, item.status, item.testimony];
        if (!searchableText.some((value) => String(value || '').toLocaleLowerCase().includes(search))) return false;
      }
      return true;
    });
  };

  const updateSelectionControls = (visibleItems = filteredItems()) => {
    const visibleIds = visibleItems.map((item) => String(item.id));
    if (selectAll instanceof HTMLInputElement) {
      const selectedVisible = visibleIds.filter((id) => selectedIds.has(id)).length;
      selectAll.checked = visibleIds.length > 0 && selectedVisible === visibleIds.length;
      selectAll.indeterminate = selectedVisible > 0 && selectedVisible < visibleIds.length;
    }
    if (selectedDownloadButton instanceof HTMLButtonElement) {
      selectedDownloadButton.disabled = selectedIds.size === 0;
      selectedDownloadButton.textContent = selectedIds.size ? `Download selected (${selectedIds.size})` : 'Download selected';
    }
  };

  const renderRows = () => {
    if (!(rows instanceof HTMLElement)) return;
    const items = filteredItems();
    rows.replaceChildren();
    for (const item of items) {
      const tr = document.createElement('tr');
      const date = item.created_at ? new Date(item.created_at).toLocaleString() : '';
      const selectCell = document.createElement('td');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.setAttribute('aria-label', `Select ${team === 'prayer' ? 'request' : 'testimony'} received ${date || 'on unknown date'}`);
      checkbox.checked = selectedIds.has(String(item.id));
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) selectedIds.add(String(item.id));
        else selectedIds.delete(String(item.id));
        if (count) count.textContent = `Showing ${items.length} of ${allItems.length} ${team === 'prayer' ? 'requests' : 'submissions'} · ${selectedIds.size} selected`;
        updateSelectionControls(items);
      });
      selectCell.append(checkbox);
      tr.append(selectCell);
      if (team === 'prayer') {
        tr.append(cell(date), cell(item.name || 'Not provided'), cell(item.email || 'Not provided'), cell(item.prayer_focus), cell(item.prayer_request));
      } else {
        tr.append(cell(date), cell(item.name), cell(item.category), cell(item.status), cell(item.testimony));
      }
      rows.append(tr);
    }
    if (!items.length) {
      const tr = document.createElement('tr');
      const td = cell(allItems.length ? 'No submissions match these filters.' : 'No submissions have been received yet.');
      td.colSpan = 6;
      tr.append(td);
      rows.append(tr);
    }
    if (count) count.textContent = `Showing ${items.length} of ${allItems.length} ${team === 'prayer' ? 'requests' : 'submissions'} · ${selectedIds.size} selected`;
    updateSelectionControls(items);
  };

  const fetchAllRows = async () => {
    const selectedFields = fields.split(',').map(encodeURIComponent).join(',');
    const result = [];
    const pageSize = 500;
    for (let offset = 0; ; offset += pageSize) {
      const batch = await request(`/rest/v1/${table}?select=${selectedFields}&order=created_at.desc&limit=${pageSize}&offset=${offset}`);
      result.push(...batch);
      if (batch.length < pageSize) break;
    }
    return result;
  };

  const loadInbox = async () => {
    const membership = await request(`/rest/v1/team_access?select=team&team=eq.${encodeURIComponent(team)}&limit=1`);
    if (!membership.length) throw new Error('This account is not assigned to this team. Contact the YMR site administrator.');
    allItems = await fetchAllRows();
    renderRows();
    if (records) records.hidden = false;
    if (logoutButton) logoutButton.hidden = false;
    announce('Inbox loaded!', 'success');
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
    window.location.replace(inboxPath);
  };

  const csvValue = (value) => {
    const text = String(value ?? '');
    // Prevent spreadsheet apps from evaluating user-submitted text as a formula.
    const safeText = /^[\s\u0000-\u001f]*[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safeText.replaceAll('"', '""')}"`;
  };
  const downloadCsv = async (items, label) => {
    if (!activeSession?.access_token) return;
    try {
      if (!items.length) throw new Error(label === 'selected' ? 'Select at least one record to download.' : 'No matching submissions to download.');
      const headers = fields.split(',');
      const csv = [headers.map(csvValue).join(','), ...items.map((item) => headers.map((key) => csvValue(item[key])).join(','))].join('\r\n');
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = href;
      anchor.download = `ymr-${team}-${label}-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(href), 1000);
      announce(`Downloaded ${items.length} ${team === 'prayer' ? 'requests' : 'testimonies'}.`, 'success');
    } catch (error) {
      announce(error instanceof Error ? error.message : 'The CSV could not be prepared.', 'error');
    }
  };

  const downloadMatching = () => downloadCsv(filteredItems(), 'matching');
  const downloadSelected = () => downloadCsv(allItems.filter((item) => selectedIds.has(String(item.id))), 'selected');

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
    window.location.replace(loginPath);
  });

  downloadButton?.addEventListener('click', downloadMatching);
  selectedDownloadButton?.addEventListener('click', downloadSelected);
  [dateFrom, dateTo, categoryFilter, statusFilter].forEach((filter) => filter?.addEventListener('change', renderRows));
  searchFilter?.addEventListener('input', renderRows);
  selectAll?.addEventListener('change', () => {
    for (const item of filteredItems()) {
      if (selectAll.checked) selectedIds.add(String(item.id));
      else selectedIds.delete(String(item.id));
    }
    renderRows();
  });

  const saved = sessionStorage.getItem(storageKey);
  if (view === 'login') {
    if (saved) window.location.replace(inboxPath);
    else {
      const reason = new URLSearchParams(window.location.search).get('reason');
      if (reason) announce(reason, 'error');
    }
  } else if (!saved) {
    window.location.replace(loginPath);
  } else {
    try {
      const session = JSON.parse(saved);
      if (session.refresh_token && session.access_token) {
        activeSession = session;
        loadInbox().catch((error) => {
          activeSession = null;
          sessionStorage.removeItem(storageKey);
          const reason = encodeURIComponent(error instanceof Error ? error.message : 'Please sign in again.');
          window.location.replace(`${loginPath}?reason=${reason}`);
        });
      } else {
        sessionStorage.removeItem(storageKey);
        window.location.replace(loginPath);
      }
    } catch {
      sessionStorage.removeItem(storageKey);
      window.location.replace(loginPath);
    }
  }
}
