/* ProjectVault · Trainer Dashboard — attendance + group presentation tracking across all capstone sites.
   Data comes live from each site's API through /api/hub (trainer login required). Nothing is stored here except
   the login for this browser tab (sessionStorage) and your view settings. */
(function () {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const COLORS = { marketing: "#d92d8a", hr: "#7357e8", crm: "#16a89a", hospitality: "#c88b12", manufacturing: "#f4a500", swiggy: "#ff6b16", ecommerce: "#f04478", "supply-chain": "#1266d6", healthcare: "#18a8e8", insurance: "#1d70e8", stock: "#159a69" };
  const STAGES = [["kickoff", "Kick-off", 0], ["excel", "Excel", 1], ["tableau", "Tableau", 2], ["powerbi", "Power BI", 3], ["final", "Final", 4]];
  const COLS = [["excel", "Excel"], ["tableau", "Tableau"], ["powerbi", "Power BI"], ["sqlqa", "SQL QA"], ["final", "Final"]];
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const ss = { get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }, del(k) { try { sessionStorage.removeItem(k); } catch (e) {} } };
  const ls = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const S = { data: null, loading: false, error: "", tab: ls.get("pvt_tab", "today"), days: ls.get("pvt_days", 30), site: "all", q: "", open: null, sub: "groups", onlyPres: false, auto: ls.get("pvt_auto", true) };
  let timer = null;

  /* ---------- dates ---------- */
  const pad = (n) => String(n).padStart(2, "0");
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); };
  const fmtD = (s) => { if (!s) return "—"; const d = parse(s); return `${DAYS[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}`; };
  const fmtShort = (s) => { const d = parse(s); return `${d.getDate()} ${MON[d.getMonth()]}`; };
  const today = () => { const r = S.data && S.data.sites.find(x => x.report && x.report.today); return r ? r.report.today : ymd(new Date()); };   // India date from the sites
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
  const fmtT = (hm) => { if (!hm) return ""; let [h, m] = hm.split(":").map(Number); const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; return `${h}:${pad(m)} ${ap}`; };
  function times(p) {
    let st = p.start, en = p.end;
    if (!st) { const m = String(p.time || "").match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i); if (m) { let h = +m[1]; if (/pm/i.test(m[3] || "") && h < 12) h += 12; st = `${pad(h)}:${m[2] || "00"}`; } else st = "21:00"; }
    if (!en) { const [h, m] = st.split(":").map(Number); en = `${pad((h + 1) % 24)}:${pad(m)}`; }
    return [st, en];
  }
  const timeLabel = (p) => { const [a, b] = times(p); return `${fmtT(a)} – ${fmtT(b)}`; };
  function stageDates(p) {
    const out = { kickoff: (p.overrides && p.overrides.kickoff) || p.kickoff };
    const first = parse(p.kickoff); first.setDate(first.getDate() + 6);
    while (first.getDay() !== Number(p.presDay)) first.setDate(first.getDate() + 1);
    STAGES.filter(s => s[2] > 0).forEach(([k, , w]) => { const d = new Date(first); d.setDate(d.getDate() + 7 * (w - 1)); out[k] = (p.overrides && p.overrides[k]) || ymd(d); });
    return out;
  }
  function endAt(p, dateStr) { const [, e] = times(p); const d = parse(dateStr); const [h, m] = e.split(":").map(Number); d.setHours(h, m, 0, 0); return d; }
  function nextStage(p) { const ds = stageDates(p); const now = new Date(); const s = STAGES.find(([k]) => ds[k] && endAt(p, ds[k]) > now); return s ? { key: s[0], label: s[1], date: ds[s[0]] } : null; }
  const gStatus = (p, g, k) => ((p.status && p.status[g.id]) || {})[k] || "pending";
  function counts(p, k) { const c = { done: 0, pending: 0, absent: 0 }; (p.groups || []).forEach(g => c[gStatus(p, g, k)]++); return c; }
  const norm = (s) => String(s || "").trim().toUpperCase().replace(/\s+/g, "");
  const gnorm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

  /* ---------- model built from the hub response ---------- */
  function model() {
    const D = S.data; if (!D) return null;
    const t = today(); const projects = [], students = [];
    D.sites.forEach(site => {
      const rep = site.report;
      // merge a student's devices (same uid) into one person
      const byKey = new Map();
      (rep ? rep.students : []).forEach(s => {
        const k = s.uid || (s.name + "|" + s.batch + "|" + s.group).toLowerCase();
        const o = byKey.get(k);
        if (!o) byKey.set(k, Object.assign({}, s, { days: [...new Set(s.days)].sort(), devices: 1, site: site.id, siteName: site.name }));
        else { o.days = [...new Set([...o.days, ...s.days])].sort(); o.devices++; o.views += s.views; o.first = Math.min(o.first || s.first, s.first || o.first); if (s.last > o.last) { o.last = s.last; o.name = s.name; o.group = s.group; o.batch = s.batch; o.lastPage = s.lastPage; } }
      });
      const studs = [...byKey.values()]; students.push(...studs);
      site.projects.forEach(p => {
        const ds = stageDates(p), nx = nextStage(p), todayStage = STAGES.find(([k]) => ds[k] === t);
        const mine = studs.filter(s => norm(s.batch) === norm(p.code));
        projects.push({ site, p, ds, nx, todayStage: todayStage ? { key: todayStage[0], label: todayStage[1] } : null, students: mine,
          visitedToday: mine.filter(s => s.days.includes(t)).length, active7: mine.filter(s => s.days.some(d => d >= addDays(t, -6))).length,
          done: !nx });
      });
      const codes = new Set(site.projects.map(p => norm(p.code)));
      const orphan = studs.filter(s => !codes.has(norm(s.batch)));
      if (orphan.length) projects.push({ site, p: { code: "(no / old code)", groups: [], status: {}, presDay: 0, kickoff: t }, ds: {}, nx: null, todayStage: null, students: orphan, visitedToday: orphan.filter(s => s.days.includes(t)).length, active7: orphan.filter(s => s.days.some(d => d >= addDays(t, -6))).length, orphan: true });
    });
    return { t, projects, students };
  }

  /* ---------- API ---------- */
  async function load(user, pass) {
    S.user = user; S.loading = true; S.error = ""; render();
    try {
      const r = await fetch("api/hub", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user, pass, days: S.days }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) { S.error = j.error || (r.status === 404 ? "The tracking service (api/hub) is not deployed yet. Push the new ProjectVault zip to GitHub." : "Could not load data (" + r.status + ")."); if (r.status === 401) { ss.del("pvt_u"); ss.del("pvt_p"); S.data = null; } }
      else { S.data = j; ss.set("pvt_u", user); ss.set("pvt_p", pass); }
    } catch (e) { S.error = location.protocol === "file:" ? "Open this page from the deployed ProjectVault site (it needs the /api/hub server function)." : "No internet connection or the server did not answer."; }
    S.loading = false; render(); schedule();
  }
  function refresh() { const u = ss.get("pvt_u"), p = ss.get("pvt_p"); if (u && p) load(u, p); }
  function schedule() { clearInterval(timer); if (S.auto && S.data) timer = setInterval(() => { if (document.visibilityState === "visible" && !S.loading) refresh(); }, 120000); }

  /* ---------- render ---------- */
  function render() {
    const root = $("#trk"); if (!root) return;
    const logged = !!S.data;
    root.innerHTML = `
      <header class="tk-top">
        <a class="tk-brand" href="./" title="Back to ProjectVault"><span class="tk-cube"></span><span><b>Project<i>Vault</i></b><small>Trainer Dashboard</small></span></a>
        ${logged ? `<div class="tk-ctrl">
          <label>Range <select id="tk-days">${[7, 14, 30, 60, 90].map(d => `<option value="${d}" ${+S.days === d ? "selected" : ""}>Last ${d} days</option>`).join("")}</select></label>
          <label class="tk-chk"><input type="checkbox" id="tk-auto" ${S.auto ? "checked" : ""}> Auto-refresh</label>
          <button class="tk-btn" id="tk-ref" ${S.loading ? "disabled" : ""}>${S.loading ? "⏳ Loading…" : "↻ Refresh"}</button>
          <button class="tk-btn ghost" id="tk-csv">⬇ CSV</button>
          <button class="tk-btn ghost" id="tk-out">Log out</button>
          <span class="tk-muted">Updated ${new Date(S.data.checkedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span></div>` : ""}
      </header>
      ${S.error ? `<div class="tk-alert" role="alert">⚠️ ${esc(S.error)}</div>` : ""}
      ${logged ? dash() : loginHtml()}`;
    bind();
    document.querySelectorAll(".tk-att").forEach(t => { t.parentElement.scrollLeft = t.parentElement.scrollWidth; });   // show the latest days
  }
  function loginHtml() {
    return `<form class="tk-login" id="tk-login" autocomplete="on"><h2>🔐 Trainer Dashboard</h2>
      <p>Attendance and group presentation status of every capstone project, live from all project sites. Use the same trainer login as on the project sites.</p>
      <label>Username<input id="tk-u" name="username" autocomplete="username" required value="${esc(S.user || ss.get("pvt_u") || "")}"></label>
      <label>Password<input id="tk-p" name="password" type="password" autocomplete="current-password" required></label>
      <button class="tk-btn" type="submit" id="tk-go" ${S.loading ? "disabled" : ""}>${S.loading ? "⏳ Reading all sites…" : "Open dashboard"}</button>
      <small>Your password is checked by the project sites and is kept only in this browser tab.</small></form>`;
  }
  function dash() {
    const M = model(); const t = M.t; const live = M.projects.filter(x => !x.orphan);
    const siteFilter = (x) => S.site === "all" || x.site.id === S.site;
    const todays = live.filter(x => x.todayStage && siteFilter(x));
    const presToday = todays.filter(x => x.todayStage.key !== "kickoff").reduce((a, x) => { const c = counts(x.p, x.todayStage.key); a.done += c.done; a.pend += c.pending; a.abs += c.absent; return a; }, { done: 0, pend: 0, abs: 0 });
    const studs = M.students.filter(s => S.site === "all" || s.site === S.site);
    const K = [["Project codes running", live.filter(x => !x.done && siteFilter(x)).length, `${live.filter(siteFilter).length} in total`],
      ["Students registered", studs.length, `${M.students.length} across all sites`],
      ["Visited today", studs.filter(s => s.days.includes(t)).length, fmtD(t)],
      ["Active last 7 days", studs.filter(s => s.days.some(d => d >= addDays(t, -6))).length, "visited at least once"],
      ["Presentations today", todays.length, todays.map(x => x.p.code).join(", ") || "none today"],
      ["Groups presented today", `${presToday.done}/${presToday.done + presToday.pend + presToday.abs}`, `${presToday.pend} pending · ${presToday.abs} absent`]];
    const sitesBar = S.data.sites.map(s => { const ic = { ok: "🟢", nodb: "🟠", down: "🔴", auth: "🔒" }[s.state] || "⚪"; const n = s.projects.length;
      return `<button class="tk-site ${S.site === s.id ? "on" : ""}" data-site="${esc(s.id)}" style="--c:${COLORS[s.id] || "#1768ed"}" title="${esc(s.error || "Connected")}">${ic} ${esc(s.name)} <small>${s.state === "ok" ? n + " code" + (n === 1 ? "" : "s") : esc(s.state === "nodb" ? "no database" : s.state === "auth" ? "login failed" : "offline")}</small></button>`; }).join("");
    return `
      <section class="tk-kpis">${K.map(([l, v, s]) => `<div class="tk-kpi"><b>${esc(v)}</b><span>${esc(l)}</span><small>${esc(s)}</small></div>`).join("")}</section>
      <section class="tk-sites"><button class="tk-site ${S.site === "all" ? "on" : ""}" data-site="all">All sites</button>${sitesBar}</section>
      ${S.data.sites.some(s => s.state !== "ok") ? `<div class="tk-note">🟠 / 🔴 sites are not counted: ${S.data.sites.filter(s => s.state !== "ok").map(s => `<b>${esc(s.name)}</b> (${esc(s.error)})`).join("; ")}.</div>` : ""}
      <nav class="tk-tabs">${[["today", "📅 Today & upcoming"], ["projects", "🗂 Project codes"], ["students", "👥 Students"], ["visits", "📈 Daily visits"]].map(([k, l]) => `<button class="${S.tab === k ? "on" : ""}" data-tab="${k}">${l}</button>`).join("")}</nav>
      <section class="tk-body">${S.tab === "today" ? todayHtml(M, siteFilter) : S.tab === "projects" ? projectsHtml(M, siteFilter) : S.tab === "students" ? studentsHtml(M) : visitsHtml(M)}</section>
      ${S.open ? detailHtml(M) : ""}`;
  }
  function stageBar(c, n) {
    if (!n) return `<span class="tk-muted">no groups</span>`;
    return `<span class="tk-sbar" title="${c.done} done · ${c.pending} pending · ${c.absent} absent"><i class="d" style="width:${c.done / n * 100}%"></i><i class="a" style="width:${c.absent / n * 100}%"></i></span><span class="tk-sn">${c.done}/${n}</span>`;
  }
  function todayHtml(M, f) {
    const t = M.t; const live = M.projects.filter(x => !x.orphan && f(x));
    const now = live.filter(x => x.todayStage);
    const soon = live.filter(x => !x.todayStage && x.nx && x.nx.date > t && x.nx.date <= addDays(t, 7)).sort((a, b) => (a.nx.date + times(a.p)[0]).localeCompare(b.nx.date + times(b.p)[0]));
    const card = (x, stageKey, label, date) => { const n = (x.p.groups || []).length; const c = stageKey ? counts(x.p, stageKey) : null; const pend = stageKey ? (x.p.groups || []).filter(g => gStatus(x.p, g, stageKey) === "pending").map(g => g.name) : [];
      return `<article class="tk-card" style="--c:${COLORS[x.site.id] || "#1768ed"}" data-open="${esc(x.site.id + "|" + x.p.code)}" tabindex="0">
        <div class="tk-ch"><b>${esc(x.p.code)}</b><span>${esc(x.site.name)}</span></div>
        <div class="tk-cs">${esc(label)} · ${esc(fmtD(date))} · ${esc(timeLabel(x.p))}</div>
        ${c ? `<div class="tk-cc"><span class="ok">✅ ${c.done} presented</span><span class="pe">⏳ ${c.pending} pending</span><span class="ab">❌ ${c.absent} absent</span></div>${stageBar(c, n)}${pend.length ? `<div class="tk-muted">Pending: ${esc(pend.join(", "))}</div>` : ""}` : ""}
        <div class="tk-cf">👥 ${x.students.length} students · <b>${x.visitedToday}</b> visited today · ${x.active7} active this week</div></article>`; };
    return `<h3>Presentations today · ${esc(fmtD(t))}</h3>
      ${now.length ? `<div class="tk-cards">${now.map(x => card(x, x.todayStage.key === "kickoff" ? null : x.todayStage.key, x.todayStage.label, t)).join("")}</div>` : `<p class="tk-empty">No presentation is scheduled today${S.site !== "all" ? " on this site" : ""}.</p>`}
      <h3>Next 7 days</h3>
      ${soon.length ? `<div class="tk-cards">${soon.map(x => card(x, x.nx.key === "kickoff" ? null : x.nx.key, x.nx.label, x.nx.date)).join("")}</div>` : `<p class="tk-empty">Nothing scheduled in the next 7 days.</p>`}`;
  }
  function projectsHtml(M, f) {
    const rows = M.projects.filter(f).sort((a, b) => a.site.name.localeCompare(b.site.name) || String(a.p.code).localeCompare(b.p.code));
    if (!rows.length) return `<p class="tk-empty">No project codes yet. Create them on each site's Project Schedule page.</p>`;
    return `<div class="tk-tablewrap"><table class="tk-table"><thead><tr><th>Site</th><th>Project code</th><th>Timing</th><th>Next</th><th>Groups</th>${COLS.map(([, l]) => `<th>${l}</th>`).join("")}<th>Students</th><th>Today</th><th>7 days</th></tr></thead><tbody>
      ${rows.map(x => { const n = (x.p.groups || []).length; return `<tr data-open="${esc(x.site.id + "|" + x.p.code)}" tabindex="0">
        <td><span class="tk-dot" style="background:${COLORS[x.site.id] || "#1768ed"}"></span>${esc(x.site.name)}</td><td><b>${esc(x.p.code)}</b></td>
        <td>${x.orphan ? "—" : `${DAYS[+x.p.presDay] || ""} · ${esc(timeLabel(x.p))}`}</td>
        <td>${x.orphan ? "Students whose code was deleted / not set" : x.nx ? `${esc(x.nx.label)}<div class="tk-muted">${esc(fmtD(x.nx.date))}</div>` : "Completed 🎉"}</td><td class="n">${x.orphan ? "—" : n}</td>
        ${COLS.map(([k]) => `<td class="tk-st">${x.orphan ? "—" : stageBar(counts(x.p, k), n)}</td>`).join("")}
        <td class="n">${x.students.length}</td><td class="n">${x.visitedToday}</td><td class="n">${x.active7}</td></tr>`; }).join("")}
      </tbody></table></div><p class="tk-muted">Bars: green = presented, red = nobody from the group presented, grey = pending. Click a row for groups, members and day-by-day attendance.</p>`;
  }
  function studentsHtml(M) {
    const t = M.t, q = S.q.trim().toLowerCase();
    const list = M.students.filter(s => (S.site === "all" || s.site === S.site) && (!q || [s.name, s.group, s.batch, s.last4, s.siteName].join(" ").toLowerCase().includes(q))).sort((a, b) => b.last - a.last);
    return `<div class="tk-row"><input id="tk-q" type="search" placeholder="Search name, group, project code or last 4 digits…" value="${esc(S.q)}"><span class="tk-muted">${list.length} students</span></div>
      <div class="tk-tablewrap"><table class="tk-table"><thead><tr><th>Student</th><th>Site</th><th>Project code</th><th>Group</th><th>Mobile</th><th>Days visited</th><th>Last ${S.days} days</th><th>Last visit</th></tr></thead><tbody>
      ${list.slice(0, 500).map(s => `<tr><td><b>${esc(s.name)}</b>${s.devices > 1 ? ` <span class="tk-muted">${s.devices} devices</span>` : ""}</td><td><span class="tk-dot" style="background:${COLORS[s.site] || "#1768ed"}"></span>${esc(s.siteName)}</td>
        <td>${esc(s.batch || "—")}</td><td>${esc(s.group || "—")}</td><td>${s.last4 ? "••" + esc(s.last4) : "—"}</td><td class="n">${s.days.length}${s.days.includes(t) ? ' <span class="tk-today">today</span>' : ""}</td>
        <td>${spark(s.days)}</td><td>${s.last ? new Date(s.last).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</td></tr>`).join("") || `<tr><td colspan="8" class="tk-empty">No students yet.</td></tr>`}
      </tbody></table></div>`;
  }
  function rangeDays() { const t = today(); return Array.from({ length: +S.days }, (_, i) => addDays(t, i - (+S.days - 1))); }
  function spark(days) { const set = new Set(days); return `<span class="tk-spark">${rangeDays().map(d => `<i class="${set.has(d) ? "on" : ""}" title="${esc(fmtShort(d))}"></i>`).join("")}</span>`; }
  function visitsHtml(M) {
    const ds = rangeDays(); const sites = S.data.sites.filter(s => s.report && (S.site === "all" || s.id === S.site));
    const per = ds.map(d => sites.map(s => { const r = (s.report.daily || []).find(x => x.day === d); return r ? (r.named || r.unique || 0) : 0; }));
    const max = Math.max(1, ...per.map(a => a.reduce((x, y) => x + y, 0)));
    const W = 980, H = 260, L = 34, B = 30, bw = (W - L - 10) / ds.length;
    let g = ""; for (let y = 0; y <= 4; y++) { const v = Math.round(max * y / 4), yy = H - B - (H - B - 12) * y / 4; g += `<line x1="${L}" x2="${W}" y1="${yy}" y2="${yy}" stroke="#e4ebf6"/><text x="${L - 6}" y="${yy + 4}" font-size="11" text-anchor="end" fill="#7a88a6">${v}</text>`; }
    ds.forEach((d, i) => { let y0 = H - B; sites.forEach((s, j) => { const v = per[i][j]; if (!v) return; const h = (H - B - 12) * v / max; y0 -= h; g += `<rect x="${L + i * bw + bw * .15}" y="${y0}" width="${bw * .7}" height="${Math.max(1, h - 1)}" rx="2" fill="${COLORS[s.id] || "#1768ed"}"><title>${esc(s.name)} · ${esc(fmtShort(d))}: ${v}</title></rect>`; });
      if (ds.length <= 31 ? i % Math.ceil(ds.length / 10) === 0 : i % 7 === 0) g += `<text x="${L + i * bw + bw / 2}" y="${H - 10}" font-size="10.5" text-anchor="middle" fill="#5c6b89">${esc(fmtShort(d))}</text>`; });
    return `<h3>Students who checked in, per day</h3><div class="tk-chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Daily check-ins">${g}</svg></div>
      <div class="tk-legend">${sites.map(s => `<span><i style="background:${COLORS[s.id] || "#1768ed"}"></i>${esc(s.name)}</span>`).join("")}</div>
      <p class="tk-muted">A student counts once per site per day (named check-ins). Hover a bar for the number.</p>`;
  }
  function detailHtml(M) {
    const x = M.projects.find(y => y.site.id + "|" + y.p.code === S.open); if (!x) return "";
    const p = x.p, n = (p.groups || []).length, ds = rangeDays(), presDates = new Set(Object.values(x.ds || {}));
    const shown = S.onlyPres ? ds.filter(d => presDates.has(d)) : ds;
    const byGroup = {}; x.students.forEach(s => { (byGroup[gnorm(s.group)] = byGroup[gnorm(s.group)] || []).push(s); });
    const ic = { done: "✅", pending: "⏳", absent: "❌" };
    const groups = x.orphan ? "" : `<div class="tk-tablewrap"><table class="tk-table tk-mx"><thead><tr><th>Group</th><th>Members (from site)</th><th>Students checked in</th>${COLS.map(([k, l]) => `<th>${l}${x.ds[k] ? `<div class="tk-muted">${esc(fmtShort(x.ds[k]))}</div>` : ""}</th>`).join("")}<th>Note</th></tr></thead><tbody>
      ${(p.groups || []).map(g => { const st = (p.status && p.status[g.id]) || {}; const ss2 = byGroup[gnorm(g.name)] || [];
        return `<tr><td><b>${esc(g.name)}</b></td><td class="tk-wrap">${esc(g.members || "—")}</td><td class="tk-wrap">${ss2.map(s => esc(s.name)).join(", ") || '<span class="tk-muted">none yet</span>'}</td>${COLS.map(([k]) => `<td class="c">${ic[gStatus(p, g, k)]}</td>`).join("")}<td class="tk-wrap">${esc(st.note || "")}</td></tr>`; }).join("")}
      <tr class="tot"><td>Total</td><td></td><td>${x.students.length}</td>${COLS.map(([k]) => { const c = counts(p, k); return `<td class="c">${c.done}/${n}</td>`; }).join("")}<td></td></tr></tbody></table></div>`;
    const att = `<div class="tk-row"><label class="tk-chk"><input type="checkbox" id="tk-only" ${S.onlyPres ? "checked" : ""}> Only presentation days</label><button class="tk-btn ghost" id="tk-csv-one">⬇ Attendance CSV</button></div>
      ${shown.length ? `<div class="tk-tablewrap"><table class="tk-table tk-att"><thead><tr><th class="stk">Student</th><th>Days</th>${shown.map(d => `<th class="${presDates.has(d) ? "pres" : ""}" title="${presDates.has(d) ? "Presentation day" : ""}">${esc(DAYS[parse(d).getDay()][0])}<br>${parse(d).getDate()}</th>`).join("")}</tr></thead><tbody>
      ${x.students.slice().sort((a, b) => String(a.group).localeCompare(b.group) || a.name.localeCompare(b.name)).map(s => { const set = new Set(s.days); return `<tr><td class="stk"><b>${esc(s.name)}</b>${s.last4 ? ` <span class="tk-muted">••${esc(s.last4)}</span>` : ""}<div class="tk-muted">${esc(s.group || "no group")} · ${shown.filter(d => set.has(d)).length}/${shown.length} days</div></td><td class="n">${shown.filter(d => set.has(d)).length}/${shown.length}</td>${shown.map(d => `<td class="c ${presDates.has(d) ? "pres" : ""}">${set.has(d) ? "●" : ""}</td>`).join("")}</tr>`; }).join("") || `<tr><td colspan="${2 + shown.length}" class="tk-empty">No student has checked in with this project code yet.</td></tr>`}
      <tr class="tot"><td class="stk">Present that day</td><td></td>${shown.map(d => `<td class="c ${presDates.has(d) ? "pres" : ""}">${x.students.filter(s => s.days.includes(d)).length || ""}</td>`).join("")}</tr></tbody></table></div>` : `<p class="tk-empty">No presentation day falls in the selected range.</p>`}
      <p class="tk-muted">● = the student opened the project site that day (site check-in). Highlighted columns are presentation days.</p>`;
    return `<div class="tk-ov" id="tk-ov"><div class="tk-drawer" role="dialog" aria-label="${esc(p.code)} details">
      <button class="tk-x" id="tk-close" aria-label="Close">✕</button>
      <div class="tk-dh" style="--c:${COLORS[x.site.id] || "#1768ed"}"><b>${esc(p.code)}</b> <span>${esc(x.site.name)}</span>
        <div class="tk-muted">${x.orphan ? "Students checked in with a project code that no longer exists, or none." : `Kick-off ${esc(fmtD(x.ds.kickoff))} · every ${esc(["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][+p.presDay])} ${esc(timeLabel(p))} · ${n} groups · ${x.nx ? "next: " + esc(x.nx.label) + " " + esc(fmtD(x.nx.date)) : "completed"}`}</div>
        <a class="tk-btn ghost" href="${esc(x.site.url)}" target="_blank" rel="noopener">Open site ↗</a></div>
      ${x.orphan ? "" : `<nav class="tk-tabs small">${[["groups", "Groups & presentations"], ["att", "Attendance by day"]].map(([k, l]) => `<button class="${S.sub === k ? "on" : ""}" data-sub="${k}">${l}</button>`).join("")}</nav>`}
      ${x.orphan || S.sub === "att" ? att : groups}</div></div>`;
  }

  /* ---------- CSV ---------- */
  const csvCell = (v) => { const s = String(v == null ? "" : v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  function download(name, rows) { const blob = new Blob(["﻿" + rows.map(r => r.map(csvCell).join(",")).join("\n")], { type: "text/csv" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
  function csvAll() {
    const M = model(); const ds = rangeDays();
    download(`attendance-all-sites-${today()}.csv`, [["Site", "Project code", "Group", "Student", "Mobile (last 4)", "Days visited", ...ds],
      ...M.students.map(s => { const set = new Set(s.days); return [s.siteName, s.batch, s.group, s.name, s.last4, ds.filter(d => set.has(d)).length, ...ds.map(d => set.has(d) ? 1 : 0)]; })]);
  }
  function csvOne() {
    const M = model(); const x = M.projects.find(y => y.site.id + "|" + y.p.code === S.open); if (!x) return; const ds = rangeDays();
    download(`attendance-${x.p.code}-${today()}.csv`, [["Student", "Group", "Mobile (last 4)", "Days visited", ...ds], ...x.students.map(s => { const set = new Set(s.days); return [s.name, s.group, s.last4, ds.filter(d => set.has(d)).length, ...ds.map(d => set.has(d) ? 1 : 0)]; }),
      [], ["Group", ...COLS.map(c => c[1]), "Note"], ...(x.p.groups || []).map(g => [g.name, ...COLS.map(([k]) => gStatus(x.p, g, k)), ((x.p.status || {})[g.id] || {}).note || ""])]);
  }

  /* ---------- events ---------- */
  function bind() {
    const f = $("#tk-login"); if (f) f.addEventListener("submit", e => { e.preventDefault(); load($("#tk-u").value.trim(), $("#tk-p").value); });
    const on = (s, ev, fn) => { const el = $(s); if (el) el.addEventListener(ev, fn); };
    on("#tk-ref", "click", refresh);
    on("#tk-out", "click", () => { ss.del("pvt_u"); ss.del("pvt_p"); S.data = null; S.open = null; clearInterval(timer); render(); });
    on("#tk-days", "change", e => { S.days = +e.target.value; ls.set("pvt_days", S.days); refresh(); });
    on("#tk-auto", "change", e => { S.auto = e.target.checked; ls.set("pvt_auto", S.auto); schedule(); });
    on("#tk-csv", "click", csvAll); on("#tk-csv-one", "click", csvOne);
    on("#tk-only", "change", e => { S.onlyPres = e.target.checked; render(); });
    on("#tk-q", "input", e => { S.q = e.target.value; const pos = e.target.selectionStart; render(); const q = $("#tk-q"); if (q) { q.focus(); q.setSelectionRange(pos, pos); } });
    document.querySelectorAll("[data-tab]").forEach(b => b.addEventListener("click", () => { S.tab = b.dataset.tab; ls.set("pvt_tab", S.tab); render(); }));
    document.querySelectorAll("[data-site]").forEach(b => b.addEventListener("click", () => { S.site = b.dataset.site; render(); }));
    document.querySelectorAll("[data-sub]").forEach(b => b.addEventListener("click", () => { S.sub = b.dataset.sub; render(); }));
    document.querySelectorAll("[data-open]").forEach(b => { const go = () => { S.open = b.dataset.open; S.sub = "groups"; render(); }; b.addEventListener("click", go); b.addEventListener("keydown", e => { if (e.key === "Enter") go(); }); });
    const close = () => { S.open = null; render(); };
    on("#tk-close", "click", close); on("#tk-ov", "click", e => { if (e.target.id === "tk-ov") close(); });
  }
  document.addEventListener("keydown", e => { if (e.key === "Escape" && S.open) { S.open = null; render(); } });
  render();
  if (ss.get("pvt_u") && ss.get("pvt_p")) refresh();
})();
