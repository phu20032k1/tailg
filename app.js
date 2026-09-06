(() => {
  const STORAGE_KEY = 'tailg-foundation-v1';
  const SESSION_KEY = 'tailg-session-v1';
  const DEMO_PIN = '123456';

  const ACCOUNTS = [
    { id: 'tung', username: 'tung', name: 'Phan Viết Tùng', short: 'P.Tùng', role: 'commander', roleLabel: 'Chỉ huy trưởng', areas: ['all'] },
    { id: 'duc', username: 'duc', name: 'Bùi Văn Đức', short: 'B.V.Đức', role: 'leader', roleLabel: 'Đội trưởng', areas: ['x1-duc', 'x2-duc'] },
    { id: 'toan', username: 'toan', name: 'Tăng Văn Toán', short: 'T.V.Toán', role: 'leader', roleLabel: 'Đội trưởng', areas: ['x1-toan'] },
    { id: 'toan-tran', username: 'toan-tran', name: 'Trần Văn Toãn', short: 'T.V.Toãn', role: 'leader', roleLabel: 'Đội trưởng', areas: ['x1-toan-tran'] },
    { id: 'tuan', username: 'tuan', name: 'Nguyễn Văn Tuần', short: 'N.V.Tuần', role: 'leader', roleLabel: 'Đội trưởng', areas: ['x1-tuan'] },
    { id: 'quang', username: 'quang', name: 'Nguyễn Ánh Quang', short: 'N.A.Quang', role: 'leader', roleLabel: 'Đội trưởng', areas: ['x3-quang', 'nha-an', 'nha-xe', 'be-ngam', 'be-xlnt'] },
    { id: 'tho', username: 'tho', name: 'Nguyễn Duy Thọ', short: 'N.D.Thọ', role: 'leader', roleLabel: 'Đội trưởng', areas: ['x3-tho', 'ha-tang'] }
  ];

  const ZONES = [
    { id: 'x1-duc', name: 'Xưởng 1 · Khu Đức', group: 'Xưởng 1', ownerId: 'duc', scope: '1/4 Xưởng 1', baseline: 92, color: 'red' },
    { id: 'x1-toan', name: 'Xưởng 1 · Khu Toán', group: 'Xưởng 1', ownerId: 'toan', scope: '1/4 Xưởng 1', baseline: 92, color: 'red' },
    { id: 'x1-toan-tran', name: 'Xưởng 1 · Khu Toãn', group: 'Xưởng 1', ownerId: 'toan-tran', scope: '1/4 Xưởng 1', baseline: 85, color: 'red' },
    { id: 'x1-tuan', name: 'Xưởng 1 · Khu Tuần', group: 'Xưởng 1', ownerId: 'tuan', scope: '1/4 Xưởng 1', baseline: 85, color: 'red' },
    { id: 'x2-duc', name: 'Xưởng 2', group: 'Xưởng 2', ownerId: 'duc', scope: 'Xưởng 2', baseline: 15, color: 'blue' },
    { id: 'x3-quang', name: 'Xưởng 3 · Khu Quang', group: 'Xưởng 3', ownerId: 'quang', scope: '1/2 Xưởng 3', baseline: 0, color: 'blue' },
    { id: 'x3-tho', name: 'Xưởng 3 · Khu Thọ', group: 'Xưởng 3', ownerId: 'tho', scope: '1/2 Xưởng 3', baseline: 0, color: 'blue' },
    { id: 'nha-an', name: 'Nhà ăn', group: 'Phụ trợ', ownerId: 'quang', scope: 'Nhà ăn', baseline: 0, color: 'green' },
    { id: 'nha-xe', name: 'Nhà xe', group: 'Phụ trợ', ownerId: 'quang', scope: 'Nhà xe', baseline: 83.4, color: 'green' },
    { id: 'be-ngam', name: 'Bể ngầm', group: 'Phụ trợ', ownerId: 'quang', scope: 'Bể ngầm', baseline: 0, color: 'green' },
    { id: 'be-xlnt', name: 'Bể XLNT', group: 'Phụ trợ', ownerId: 'quang', scope: 'Bể xử lý nước thải', baseline: 0, color: 'green' },
    { id: 'ha-tang', name: 'Hạ tầng', group: 'Hạ tầng', ownerId: 'tho', scope: 'Hạ tầng', baseline: 0, color: 'amber' }
  ];

  const SCHEDULE = [
    { label: 'Móng Xưởng 1', start: '2026-07-16', finish: '2026-09-07', note: 'Công tác móng' },
    { label: 'BT móng + dầm móng Xưởng 1', start: '2026-07-25', finish: '2026-09-07', note: 'Cốt thép, cốp pha, bê tông' },
    { label: 'Móng Xưởng 2 + 3', start: '2026-08-29', finish: '2026-11-08', note: 'Công tác móng' },
    { label: 'BT móng + dầm móng Xưởng 2 + 3', start: '2026-09-10', finish: '2026-11-08', note: 'Cốt thép, cốp pha, bê tông' }
  ];

  const initialState = () => ({
    version: 1,
    logs: [],
    foundations: {},
    createdAt: new Date().toISOString()
  });

  let state = loadState();
  let currentUser = getSessionUser();
  let currentPage = 'overview';

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = (v = '') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const accountById = id => ACCOUNTS.find(a => a.id === id);
  const zoneById = id => ZONES.find(z => z.id === id);
  const localDate = d => new Intl.DateTimeFormat('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' }).format(new Date(d + (d.length === 10 ? 'T12:00:00' : '')));
  const todayISO = () => {
    const d = new Date();
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0,10);
  };
  const initials = name => name.split(' ').filter(Boolean).slice(-2).map(x => x[0]).join('').toUpperCase();
  const pct = n => Number(n || 0).toLocaleString('vi-VN', { maximumFractionDigits: 1 });

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || initialState(); }
    catch { return initialState(); }
  }
  function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function getSessionUser() {
    const id = sessionStorage.getItem(SESSION_KEY);
    return ACCOUNTS.find(a => a.id === id) || null;
  }
  function setSession(user) {
    currentUser = user;
    if (user) sessionStorage.setItem(SESSION_KEY, user.id); else sessionStorage.removeItem(SESSION_KEY);
  }
  function toast(message, type = 'success') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    $('#toastRoot').appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  function getZoneProgress(zoneId) {
    const last = state.logs
      .filter(l => l.zoneId === zoneId && Number.isFinite(Number(l.progress)))
      .sort((a,b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt))[0];
    return last ? Number(last.progress) : Number(zoneById(zoneId)?.baseline || 0);
  }

  function getTeamProgress(userId) {
    const user = accountById(userId);
    const areas = user?.areas || [];
    if (!areas.length) return 0;
    const vals = areas.map(getZoneProgress);
    return vals.reduce((a,b)=>a+b,0) / vals.length;
  }

  function getWorkersOn(date, userId = null) {
    const logs = state.logs.filter(l => l.date === date && (!userId || l.leaderId === userId));
    const byLeader = new Map();
    logs.forEach(l => byLeader.set(l.leaderId, Math.max(byLeader.get(l.leaderId) || 0, Number(l.workers || 0))));
    return [...byLeader.values()].reduce((a,b)=>a+b,0);
  }

  function getLatestLog(userId) {
    return state.logs.filter(l => l.leaderId === userId).sort((a,b) => (b.date+b.createdAt).localeCompare(a.date+a.createdAt))[0] || null;
  }

  function foundationsForUser(userId) {
    return Object.values(state.foundations).filter(f => f.ownerId === userId).sort((a,b)=>a.name.localeCompare(b.name,'vi',{numeric:true}));
  }

  function parseFoundationNames(raw) {
    return [...new Set(raw.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean).map(s => s.toUpperCase()))];
  }

  function initLogin() {
    const select = $('#accountSelect');
    select.innerHTML = ACCOUNTS.map(a => `<option value="${a.id}">${esc(a.name)} · ${a.roleLabel}</option>`).join('');
    $('#togglePin').addEventListener('click', () => {
      const p = $('#pinInput'); p.type = p.type === 'password' ? 'text' : 'password';
    });
    $('#loginForm').addEventListener('submit', e => {
      e.preventDefault();
      const user = accountById(select.value);
      if ($('#pinInput').value !== DEMO_PIN) return toast('PIN không đúng. Bản demo dùng PIN 123456.', 'error');
      setSession(user);
      $('#pinInput').value = '';
      bootApp();
    });
  }

  function bootApp() {
    if (!currentUser) {
      $('#loginView').classList.remove('hidden');
      $('#appView').classList.add('hidden');
      return;
    }
    $('#loginView').classList.add('hidden');
    $('#appView').classList.remove('hidden');
    $('#userName').textContent = currentUser.name;
    $('#userRole').textContent = currentUser.roleLabel;
    $('#userAvatar').textContent = initials(currentUser.name);
    $('#todayLabel').textContent = new Intl.DateTimeFormat('vi-VN', { weekday:'short', day:'2-digit', month:'2-digit', year:'numeric' }).format(new Date());
    currentPage = 'overview';
    renderNav();
    renderPage();
  }

  function renderNav() {
    const navItems = currentUser.role === 'commander'
      ? [
        ['overview','⌂','Tổng quan'],['map','▦','Mặt bằng tiến độ'],['teams','👷','6 đội thi công'],['logs','≡','Nhật ký công việc'],['foundations','⌗','Danh mục móng'],['data','↥','Dữ liệu']
      ]
      : [
        ['overview','⌂','Tổng quan đội'],['report','＋','Nhập báo cáo'],['map','▦','Khu vực của tôi'],['logs','≡','Lịch sử nhập'],['foundations','⌗','Móng của tôi']
      ];
    $('#sideNav').innerHTML = navItems.map(([id,ic,label]) => `<button class="nav-item ${currentPage===id?'active':''}" data-page="${id}"><span class="nav-icon">${ic}</span>${label}</button>`).join('');
    $$('.nav-item').forEach(btn => btn.addEventListener('click', () => {
      const p = btn.dataset.page;
      if (p === 'report') { openReport(); return; }
      currentPage = p; renderNav(); renderPage();
      $('#sidebar').classList.remove('open');
    }));
  }

  function renderPage() {
    const titles = {overview:'Tổng quan',map:'Mặt bằng tiến độ',teams:'Đội thi công',logs:'Nhật ký công việc',foundations:'Danh mục móng',data:'Dữ liệu'};
    $('#pageTitle').textContent = currentUser.role === 'leader' && currentPage === 'overview' ? `Đội ${currentUser.short}` : (titles[currentPage] || 'TAILG');
    $('#breadcrumb').textContent = currentUser.role === 'commander' ? 'CHỈ HUY TRƯỞNG · PHAN VIẾT TÙNG' : `ĐỘI TRƯỞNG · ${currentUser.name}`;
    const renderers = {overview: currentUser.role === 'commander' ? renderCommanderOverview : renderLeaderOverview, map: renderMapPage, teams: renderTeamsPage, logs: renderLogsPage, foundations: renderFoundationsPage, data: renderDataPage};
    (renderers[currentPage] || renderers.overview)();
  }

  function hero(title, subtitle, actions = '') {
    return `<div class="hero-strip"><div><span class="eyebrow">GIAI ĐOẠN HIỆN TẠI · MÓNG</span><h3>${title}</h3><p>${subtitle}</p></div><div class="hero-actions">${actions}</div></div>`;
  }

  function kpi(label, value, meta, icon) {
    return `<div class="kpi-card"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div><div class="kpi-meta">${meta}</div><div class="kpi-icon">${icon}</div></div>`;
  }

  function renderCommanderOverview() {
    const workers = getWorkersOn(todayISO());
    const avg = ZONES.reduce((a,z)=>a+getZoneProgress(z.id),0)/ZONES.length;
    const teamsUpdated = ACCOUNTS.filter(a=>a.role==='leader' && state.logs.some(l=>l.leaderId===a.id && l.date===todayISO())).length;
    const content = `
      ${hero('Bảng điều hành công trường', '6 đội nhập dữ liệu → tự động tổng hợp về tài khoản Chỉ huy trưởng.', '<button class="btn btn-primary" id="quickReportBtn">+ Nhập hộ báo cáo</button>')}
      <div class="kpi-grid">
        ${kpi('Nhân công hôm nay', workers, 'Tổng từ 6 đội', '👷')}
        ${kpi('Đội đã báo cáo', `${teamsUpdated}/6`, teamsUpdated===6?'Đủ dữ liệu trong ngày':'Còn đội chưa cập nhật', '✓')}
        ${kpi('Móng đã khai báo', Object.keys(state.foundations).length, 'Không trùng chủ quản', '⌗')}
        ${kpi('Tiến độ bình quân', `${pct(avg)}%`, 'Theo % mới nhất từng khu vực', '◔')}
      </div>
      <div class="grid-main">
        <div class="panel">
          <div class="panel-head"><div><h4>Mặt bằng tiến độ theo đội</h4><p>Bấm vào từng khu vực để xem chi tiết.</p></div><span class="panel-badge">LIVE V1</span></div>
          <div class="panel-body">${renderSiteMap()}</div>
        </div>
        <div class="panel">
          <div class="panel-head"><div><h4>6 đội thi công</h4><p>Trạng thái cập nhật hôm nay</p></div><span class="panel-badge">6 ĐỘI</span></div>
          <div class="panel-body"><div class="team-list">${renderTeamRows()}</div></div>
        </div>
      </div>
      <div class="two-col section-gap">
        <div class="panel">
          <div class="panel-head"><div><h4>Mốc tiến độ theo biểu tổng</h4><p>Tự tính trạng thái theo ngày hiện tại.</p></div></div>
          <div class="panel-body"><div class="schedule-stack">${renderSchedule()}</div></div>
        </div>
        <div class="panel">
          <div class="panel-head"><div><h4>Cảnh báo dữ liệu</h4><p>Ưu tiên các mục cần Chỉ huy trưởng kiểm tra.</p></div></div>
          <div class="panel-body"><div class="warning-list">${renderWarnings()}</div></div>
        </div>
      </div>
      <div class="panel section-gap">
        <div class="panel-head"><div><h4>Nhật ký gần nhất</h4><p>10 báo cáo mới nhất từ các đội.</p></div><button class="btn btn-secondary" id="seeAllLogs">Xem tất cả</button></div>
        <div class="panel-body">${renderLogsTable(state.logs.slice().sort(sortLogs).slice(0,10), true)}</div>
      </div>`;
    $('#pageContent').innerHTML = content;
    $('#quickReportBtn').addEventListener('click', () => openReport(true));
    $('#seeAllLogs').addEventListener('click', () => { currentPage='logs'; renderNav(); renderPage(); });
    bindMapClicks(); bindDeleteActions();
  }

  function renderLeaderOverview() {
    const progress = getTeamProgress(currentUser.id);
    const todayWorkers = getWorkersOn(todayISO(), currentUser.id);
    const myFoundations = foundationsForUser(currentUser.id);
    const latest = getLatestLog(currentUser.id);
    $('#pageContent').innerHTML = `
      ${hero(`Xin chào, ${esc(currentUser.short)}`, 'Nhập số lượng công nhân và công việc móng hằng ngày. Dữ liệu sẽ được tổng hợp vào bảng điều hành của Chỉ huy trưởng.', '<button class="btn btn-primary" id="leaderReportBtn">+ Nhập báo cáo hôm nay</button>')}
      <div class="panel">
        <div class="panel-body team-hero">
          <div class="progress-ring" style="--p:${Math.min(100,progress)}"><div class="progress-ring-inner"><strong>${pct(progress)}%</strong><span>TIẾN ĐỘ</span></div></div>
          <div><h3>${esc(currentUser.name)}</h3><p>${esc(currentUser.roleLabel)} · phụ trách các khu vực được giao. Một tên móng không được nhận chồng với đội khác.</p><div class="area-chip-row">${currentUser.areas.map(id=>`<span class="area-chip">${esc(zoneById(id).scope)}</span>`).join('')}</div></div>
          <div class="quick-stat"><strong>${todayWorkers}</strong><span>công nhân hôm nay</span></div>
        </div>
      </div>
      <div class="kpi-grid section-gap">
        ${kpi('Móng đang quản lý', myFoundations.length, 'Theo tên móng đã khai báo', '⌗')}
        ${kpi('Báo cáo đã nhập', state.logs.filter(l=>l.leaderId===currentUser.id).length, latest?`Cập nhật gần nhất ${localDate(latest.date)}`:'Chưa có dữ liệu', '≡')}
        ${kpi('Tiến độ đội', `${pct(progress)}%`, 'Theo khu vực phụ trách', '◔')}
        ${kpi('Nhân lực hôm nay', todayWorkers, todayWorkers?'Đã có báo cáo':'Chưa nhập hôm nay', '👷')}
      </div>
      <div class="grid-main">
        <div class="panel"><div class="panel-head"><div><h4>Khu vực của tôi</h4><p>Tiến độ mới nhất theo từng vùng.</p></div></div><div class="panel-body">${renderSiteMap(currentUser.id)}</div></div>
        <div class="panel"><div class="panel-head"><div><h4>Cập nhật gần đây</h4><p>Nhật ký của đội.</p></div></div><div class="panel-body">${renderLeaderTimeline()}</div></div>
      </div>
      <div class="panel section-gap"><div class="panel-head"><div><h4>Móng của đội</h4><p>Danh sách tên móng đã nhận.</p></div><span class="panel-badge">${myFoundations.length} MÓNG</span></div><div class="panel-body">${renderFoundationTiles(myFoundations)}</div></div>`;
    $('#leaderReportBtn').addEventListener('click', () => openReport());
    bindMapClicks();
  }

  function renderSiteMap(filterUserId = null) {
    const allowed = z => !filterUserId || z.ownerId === filterUserId;
    const zoneCard = z => {
      const p = getZoneProgress(z.id); const owner = accountById(z.ownerId);
      return `<div class="zone-card ${z.color}" data-zone="${z.id}" style="${allowed(z)?'':'opacity:.22;pointer-events:none'}"><div class="zone-title">${esc(z.name)}</div><div class="zone-owner">${esc(owner.short)}</div><div class="zone-progress"><div class="zone-progress-row"><span>Tiến độ</span><strong>${pct(p)}%</strong></div><div class="progress-track"><div class="progress-fill" style="width:${Math.min(100,p)}%"></div></div></div></div>`;
    };
    const q = id => zoneById(id);
    return `<div class="site-map">
      <div class="zone-card blue zone-x2" data-zone="x2-duc" style="${allowed(q('x2-duc'))?'':'opacity:.22;pointer-events:none'}"><div class="zone-title">Xưởng 2</div><div class="zone-owner">B.V.Đức · toàn xưởng</div><div class="zone-progress"><div class="zone-progress-row"><span>Tiến độ</span><strong>${pct(getZoneProgress('x2-duc'))}%</strong></div><div class="progress-track"><div class="progress-fill" style="width:${getZoneProgress('x2-duc')}%"></div></div></div></div>
      <div class="zone-card blue zone-x3" data-zone="${allowed(q('x3-quang'))?'x3-quang':'x3-tho'}" style="${filterUserId && !['quang','tho'].includes(filterUserId)?'opacity:.22;pointer-events:none':''}"><div class="zone-title">Xưởng 3</div><div class="zone-owner">Quang 1/2 · Thọ 1/2</div><div class="zone-progress"><div class="zone-progress-row"><span>Bình quân</span><strong>${pct((getZoneProgress('x3-quang')+getZoneProgress('x3-tho'))/2)}%</strong></div><div class="progress-track"><div class="progress-fill" style="width:${(getZoneProgress('x3-quang')+getZoneProgress('x3-tho'))/2}%"></div></div></div></div>
      <div class="zone-x1 zone-card red">
        ${['x1-duc','x1-toan','x1-toan-tran','x1-tuan'].map(id => {const z=q(id),p=getZoneProgress(id),owner=accountById(z.ownerId); return `<div class="x1-quarter" data-zone="${id}" style="${allowed(z)?'':'opacity:.18;pointer-events:none'}"><div class="zone-title">${esc(owner.short)}</div><div class="zone-owner">1/4 Xưởng 1</div><div class="zone-progress"><div class="zone-progress-row"><span>Tiến độ</span><strong>${pct(p)}%</strong></div><div class="progress-track"><div class="progress-fill" style="width:${p}%"></div></div></div></div>`}).join('')}
      </div>
      <div class="zone-aux">
        ${['nha-xe','nha-an','be-ngam','ha-tang'].map(id=>zoneCard(q(id))).join('')}
      </div>
    </div>`;
  }

  function renderTeamRows() {
    return ACCOUNTS.filter(a=>a.role==='leader').map(a => {
      const latest = getLatestLog(a.id); const updated = state.logs.some(l=>l.leaderId===a.id && l.date===todayISO());
      return `<div class="team-row"><div class="avatar">${initials(a.name)}</div><div><strong>${esc(a.name)}</strong><span>${a.areas.map(id=>zoneById(id).scope).join(' · ')}</span><span style="color:${updated?'#6edfb5':'#8da0b5'}">${updated?'● Đã báo cáo hôm nay':'○ Chưa báo cáo hôm nay'}</span></div><div class="team-stats"><b>${pct(getTeamProgress(a.id))}%</b><small>${latest?localDate(latest.date):'chưa có dữ liệu'}</small></div></div>`;
    }).join('');
  }

  function renderSchedule() {
    const now = new Date(todayISO()+'T12:00:00');
    return SCHEDULE.map(s => {
      const start = new Date(s.start+'T12:00:00'), finish = new Date(s.finish+'T12:00:00');
      let status = 'Sắp tới', cls='';
      if (now > finish) { status='Đến/qua hạn'; cls='due'; }
      else if (now >= start) { const days=Math.ceil((finish-now)/86400000); status=`Còn ${days} ngày`; cls=days<=3?'due':''; }
      return `<div class="schedule-card ${cls}"><div class="schedule-icon">▤</div><div><strong>${esc(s.label)}</strong><span>${localDate(s.start)} → ${localDate(s.finish)} · ${esc(s.note)}</span></div><b>${status}</b></div>`;
    }).join('');
  }

  function renderWarnings() {
    const items = [];
    ACCOUNTS.filter(a=>a.role==='leader').forEach(a => {
      if (!state.logs.some(l=>l.leaderId===a.id && l.date===todayISO())) items.push(`<div class="warning-item"><strong>${esc(a.short)}</strong> chưa có báo cáo nhân công/công việc hôm nay.</div>`);
    });
    if (!Object.keys(state.foundations).length) items.push(`<div class="warning-item"><strong>Danh mục móng đang trống.</strong> Hãy bắt đầu nhập tên móng M-01, M-02... theo mặt bằng thực tế.</div>`);
    return items.length ? items.slice(0,6).join('') : `<div class="notice">Không có cảnh báo. Dữ liệu 6 đội đã được cập nhật đầy đủ.</div>`;
  }

  function sortLogs(a,b){ return (b.date+b.createdAt).localeCompare(a.date+a.createdAt); }

  function renderLogsTable(logs, withActions = false) {
    if (!logs.length) return `<div class="empty-state"><div class="empty-icon">≡</div>Chưa có báo cáo nào.</div>`;
    return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Ngày</th><th>Đội trưởng</th><th>Khu vực</th><th>Nhân công</th><th>Công việc</th><th>Tên móng</th><th>%</th>${withActions?'<th></th>':''}</tr></thead><tbody>${logs.map(l => `<tr><td>${localDate(l.date)}</td><td>${esc(accountById(l.leaderId)?.short || l.leaderId)}</td><td>${esc(zoneById(l.zoneId)?.name || l.zoneId)}</td><td><b>${l.workers}</b></td><td><span class="tag">${esc(l.stage)}</span></td><td>${l.foundationNames.map(esc).join(', ')}</td><td><span class="tag green">${pct(l.progress)}%</span></td>${withActions?`<td><button class="table-action" data-delete-log="${l.id}">Xóa</button></td>`:''}</tr>`).join('')}</tbody></table></div>`;
  }

  function renderLeaderTimeline() {
    const logs = state.logs.filter(l=>l.leaderId===currentUser.id).sort(sortLogs).slice(0,6);
    if (!logs.length) return `<div class="empty-state"><div class="empty-icon">＋</div>Chưa có báo cáo. Hãy nhập báo cáo đầu tiên.</div>`;
    return `<div class="timeline">${logs.map(l=>`<div class="timeline-item"><div class="timeline-dot"></div><div><strong>${localDate(l.date)} · ${esc(l.stage)}</strong><span>${l.workers} công nhân · ${esc(zoneById(l.zoneId)?.name)} · ${l.foundationNames.length} móng · ${pct(l.progress)}%</span></div></div>`).join('')}</div>`;
  }

  function renderFoundationTiles(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-icon">⌗</div>Chưa có tên móng. Nhập báo cáo để tạo danh mục móng.</div>`;
    return `<div class="foundation-grid">${list.map(f=>`<div class="foundation-tile"><strong>${esc(f.name)}</strong><span>${esc(zoneById(f.zoneId)?.group || '')}</span><span>${esc(f.stage || '')}</span><div class="mini-progress"><i style="width:${Math.min(100,f.progress||0)}%"></i></div></div>`).join('')}</div>`;
  }

  function renderMapPage() {
    const filter = currentUser.role==='leader'?currentUser.id:null;
    $('#pageContent').innerHTML = `${hero(currentUser.role==='leader'?'Khu vực phụ trách':'Mặt bằng tiến độ tổng hợp', 'Mô phỏng phân khu theo sơ đồ giao việc: Xưởng 1 chia 4 phần, Xưởng 3 chia 2 phần; các hạng mục phụ trợ theo đội phụ trách.')}
      <div class="panel"><div class="panel-head"><div><h4>Sơ đồ phân khu</h4><p>Màu nền giúp phân biệt nhóm hạng mục; % lấy từ báo cáo gần nhất.</p></div><span class="panel-badge">FOUNDATION MAP</span></div><div class="panel-body">${renderSiteMap(filter)}</div></div>
      <div class="three-col section-gap">${(filter?ZONES.filter(z=>z.ownerId===filter):ZONES).map(z=>`<div class="panel"><div class="panel-body"><span class="eyebrow">${esc(z.group)}</span><h4 style="margin:6px 0 8px">${esc(z.name)}</h4><div class="zone-progress-row"><span>${esc(accountById(z.ownerId).name)}</span><strong>${pct(getZoneProgress(z.id))}%</strong></div><div class="progress-track"><div class="progress-fill" style="width:${getZoneProgress(z.id)}%"></div></div></div></div>`).join('')}</div>`;
    bindMapClicks();
  }

  function renderTeamsPage() {
    if (currentUser.role!=='commander') return renderLeaderOverview();
    $('#pageContent').innerHTML = `${hero('6 đội thi công', 'Mỗi đội chỉ nhập các khu vực được giao. Toàn bộ báo cáo được gom về Chỉ huy trưởng.')}
      <div class="three-col">${ACCOUNTS.filter(a=>a.role==='leader').map(a=>{const p=getTeamProgress(a.id),latest=getLatestLog(a.id);return `<div class="panel"><div class="panel-body"><div class="team-row" style="padding:0;border:0;background:transparent"><div class="avatar">${initials(a.name)}</div><div><strong>${esc(a.name)}</strong><span>${a.areas.map(id=>zoneById(id).scope).join(' · ')}</span></div><div class="team-stats"><b>${pct(p)}%</b><small>tiến độ</small></div></div><div class="summary-block" style="margin-top:14px"><div class="summary-mini"><span>Nhân công hôm nay</span><strong>${getWorkersOn(todayISO(),a.id)}</strong></div><div class="summary-mini"><span>Móng quản lý</span><strong>${foundationsForUser(a.id).length}</strong></div><div class="summary-mini"><span>Cập nhật</span><strong style="font-size:10px">${latest?localDate(latest.date):'—'}</strong></div></div></div></div>`}).join('')}</div>`;
  }

  function renderLogsPage() {
    const logs = (currentUser.role==='commander'?state.logs:state.logs.filter(l=>l.leaderId===currentUser.id)).slice().sort(sortLogs);
    const ownerOptions = currentUser.role==='commander'?`<select id="logOwnerFilter" class="control"><option value="">Tất cả đội</option>${ACCOUNTS.filter(a=>a.role==='leader').map(a=>`<option value="${a.id}">${esc(a.short)}</option>`).join('')}</select>`:'';
    $('#pageContent').innerHTML = `${hero('Nhật ký công việc', 'Theo dõi nhân công, công việc móng, tên móng và tiến độ theo ngày.', currentUser.role==='leader'?'<button class="btn btn-primary" id="addLogBtn">+ Nhập báo cáo</button>':'')}
      <div class="panel"><div class="panel-head"><div><h4>Lịch sử nhập liệu</h4><p>Dữ liệu mới nhất hiển thị trước.</p></div><div class="filter-row">${ownerOptions}<input id="logDateFilter" class="control" type="date" /></div></div><div class="panel-body"><div id="logsTableHost">${renderLogsTable(logs,true)}</div></div></div>`;
    if ($('#addLogBtn')) $('#addLogBtn').addEventListener('click',()=>openReport());
    const rerender = () => {
      let filtered = logs;
      const owner = $('#logOwnerFilter')?.value; const date=$('#logDateFilter').value;
      if(owner) filtered=filtered.filter(l=>l.leaderId===owner); if(date) filtered=filtered.filter(l=>l.date===date);
      $('#logsTableHost').innerHTML=renderLogsTable(filtered,true); bindDeleteActions();
    };
    $('#logOwnerFilter')?.addEventListener('change',rerender); $('#logDateFilter').addEventListener('change',rerender);
    bindDeleteActions();
  }

  function renderFoundationsPage() {
    const list = currentUser.role==='commander'?Object.values(state.foundations).sort((a,b)=>a.name.localeCompare(b.name,'vi',{numeric:true})):foundationsForUser(currentUser.id);
    $('#pageContent').innerHTML = `${hero(currentUser.role==='commander'?'Danh mục móng toàn dự án':'Danh mục móng của đội', 'Tên móng là khóa để chống tính trùng giữa các đội. Cùng một móng chỉ có một đội chủ quản.')}
      <div class="kpi-grid">${kpi('Tổng móng',list.length,'Tên móng đã được khai báo','⌗')}${kpi('Đã đạt 100%',list.filter(f=>Number(f.progress)>=100).length,'Theo cập nhật mới nhất','✓')}${kpi('Đang thực hiện',list.filter(f=>Number(f.progress)>0&&Number(f.progress)<100).length,'Có tiến độ 1–99%','◔')}${kpi('Khu vực có dữ liệu',new Set(list.map(f=>f.zoneId)).size,'Theo danh mục móng','▦')}</div>
      <div class="panel"><div class="panel-head"><div><h4>Lưới móng</h4><p>Thanh xanh ở mỗi ô thể hiện % mới nhất của móng.</p></div><span class="panel-badge">UNIQUE OWNER</span></div><div class="panel-body">${renderFoundationTiles(list)}</div></div>`;
  }

  function renderDataPage() {
    if(currentUser.role!=='commander') return renderLeaderOverview();
    $('#pageContent').innerHTML = `${hero('Quản lý dữ liệu', 'Xuất dữ liệu để lưu trữ hoặc chuyển sang phiên bản backend sau này.')}
      <div class="two-col">
        <div class="panel"><div class="panel-head"><div><h4>Xuất dữ liệu</h4><p>Tải về JSON/CSV từ trình duyệt hiện tại.</p></div></div><div class="panel-body"><div class="notice">V1 đang lưu dữ liệu trong trình duyệt. Khi chuyển sang backend thật, cấu trúc log và danh mục móng này có thể migrate trực tiếp.</div><div class="hero-actions" style="margin-top:14px"><button class="btn btn-primary" id="exportJson">Xuất JSON</button><button class="btn btn-secondary" id="exportCsv">Xuất CSV nhật ký</button></div></div></div>
        <div class="panel"><div class="panel-head"><div><h4>Khôi phục</h4><p>Nhập lại tệp JSON đã xuất từ V1.</p></div></div><div class="panel-body"><input id="importFile" type="file" accept="application/json" class="control"><div class="field-help">Việc nhập sẽ thay thế dữ liệu hiện tại trên trình duyệt này.</div></div></div>
      </div>
      <div class="danger-zone section-gap"><strong>Đặt lại dữ liệu demo</strong><p>Xóa toàn bộ nhật ký và danh mục móng trên trình duyệt này. Không thể hoàn tác nếu chưa xuất bản sao.</p><button class="btn btn-danger" id="resetData">Xóa toàn bộ dữ liệu V1</button></div>`;
    $('#exportJson').addEventListener('click', exportJson); $('#exportCsv').addEventListener('click', exportCsv); $('#importFile').addEventListener('change', importJson); $('#resetData').addEventListener('click', resetData);
  }

  function bindMapClicks(){ $$('[data-zone]').forEach(el=>el.addEventListener('click',e=>{e.stopPropagation();showZone(el.dataset.zone)})); }
  function showZone(zoneId){
    const z=zoneById(zoneId); if(!z)return; const logs=state.logs.filter(l=>l.zoneId===zoneId).sort(sortLogs); const foundations=Object.values(state.foundations).filter(f=>f.zoneId===zoneId);
    $('#detailsTitle').textContent=z.name;
    $('#detailsContent').innerHTML=`<div class="summary-block"><div class="summary-mini"><span>Đội phụ trách</span><strong style="font-size:11px">${esc(accountById(z.ownerId).name)}</strong></div><div class="summary-mini"><span>Tiến độ hiện tại</span><strong>${pct(getZoneProgress(z.id))}%</strong></div><div class="summary-mini"><span>Số móng đã khai báo</span><strong>${foundations.length}</strong></div></div><div class="section-gap"><h4 style="font-size:12px">Móng trong khu vực</h4>${renderFoundationTiles(foundations)}</div><div class="section-gap"><h4 style="font-size:12px">Nhật ký gần nhất</h4>${renderLogsTable(logs.slice(0,8),false)}</div>`;
    $('#detailsDialog').showModal();
  }

  function openReport(asCommander = false) {
    const leaders = ACCOUNTS.filter(a=>a.role==='leader');
    let leader = currentUser.role==='leader'?currentUser:leaders[0];
    const existing = $('#leaderProxySelect'); if(existing) existing.remove();
    if(currentUser.role==='commander' && asCommander){
      const wrap=document.createElement('div'); wrap.id='leaderProxySelect'; wrap.innerHTML=`<label class="field-label" for="proxyLeader">Nhập hộ đội trưởng</label><select id="proxyLeader" class="control">${leaders.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select>`;
      $('#reportForm').insertBefore(wrap,$('#reportDate').closest('.form-grid'));
      $('#proxyLeader').addEventListener('change',()=>fillZoneOptions(accountById($('#proxyLeader').value)));
      leader=leaders[0];
    }
    $('#reportDate').value=todayISO(); $('#workerCount').value=''; $('#foundationNames').value=''; $('#reportNote').value=''; $('#formError').classList.add('hidden');
    fillZoneOptions(leader); $('#reportDialog').showModal();
  }
  function fillZoneOptions(user){
    $('#zoneSelect').innerHTML=user.areas.map(id=>{const z=zoneById(id);return `<option value="${id}">${esc(z.name)} · ${esc(z.scope)}</option>`}).join('');
    const first=user.areas[0]; $('#progressInput').value=pct(getZoneProgress(first)).replace(',','.');
    $('#zoneSelect').onchange=()=>{$('#progressInput').value=pct(getZoneProgress($('#zoneSelect').value)).replace(',','.');};
  }

  function submitReport(e){
    e.preventDefault();
    const leaderId=currentUser.role==='leader'?currentUser.id:($('#proxyLeader')?.value || null);
    if(!leaderId) return showFormError('Chỉ huy trưởng cần chọn đội khi nhập hộ.');
    const leader=accountById(leaderId), zoneId=$('#zoneSelect').value;
    if(!leader.areas.includes(zoneId)) return showFormError('Khu vực này không thuộc phạm vi của đội đã chọn.');
    const names=parseFoundationNames($('#foundationNames').value);
    if(!names.length) return showFormError('Cần nhập ít nhất một tên móng.');
    const collisions=[];
    names.forEach(name=>{const key=name.toLowerCase(); const f=state.foundations[key]; if(f && f.ownerId!==leaderId) collisions.push(`${name} đang thuộc ${accountById(f.ownerId)?.short}`)});
    if(collisions.length) return showFormError(`Không thể nhập trùng chủ quản: ${collisions.join('; ')}.`);
    const progress=Number($('#progressInput').value), workers=Number($('#workerCount').value);
    if(progress<0||progress>100||!Number.isFinite(progress)) return showFormError('Tiến độ phải từ 0 đến 100%.');
    if(workers<0||!Number.isFinite(workers)) return showFormError('Số công nhân không hợp lệ.');
    const stage=$('#workStage').value, date=$('#reportDate').value;
    const log={id:`log_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,date,leaderId,zoneId,workers,stage,progress,foundationNames:names,note:$('#reportNote').value.trim(),createdAt:new Date().toISOString()};
    state.logs.push(log);
    names.forEach(name=>{const key=name.toLowerCase(); const old=state.foundations[key]; state.foundations[key]={name,ownerId:leaderId,zoneId,stage,progress,firstDate:old?.firstDate||date,lastDate:date,updatedAt:new Date().toISOString()};});
    saveState(); $('#reportDialog').close(); toast(`Đã lưu ${names.length} móng · ${workers} công nhân · ${pct(progress)}%.`); renderPage();
  }
  function showFormError(msg){const el=$('#formError');el.textContent=msg;el.classList.remove('hidden');}

  function bindDeleteActions(){ $$('[data-delete-log]').forEach(btn=>btn.addEventListener('click',()=>deleteLog(btn.dataset.deleteLog))); }
  function deleteLog(id){
    const log=state.logs.find(l=>l.id===id); if(!log)return;
    if(currentUser.role!=='commander' && log.leaderId!==currentUser.id) return toast('Bạn không có quyền xóa báo cáo này.','error');
    if(!confirm('Xóa báo cáo này? Danh mục móng sẽ được tính lại từ các báo cáo còn lại.')) return;
    state.logs=state.logs.filter(l=>l.id!==id); rebuildFoundations(); saveState(); toast('Đã xóa báo cáo.'); renderPage();
  }
  function rebuildFoundations(){
    state.foundations={};
    state.logs.slice().sort((a,b)=>(a.date+a.createdAt).localeCompare(b.date+b.createdAt)).forEach(l=>l.foundationNames.forEach(name=>{const k=name.toLowerCase();state.foundations[k]={name,ownerId:l.leaderId,zoneId:l.zoneId,stage:l.stage,progress:Number(l.progress),firstDate:state.foundations[k]?.firstDate||l.date,lastDate:l.date,updatedAt:l.createdAt};}));
  }

  function download(filename, text, type){const blob=new Blob([text],{type});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},0)}
  function exportJson(){download(`tailg-v1-${todayISO()}.json`,JSON.stringify(state,null,2),'application/json')}
  function exportCsv(){
    const rows=[['date','leader','zone','workers','stage','foundation_names','progress','note'],...state.logs.slice().sort(sortLogs).map(l=>[l.date,accountById(l.leaderId)?.name||l.leaderId,zoneById(l.zoneId)?.name||l.zoneId,l.workers,l.stage,l.foundationNames.join('|'),l.progress,l.note])];
    const csv='\ufeff'+rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');download(`tailg-logs-${todayISO()}.csv`,csv,'text/csv;charset=utf-8')
  }
  function importJson(e){const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const obj=JSON.parse(reader.result);if(!Array.isArray(obj.logs)||typeof obj.foundations!=='object')throw new Error();if(!confirm('Nhập dữ liệu này và thay thế dữ liệu hiện tại?'))return;state=obj;saveState();toast('Đã khôi phục dữ liệu.');renderPage()}catch{toast('Tệp JSON không đúng định dạng TAILG V1.','error')}};reader.readAsText(file)}
  function resetData(){if(!confirm('Xóa toàn bộ dữ liệu V1 trên trình duyệt này?'))return;state=initialState();saveState();toast('Đã đặt lại dữ liệu.');renderPage()}

  $('#logoutBtn').addEventListener('click',()=>{setSession(null);bootApp()});
  $('#menuBtn').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
  $('#reportForm').addEventListener('submit',submitReport);
  $('#closeDialog').addEventListener('click',()=>$('#reportDialog').close());
  $('#cancelReport').addEventListener('click',()=>$('#reportDialog').close());
  $('#closeDetails').addEventListener('click',()=>$('#detailsDialog').close());
  document.addEventListener('click',e=>{if(innerWidth<=860 && $('#sidebar').classList.contains('open') && !$('#sidebar').contains(e.target) && e.target!==$('#menuBtn'))$('#sidebar').classList.remove('open')});

  initLogin();
  bootApp();
})();
