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

  async function pushState(raw) {
    if (!cloudAvailable || applyingRemote || syncing) return;
    const payload = buildPayload(raw);
    if (!payload) return;

    syncing = true;
    updateModeChip('Đang đồng bộ…');
    try {
      const result = await api('PUT', payload);
      pendingDeletedIds.clear();
      if (result?.state?.syncMeta?.revision != null) {
        setRevision(result.state.syncMeta.revision);
      }
      cloudAvailable = true;
      updateModeChip();
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
      pushTimer = setTimeout(() => pushState(value), 350);
    }
  };

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

      // Khi thiết bị có dữ liệu cục bộ chưa từng lên cloud, gửi lên để API hợp nhất
      // trước khi kéo trạng thái chuẩn về. Nhờ vậy đổi thiết bị không làm mất báo cáo.
      if (local && localRaw !== JSON.stringify(remote)) {
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
    } catch (error) {
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
