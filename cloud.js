(() => {
  const STORAGE_KEY = 'tailg-foundation-v1';
  const REVISION_KEY = 'tailg-cloud-revision-v2';
  const nativeSetItem = Storage.prototype.setItem;

  let cloudAvailable = false;
  let applyingRemote = false;
  let pushTimer = null;
  let pollTimer = null;
  let syncing = false;
  let lastLocalRaw = localStorage.getItem(STORAGE_KEY);
  let pendingDeletedIds = new Set();

  function updateModeChip(label) {
    const chip = document.querySelector('.mode-chip');
    if (!chip) return;
    const text = label || (cloudAvailable ? 'Cloud sync · 7 tài khoản' : 'Dữ liệu cục bộ V1');
    chip.innerHTML = `<span class="status-dot"></span> ${text}`;
  }

  function parseState(raw) {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  function sameDomainData(a, b) {
    if (!a || !b) return false;
    return JSON.stringify(a.logs || []) === JSON.stringify(b.logs || []) &&
      JSON.stringify(a.foundations || {}) === JSON.stringify(b.foundations || {});
  }

  function deletedBetween(previousRaw, nextRaw) {
    const previous = parseState(previousRaw);
    const next = parseState(nextRaw);
    if (!previous?.logs || !next?.logs) return [];
    const nextIds = new Set(next.logs.map(log => log.id));
    return previous.logs.map(log => log.id).filter(id => id && !nextIds.has(id));
  }

  function currentRevision() {
    return Number(sessionStorage.getItem(REVISION_KEY) || 0);
  }

  function setRevision(value) {
    sessionStorage.setItem(REVISION_KEY, String(Number(value || 0)));
  }

  async function api(method, body) {
    const response = await fetch('/api/state', {
      method,
      cache: 'no-store',
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });

    if (response.status === 503) {
      const error = new Error('Cloud database is not configured');
      error.code = 'NOT_CONFIGURED';
      throw error;
    }
    if (!response.ok) throw new Error(`Cloud sync failed: ${response.status}`);
    return response.json();
  }

  function buildPayload(raw) {
    const state = parseState(raw);
    if (!state) return null;
    const carried = Array.isArray(state.syncMeta?.deletedLogIds) ? state.syncMeta.deletedLogIds : [];
    state.syncMeta = {
      ...(state.syncMeta || {}),
      deletedLogIds: [...new Set([...carried, ...pendingDeletedIds])]
    };
    return state;
  }

  function canApplyRemote() {
    return !document.querySelector('dialog[open]') && !document.querySelector('input:focus, textarea:focus, select:focus');
  }

  function applyRemoteState(remoteState) {
    if (!remoteState || !canApplyRemote()) return false;
    const remoteRaw = JSON.stringify(remoteState);
    const localRaw = localStorage.getItem(STORAGE_KEY);
    if (remoteRaw === localRaw) {
      setRevision(remoteState.syncMeta?.revision || 0);
      return true;
    }

    applyingRemote = true;
    nativeSetItem.call(localStorage, STORAGE_KEY, remoteRaw);
    applyingRemote = false;
    lastLocalRaw = remoteRaw;
    setRevision(remoteState.syncMeta?.revision || 0);
    location.reload();
    return true;
  }

  async function pushState(raw) {
    if (!cloudAvailable || applyingRemote || syncing) return;
    const payload = buildPayload(raw);
    if (!payload) return;

    syncing = true;
    updateModeChip('Đang đồng bộ…');
    try {
      const result = await api('PUT', payload);
      pendingDeletedIds.clear();
      cloudAvailable = true;

      const merged = result?.state;
      if (merged?.syncMeta?.revision != null) setRevision(merged.syncMeta.revision);
      updateModeChip();

      // Nếu API vừa hợp nhất thêm dữ liệu của thiết bị khác, kéo bản hợp nhất về ngay.
      const local = parseState(localStorage.getItem(STORAGE_KEY));
      if (merged && !sameDomainData(local, merged)) {
        setTimeout(() => applyRemoteState(merged), 0);
      }
    } catch (error) {
      cloudAvailable = error.code !== 'NOT_CONFIGURED' ? cloudAvailable : false;
      updateModeChip(cloudAvailable ? 'Cloud tạm gián đoạn' : 'Dữ liệu cục bộ V1');
    } finally {
      syncing = false;
    }
  }

  Storage.prototype.setItem = function(key, value) {
    const isTailgLocal = this === window.localStorage && key === STORAGE_KEY;
    if (isTailgLocal && !applyingRemote) {
      deletedBetween(lastLocalRaw, value).forEach(id => pendingDeletedIds.add(id));
      lastLocalRaw = value;
    }

    nativeSetItem.call(this, key, value);

    if (isTailgLocal && !applyingRemote) {
      clearTimeout(pushTimer);
      pushTimer = setTimeout(() => {
        pushTimer = null;
        pushState(value);
      }, 350);
    }
  };

  async function hydrate() {
    try {
      const result = await api('GET');
      cloudAvailable = true;
      window.TAILG_CLOUD = true;
      updateModeChip();

      const remote = result?.state || null;
      const localRaw = localStorage.getItem(STORAGE_KEY);
      const local = parseState(localRaw);

      if (!remote) {
        if (local?.logs?.length || Object.keys(local?.foundations || {}).length) {
          await pushState(localRaw);
        }
        startPolling();
        return;
      }

      // Nếu thiết bị đang có dữ liệu cục bộ, gửi lên trước để API hợp nhất rồi mới kéo
      // trạng thái chuẩn về. Nhờ vậy dữ liệu nhập khi mất mạng không bị bỏ mất.
      if (local && !sameDomainData(local, remote)) {
        const merged = await api('PUT', buildPayload(localRaw));
        pendingDeletedIds.clear();
        if (merged?.state) {
          applyRemoteState(merged.state);
          startPolling();
          return;
        }
      }

      setRevision(remote.syncMeta?.revision || 0);
      applyRemoteState(remote);
      startPolling();
    } catch {
      cloudAvailable = false;
      updateModeChip('Dữ liệu cục bộ V1');
    }
  }

  async function poll() {
    if (!cloudAvailable || syncing || pushTimer || !canApplyRemote()) return;
    try {
      const result = await api('GET');
      const remote = result?.state;
      if (!remote) return;
      const revision = Number(remote.syncMeta?.revision || 0);
      if (revision > currentRevision()) applyRemoteState(remote);
    } catch {
      updateModeChip('Cloud tạm gián đoạn');
    }
  }

  function startPolling() {
    clearInterval(pollTimer);
    pollTimer = setInterval(poll, 8000);
  }

  window.addEventListener('online', () => {
    if (!cloudAvailable) hydrate();
    else poll();
  });
  window.addEventListener('focus', poll);
  window.addEventListener('DOMContentLoaded', () => updateModeChip());

  hydrate();
})();
