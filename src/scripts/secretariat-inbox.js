const root = document.querySelector('[data-secretariat]');

if (root instanceof HTMLElement) {
  const baseUrl = (root.dataset.endpoint || '').replace(/\/$/, '');
  const apiKey = root.dataset.apiKey || '';
  const view = root.dataset.view || 'login';
  const loginPath = root.dataset.loginPath || '/secretariat';
  const inboxPath = root.dataset.inboxPath || '/secretariat/inbox';
  const storageKey = 'ymr-team-session-secretariat';
  const form = root.querySelector('[data-login]');
  const status = root.querySelector('[data-status]');
  const records = root.querySelector('[data-records]');
  const logoutButton = root.querySelector('[data-logout]');
  const tabs = [...root.querySelectorAll('[data-reg-tab]')];
  const tableHead = root.querySelector('[data-head]');
  const rows = root.querySelector('[data-rows]');
  const downloadButton = root.querySelector('[data-download]');
  const selectAllToggle = root.querySelector('[data-select-all]');
  const dateFrom = root.querySelector('[data-date-from]');
  const dateTo = root.querySelector('[data-date-to]');
  const searchFilter = root.querySelector('[data-search]');
  const tableWrap = root.querySelector('[role="tabpanel"]');
  const tables = {
    pastors: {
      label: 'Pastors & Ministry Heads', table: 'pastor_registrations',
      fields: ['id', 'created_at', 'full_name', 'contact_person', 'contact_information', 'email', 'denomination_church', 'arrival_date', 'departure_date', 'quarters_assistance', 'nights', 'accompanying_people', 'comments'],
      columns: [['created_at', 'Received'], ['full_name', 'Full name'], ['contact_person', 'Contact person'], ['contact_information', 'Phone'], ['email', 'Email'], ['denomination_church', 'Denomination / church'], ['arrival_date', 'Arrival'], ['departure_date', 'Departure'], ['quarters_assistance', 'Pastor quarters'], ['nights', 'Nights'], ['accompanying_people', 'People accompanying'], ['comments', 'Comments']],
      displayColumns: [['full_name', 'Name'], ['contact_information', 'Phone number'], ['email', 'Email address']],
    },
    campus: {
      label: 'Campus Leaders', table: 'campus_leader_registrations',
      fields: ['id', 'created_at', 'full_name', 'phone_number', 'email', 'school_name', 'fellowship_name'],
      columns: [['created_at', 'Received'], ['full_name', 'Full name'], ['phone_number', 'Phone'], ['email', 'Email'], ['school_name', 'School'], ['fellowship_name', 'Campus fellowship']],
      displayColumns: [['full_name', 'Name'], ['phone_number', 'Phone number'], ['email', 'Email address']],
    },
    delegates: {
      label: 'Delegates', table: 'delegate_registrations',
      fields: ['id', 'created_at', 'full_name', 'phone_number', 'email', 'origin_city', 'arrival_date', 'arrival_time', 'airport_pickup', 'departure_at', 'airport_dropoff', 'accommodation_preference', 'next_of_kin_name', 'next_of_kin_phone', 'comments'],
      columns: [['created_at', 'Received'], ['full_name', 'Full name'], ['phone_number', 'Phone'], ['email', 'Email'], ['origin_city', 'Travelling from'], ['arrival_date', 'Arrival date'], ['arrival_time', 'Arrival time'], ['airport_pickup', 'Airport pick-up'], ['departure_at', 'Departure date & time'], ['airport_dropoff', 'Airport drop-off'], ['accommodation_preference', 'Accommodation'], ['next_of_kin_name', 'Next of kin'], ['next_of_kin_phone', 'Next of kin phone'], ['comments', 'Comments']],
      displayColumns: [['full_name', 'Name'], ['phone_number', 'Phone number'], ['email', 'Email address']],
    },
    viewing: {
      label: 'Viewing Centre Hosts', table: 'viewing_centre_interests',
      fields: ['id', 'created_at', 'host_name', 'contact', 'email', 'location_scope', 'country', 'geopolitical_zone', 'exact_address'],
      columns: [['created_at', 'Received'], ['host_name', 'Host name'], ['contact', 'Contact'], ['email', 'Email'], ['location_scope', 'Location'], ['country', 'Country'], ['geopolitical_zone', 'Geopolitical zone'], ['exact_address', 'Exact address']],
      displayColumns: [['host_name', 'Host name'], ['contact', 'Phone number'], ['email', 'Email address']],
    },
  };
  let activeSession = null;
  let activeTab = 'pastors';
  let allItems = [];
  let loaded = new Map();
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
      method: 'POST', headers: { apikey: apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: activeSession.refresh_token }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.access_token) {
      activeSession = null;
      sessionStorage.removeItem(storageKey);
      throw new Error('Your session expired. Please sign in again.');
    }
    storeSession({ access_token: payload.access_token, refresh_token: payload.refresh_token, expires_at: Date.now() + (payload.expires_in || 3600) * 1000 });
  };
  const request = async (path) => {
    if (!activeSession?.access_token) throw new Error('Please sign in again to continue.');
    if (activeSession.expires_at <= Date.now() + 60_000) await refreshSession();
    const response = await fetch(`${baseUrl}${path}`, { headers: { apikey: apiKey, Authorization: `Bearer ${activeSession.access_token}` } });
    if (!response.ok) {
      if (response.status === 401) { activeSession = null; sessionStorage.removeItem(storageKey); }
      const body = await response.json().catch(() => ({}));
      throw new Error(response.status === 401 ? 'Your session expired. Please sign in again.' : body.message || body.msg || 'Unable to load registrations.');
    }
    return response.status === 204 ? null : response.json();
  };
  const cell = (value) => {
    const td = document.createElement('td');
    if (value == null) td.textContent = '';
    else if (typeof value === 'string' && value.includes('T') && !Number.isNaN(Date.parse(value))) td.textContent = new Date(value).toLocaleString();
    else td.textContent = String(value);
    return td;
  };
  const filteredItems = () => {
    const from = dateFrom?.value || '';
    const to = dateTo?.value || '';
    const query = (searchFilter?.value || '').trim().toLocaleLowerCase();
    return allItems.filter((item) => {
      const createdAt = item.created_at ? new Date(item.created_at) : null;
      const receivedDate = createdAt && !Number.isNaN(createdAt.valueOf())
        ? `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}-${String(createdAt.getDate()).padStart(2, '0')}` : '';
      if (from && (!receivedDate || receivedDate < from)) return false;
      if (to && (!receivedDate || receivedDate > to)) return false;
      return !query || Object.values(item).some((value) => String(value ?? '').toLocaleLowerCase().includes(query));
    });
  };
  const updateSelection = (visibleItems) => {
    const visibleIds = visibleItems.map((item) => String(item.id));
    if (selectAllToggle instanceof HTMLInputElement) {
      const selectedVisible = visibleIds.filter((id) => selectedIds.has(id)).length;
      selectAllToggle.checked = visibleIds.length > 0 && selectedVisible === visibleIds.length;
      selectAllToggle.indeterminate = selectedVisible > 0 && selectedVisible < visibleIds.length;
    }
    if (downloadButton instanceof HTMLButtonElement) {
      downloadButton.textContent = selectedIds.size ? `Download selected (${selectedIds.size})` : 'Download all matching';
      downloadButton.disabled = selectedIds.size === 0 && visibleItems.length === 0;
    }
  };
  const renderRows = () => {
    if (!(rows instanceof HTMLElement) || !(tableHead instanceof HTMLElement)) return;
    const items = filteredItems();
    const config = tables[activeTab];
    tableHead.replaceChildren();
    const headerRow = document.createElement('tr');
    const selectHeading = document.createElement('th');
    selectHeading.setAttribute('aria-label', 'Select response');
    headerRow.append(selectHeading);
    for (const [, label] of config.displayColumns) {
      const th = document.createElement('th');
      th.textContent = label;
      headerRow.append(th);
    }
    tableHead.append(headerRow);
    rows.replaceChildren();
    for (const item of items) {
      const tr = document.createElement('tr');
      const selectCell = document.createElement('td');
      selectCell.dataset.label = 'Select response';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = selectedIds.has(String(item.id));
      checkbox.setAttribute('aria-label', `Select ${config.label} response from ${item.full_name || 'unknown name'}`);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) selectedIds.add(String(item.id));
        else selectedIds.delete(String(item.id));
        renderRows();
      });
      selectCell.append(checkbox);
      tr.append(selectCell);
      for (const [key, label] of config.displayColumns) {
        const td = document.createElement('td');
        td.dataset.label = label;
        const value = item[key] == null ? '' : String(item[key]);
        const valueText = document.createElement('span');
        valueText.textContent = value;
        td.append(valueText);
        tr.append(td);
      }
      rows.append(tr);
    }
    if (!items.length) {
      const tr = document.createElement('tr');
      const td = cell(allItems.length ? 'No registrations match these filters.' : 'No registrations have been received yet.');
      td.colSpan = config.displayColumns.length + 1;
      tr.append(td);
      rows.append(tr);
    }
    if (tableWrap) tableWrap.setAttribute('aria-labelledby', `tab-${activeTab}`);
    updateSelection(items);
  };
  const fetchRows = async (config) => {
    const fields = config.fields.map(encodeURIComponent).join(',');
    const result = [];
    const pageSize = 500;
    for (let offset = 0; ; offset += pageSize) {
      const batch = await request(`/rest/v1/${config.table}?select=${fields}&order=created_at.desc&limit=${pageSize}&offset=${offset}`);
      result.push(...batch);
      if (batch.length < pageSize) break;
    }
    return result;
  };
  const loadTab = async (key, force = false) => {
    const config = tables[key];
    activeTab = key;
    selectedIds.clear();
    tabs.forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.regTab === key)));
    if (tableHead) tableHead.replaceChildren();
    if (rows) rows.replaceChildren();
    try {
      allItems = !force && loaded.has(key) ? loaded.get(key) : await fetchRows(config);
      loaded.set(key, allItems);
      renderRows();
      announce('');
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unable to load registrations.';
      announce(reason, 'error');
      if (reason.includes('session expired') || reason.includes('sign in again')) {
        activeSession = null;
        sessionStorage.removeItem(storageKey);
        window.location.replace(`${loginPath}?reason=${encodeURIComponent(reason)}`);
      }
    }
  };
  const csvValue = (value) => {
    const text = String(value ?? '');
    const safeText = /^[\s\u0000-\u001f]*[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safeText.replaceAll('"', '""')}"`;
  };
  const downloadCsv = (items, label) => {
    const config = tables[activeTab];
    if (!items.length) { announce(label === 'selected' ? 'Select at least one registration to download.' : 'No matching registrations to download.', 'error'); return; }
    const headers = config.columns.map(([key]) => key);
    const csv = [config.columns.map(([, heading]) => csvValue(heading)).join(','), ...items.map((item) => headers.map((key) => csvValue(item[key])).join(','))].join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = `ymr-${activeTab}-registrations-${label}-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(href), 1000);
    announce(`Downloaded ${items.length} ${config.label.toLocaleLowerCase()}.`, 'success');
  };
  const loadInbox = async () => {
    const membership = await request('/rest/v1/team_access?select=team&team=eq.secretariat&limit=1');
    if (!membership.length) throw new Error('This account is not assigned to the Secretariat. Contact the YMR site administrator.');
    if (records) records.hidden = false;
    if (logoutButton) logoutButton.hidden = false;
    await loadTab('pastors');
  };
  const login = async (email, password) => {
    if (!baseUrl || !apiKey) throw new Error('The Secretariat inbox is not configured. Contact the YMR site administrator.');
    const response = await fetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST', headers: { apikey: apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.access_token) throw new Error('Sign-in failed. Check your details or contact the YMR site administrator.');
    storeSession({ access_token: payload.access_token, refresh_token: payload.refresh_token, expires_at: Date.now() + (payload.expires_in || 3600) * 1000 });
    window.location.replace(inboxPath);
  };

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const submit = form.querySelector('button[type="submit"]');
    if (submit instanceof HTMLButtonElement) submit.disabled = true;
    announce('Signing in…');
    try { await login(String(data.get('email') || '').trim(), String(data.get('password') || '')); }
    catch (error) { activeSession = null; sessionStorage.removeItem(storageKey); announce(error instanceof Error ? error.message : 'Unable to sign in.', 'error'); }
    finally { if (submit instanceof HTMLButtonElement) submit.disabled = false; }
  });
  logoutButton?.addEventListener('click', async () => {
    const accessToken = activeSession?.access_token;
    activeSession = null;
    sessionStorage.removeItem(storageKey);
    loaded.clear();
    if (accessToken && baseUrl && apiKey) {
      try { await fetch(`${baseUrl}/auth/v1/logout`, { method: 'POST', headers: { apikey: apiKey, Authorization: `Bearer ${accessToken}` } }); } catch { /* Local sign-out still completes offline. */ }
    }
    window.location.replace(loginPath);
  });
  tabs.forEach((tab) => tab.addEventListener('click', () => loadTab(tab.dataset.regTab || 'pastors')));
  selectAllToggle?.addEventListener('change', () => {
    if (!(selectAllToggle instanceof HTMLInputElement)) return;
    for (const item of filteredItems()) {
      if (selectAllToggle.checked) selectedIds.add(String(item.id));
      else selectedIds.delete(String(item.id));
    }
    renderRows();
  });
  downloadButton?.addEventListener('click', () => {
    const selected = allItems.filter((item) => selectedIds.has(String(item.id)));
    downloadCsv(selected.length ? selected : filteredItems(), selected.length ? 'selected' : 'matching');
  });
  [dateFrom, dateTo].forEach((filter) => filter?.addEventListener('change', renderRows));
  searchFilter?.addEventListener('input', renderRows);

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
