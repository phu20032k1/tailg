(() => {
  const STORAGE_KEY = 'tailg-foundation-v1';
  const HYDRATE_KEY = 'tailg-cloud-hydrated-v1';
  const nativeSetItem = Storage.prototype.setItem;
  let cloudAvailable = false;
  let pushTimer = null;

  function updateModeChip() {
    const chip = document.querySelector('.mode-chip');
    if (!chip) return;
    chip.innerHTML = cloudAvailable
      ? '<span class="status-dot"></span> Cloud sync · Vercel Redis'
      : '<span class="status-dot"></span> Dữ liệu cục bộ V1';
  }

  async function pushState(value) {
    if (!cloudAvailable) return;
    try {
      const res = await fetch('/api/state', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: value
      });
      if (!res.ok) throw new Error('sync failed');
    } catch {
      cloudAvailable = false;
      updateModeChip();
    }
  }

  Storage.prototype.setItem = function(key, value) {
    nativeSetItem.call(this, key, value);
    if (this === window.localStorage && key === STORAGE_KEY) {
      clearTimeout(pushTimer);
      pushTimer = setTimeout(() => pushState(value), 250);
    }
  };

  async function hydrate() {
    try {
      const res = await fetch('/api/state', { cache: 'no-store' });
      if (res.status === 503) {
        cloudAvailable = false;
        updateModeChip();
        return;
      }
      if (!res.ok) throw new Error('cloud unavailable');
      cloudAvailable = true;
      window.TAILG_CLOUD = true;
      updateModeChip();
      const payload = await res.json();
      if (payload?.state && !sessionStorage.getItem(HYDRATE_KEY)) {
        nativeSetItem.call(localStorage, STORAGE_KEY, JSON.stringify(payload.state));
        sessionStorage.setItem(HYDRATE_KEY, '1');
        location.reload();
      } else {
        sessionStorage.setItem(HYDRATE_KEY, '1');
      }
    } catch {
      cloudAvailable = false;
      updateModeChip();
    }
  }

  window.addEventListener('DOMContentLoaded', updateModeChip);
  hydrate();
})();
