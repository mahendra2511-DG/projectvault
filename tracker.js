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
  const S = { data: null, loading: false, error: "", tab: ls.get("pvt_tab", "today"), days: ls.get("pvt_days", 30), site: ls.get("pvt_site", "all"), q: "", pq: "", open: null, sub: "groups", onlyPres: false, auto: ls.get("pvt_auto", true),
    sitesOpen: false, siteQ: "", colsOpen: false, toast: "", fCode: "all", fGroup: "all", fAct: "all",
    psort: ls.get("pvt_psort", ["next", 1]), ssort: ls.get("pvt_ssort", ["last", -1]), hide: ls.get("pvt_hide", []) };
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
      const prog = (rep && rep.progress) || {};
      const studs = [...byKey.values()]; studs.forEach(s => { const pr = prog[(String(s.name).toLowerCase() + "|" + String(s.group || "").toLowerCase()).replace(/\s+/g, " ").trim()]; s.prog = pr && (pr.pct != null || pr.sql != null) ? pr : null; });
      students.push(...studs);
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
      if (!r.ok || !j.ok) { S.error = (S.data ? "Couldn't refresh: " : "") + (j.error || (r.status === 404 ? "The tracking service (api/hub) is not deployed yet. Push the new ProjectVault zip to GitHub." : "Could not load data (" + r.status + ").")); if (r.status === 401) { ss.del("pvt_u"); ss.del("pvt_p"); S.data = null; } }
      else { S.data = j; S.error = ""; ss.set("pvt_u", user); ss.set("pvt_p", pass); if (S.site !== "all" && !j.sites.some(x => x.id === S.site)) S.site = "all"; }
    } catch (e) { S.error = location.protocol === "file:" ? "Open this page from the deployed ProjectVault site (it needs the /api/hub server function)." : "No internet connection or the server did not answer."; }
    S.loading = false; render(); schedule();
  }
  function refresh() { const u = ss.get("pvt_u"), p = ss.get("pvt_p"); if (u && p) load(u, p); }
  function schedule() { clearInterval(timer); if (S.auto && S.data) timer = setInterval(() => { if (document.visibilityState === "visible" && !S.loading) refresh(); }, 120000); }


  /* ================= helpers for the UI ================= */
  const siteColor = (id) => COLORS[id] || "#64748b";
  const dot = (id) => `<span class="dot" style="background:${siteColor(id)}" aria-hidden="true"></span>`;
  const STATE = { ok: ["Connected", "ok"], nodb: ["No database", "warn"], down: ["Offline", "bad"], auth: ["Login failed", "bad"] };
  const rel = (ts) => { const m = Math.round((Date.now() - ts) / 60000); return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.floor(m / 60)} h ago` : `${Math.floor(m / 1440)} d ago`; };
  function sessionState(p, date) {
    const [a, b] = times(p); const at = (hm) => { const d = parse(date); const [h, m] = hm.split(":").map(Number); d.setHours(h, m, 0, 0); return d; };
    const s = at(a), e = endAt(p, date), now = new Date();
    if (now < s) { const min = Math.round((s - now) / 60000); return ["upcoming", min < 60 ? `Starts in ${min} min` : `Starts in ${Math.floor(min / 60)} h ${min % 60} min`]; }
    if (now <= e) return ["live", "In progress"];
    return ["ended", "Ended"];
  }
  const connected = () => S.data.sites.filter(s => s.state === "ok");
  const inSite = (id) => S.site === "all" || S.site === id;
  function keepFocus(id, fn) { const el = document.getElementById(id); const pos = el ? el.selectionStart : null; fn(); const n = document.getElementById(id); if (n && pos != null) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } }
  function toast(msg) { S.toast = msg; render(); setTimeout(() => { if (S.toast === msg) { S.toast = ""; const t = $("#tk-toast"); if (t) t.remove(); } }, 3500); }
  function bar(c, n, wide) {
    if (!n) return `<span class="muted">No groups</span>`;
    return `<span class="seg ${wide ? "wide" : ""}" role="img" aria-label="${c.done} presented, ${c.pending} pending, ${c.absent} absent of ${n}"><i class="d" style="width:${c.done / n * 100}%"></i><i class="a" style="width:${c.absent / n * 100}%"></i></span>${wide ? "" : `<span class="segn">${c.done}/${n}</span>`}`;
  }
  const sortIcon = (st, k) => st[0] === k ? (st[1] > 0 ? " ▲" : " ▼") : "";
  const th = (st, k, label, cls) => `<th scope="col" class="${cls || ""} sortable" aria-sort="${st[0] === k ? (st[1] > 0 ? "ascending" : "descending") : "none"}"><button type="button" data-sort="${k}">${label}${sortIcon(st, k)}</button></th>`;

  /* ================= render ================= */
  function render() {
    const root = $("#trk"); if (!root) return;
    const logged = !!S.data;
    root.innerHTML = `
      <header class="tb" role="banner">
        <a class="brand" href="./" title="Back to ProjectVault"><span class="cube" aria-hidden="true"></span><span><b>Project<i>Vault</i></b><small>Trainer Dashboard</small></span></a>
        ${logged ? `<div class="tools" role="toolbar" aria-label="Dashboard controls">
          <label class="fld"><span>Range</span><select id="tk-days" aria-label="Date range">${[7, 14, 30, 60, 90].map(d => `<option value="${d}" ${+S.days === d ? "selected" : ""}>Last ${d} days</option>`).join("")}</select></label>
          <label class="switch" title="Reload data from all sites every 2 minutes while this tab is open"><input type="checkbox" id="tk-auto" ${S.auto ? "checked" : ""}><span class="knob" aria-hidden="true"></span>Auto-refresh</label>
          <span class="upd" id="tk-upd" title="${esc(new Date(S.data.checkedAt).toLocaleString("en-IN"))}">${S.loading ? `<span class="spin" aria-hidden="true"></span>Refreshing…` : `Updated ${esc(new Date(S.data.checkedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }))} · ${rel(S.data.checkedAt)}${S.auto ? " · auto every 2 min" : ""}`}</span>
          <button class="btn" id="tk-ref" ${S.loading ? "disabled aria-busy=\"true\"" : ""} title="Reload data from all sites now">↻ Refresh</button>
          <button class="btn ghost" id="tk-csv" title="Download students and day-by-day check-ins for the selected range and site filter">⬇ Export CSV</button>
          <button class="btn ghost" id="tk-out">Log out</button></div>` : ""}
      </header>
      ${S.loading && logged ? `<div class="loadbar" aria-hidden="true"></div>` : ""}
      ${S.error ? `<div class="alert" role="alert"><span>⚠️ ${esc(S.error)}${logged ? ` Showing data from ${esc(new Date(S.data.checkedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }))}.` : ""}</span>${logged ? `<button class="btn ghost sm" id="tk-retry">Retry</button>` : ""}</div>` : ""}
      ${logged ? dash() : loginHtml()}
      ${S.toast ? `<div class="toast" id="tk-toast" role="status">${esc(S.toast)}</div>` : ""}`;
    bind();
    document.querySelectorAll(".att-wrap").forEach(w => { w.scrollLeft = w.scrollWidth; });
  }
  function loginHtml() {
    return `<form class="login" id="tk-login" autocomplete="on" aria-labelledby="lg-h"><h1 id="lg-h">Trainer Dashboard</h1>
      <p>Monitor every project site in one place: today's sessions, group presentation status, project codes and student check-ins. Use the same trainer login as on the project sites.</p>
      <label>Username<input id="tk-u" name="username" autocomplete="username" required value="${esc(S.user || ss.get("pvt_u") || "")}"></label>
      <label>Password<input id="tk-p" name="password" type="password" autocomplete="current-password" required></label>
      <button class="btn block" type="submit" id="tk-go" ${S.loading ? "disabled aria-busy=\"true\"" : ""}>${S.loading ? `<span class="spin" aria-hidden="true"></span>Reading all project sites…` : "Sign in"}</button>
      <small>The password is checked by the project sites and kept only in this browser tab.</small></form>`;
  }

  /* ---------- dashboard frame ---------- */
  function dash() {
    const M = model(), t = M.t, conn = connected();
    const live = M.projects.filter(x => !x.orphan && inSite(x.site.id));
    const todays = live.filter(x => x.todayStage);
    const tk = todays.filter(x => x.todayStage.key !== "kickoff");
    const pres = tk.reduce((a, x) => { const c = counts(x.p, x.todayStage.key); a.done += c.done; a.pend += c.pending; a.abs += c.absent; return a; }, { done: 0, pend: 0, abs: 0 });
    const studs = M.students.filter(s => inSite(s.site));
    const na = !conn.length || (S.site !== "all" && !conn.some(s => s.id === S.site));
    const v = (x) => na ? "—" : x;
    const vt = studs.filter(s => s.days.includes(t)).length, a7 = studs.filter(s => s.days.some(d => d >= addDays(t, -6))).length;
    const K = [
      ["Project codes running", v(live.filter(x => !x.done).length), na ? "Data not available" : `${live.length} total · ${live.filter(x => x.done).length} completed`, ""],
      ["Students registered", v(studs.length), na ? "Data not available" : `across ${S.site === "all" ? conn.length + " connected site" + (conn.length === 1 ? "" : "s") : "this site"}`, ""],
      ["Visited today", v(vt), na ? "Data not available" : `${studs.length ? Math.round(vt / studs.length * 100) : 0}% of registered · ${fmtD(t)}`, ""],
      ["Active last 7 days", v(a7), na ? "Data not available" : `${studs.length - a7} inactive for 7+ days`, !na && studs.length - a7 > 0 ? "warn" : ""],
      ["Presentations today", v(todays.length), na ? "Data not available" : todays.map(x => x.p.code).join(", ") || "No session today", ""],
      ["Groups presented today", na ? "—" : (pres.done + pres.pend + pres.abs ? `${pres.done}/${pres.done + pres.pend + pres.abs}` : "0"), na ? "Data not available" : pres.done + pres.pend + pres.abs ? `${pres.pend} pending · ${pres.abs} absent` : "No group session today", !na && pres.abs ? "bad" : ""]];
    // operational exceptions (from existing data only)
    const exc = [];
    const bad = S.data.sites.filter(s => s.state !== "ok" && inSite(s.id));
    if (bad.length) exc.push(["warn", `${bad.length} site${bad.length > 1 ? "s" : ""} not reporting`, bad.map(s => `${s.name}: ${STATE[s.state] ? STATE[s.state][0] : s.state}`).join(" · ")]);
    tk.forEach(x => { const [st] = sessionState(x.p, t); const c = counts(x.p, x.todayStage.key); if (st === "ended" && c.pending) exc.push(["bad", `${x.p.code}: ${c.pending} group${c.pending > 1 ? "s" : ""} not marked`, `${x.todayStage.label} session has ended (${x.site.name}). Update the status on the site.`]); });
    if (pres.abs) exc.push(["bad", `${pres.abs} group${pres.abs > 1 ? "s" : ""} marked absent today`, tk.filter(x => counts(x.p, x.todayStage.key).absent).map(x => x.p.code).join(", ")]);
    const tabs = [["today", "Today & upcoming", todays.length], ["projects", "Project codes", live.length], ["students", "Students", studs.length], ["visits", "Daily visits", null]];
    return `
      <section class="kpis" aria-label="Summary">${K.map(([l, val, c, cls]) => `<div class="kpi ${cls}"><span class="kl">${esc(l)}</span><b class="kv">${esc(val)}</b><span class="kc" title="${esc(c)}">${esc(c)}</span></div>`).join("")}</section>
      <div class="ctx">
        ${siteFilterHtml()}
        ${exc.length ? `<ul class="exc" aria-label="Needs attention">${exc.map(([k, h, d]) => `<li class="${k}" title="${esc(d)}"><b>${esc(h)}</b><span>${esc(d)}</span></li>`).join("")}</ul>` : `<span class="allok">✓ Nothing needs attention right now</span>`}
      </div>
      <nav class="tabs" role="tablist" aria-label="Workspace">${tabs.map(([k, l, n]) => `<button role="tab" id="tab-${k}" aria-controls="panel" aria-selected="${S.tab === k}" tabindex="${S.tab === k ? 0 : -1}" class="${S.tab === k ? "on" : ""}" data-tab="${k}">${esc(l)}${n != null ? `<span class="cnt">${n}</span>` : ""}</button>`).join("")}</nav>
      <section class="panel" id="panel" role="tabpanel" aria-labelledby="tab-${S.tab}">${na && S.tab !== "visits" ? emptyNA() : S.tab === "today" ? todayHtml(M, live) : S.tab === "projects" ? projectsHtml(M) : S.tab === "students" ? studentsHtml(M) : visitsHtml(M)}</section>
      ${S.open ? detailHtml(M) : ""}`;
  }
  const emptyNA = () => `<div class="empty"><b>No data available for this selection</b><span>${S.site === "all" ? "None of the project sites returned data. Check that they are deployed and that their Upstash database is connected." : "This site is not reporting. See the notice above."}</span></div>`;
  function siteFilterHtml() {
    const all = S.data.sites, cur = all.find(s => s.id === S.site);
    const list = all.filter(s => !S.siteQ || s.name.toLowerCase().includes(S.siteQ.toLowerCase()));
    return `<div class="sitef">
      <button class="sitebtn" id="tk-sites" aria-haspopup="listbox" aria-expanded="${S.sitesOpen}" title="Choose which project site to show">${cur ? dot(cur.id) + esc(cur.name) : `All sites <span class="muted">(${all.length})</span>`}<span class="car" aria-hidden="true">▾</span></button>
      ${S.sitesOpen ? `<div class="pop" id="tk-pop" role="dialog" aria-label="Filter by site">
        <input id="tk-siteq" type="search" placeholder="Search sites…" value="${esc(S.siteQ)}" aria-label="Search sites">
        <ul role="listbox" aria-label="Sites">
          <li role="option" aria-selected="${S.site === "all"}"><button data-site="all" class="${S.site === "all" ? "on" : ""}"><span>All sites</span><small>${all.reduce((a, s) => a + s.projects.length, 0)} codes</small></button></li>
          ${list.map(s => { const st = STATE[s.state] || [s.state, "bad"]; return `<li role="option" aria-selected="${S.site === s.id}"><button data-site="${esc(s.id)}" class="${S.site === s.id ? "on" : ""}"><span>${dot(s.id)}${esc(s.name)}</span><small>${s.state === "ok" ? `${s.projects.length} code${s.projects.length === 1 ? "" : "s"}` : `<span class="st ${st[1]}">${esc(st[0])}</span>`}</small></button></li>`; }).join("") || `<li class="muted pad">No site matches.</li>`}
        </ul></div>` : ""}
    </div>`;
  }

  /* ---------- Today & upcoming ---------- */
  function todayHtml(M, live) {
    const t = M.t;
    const now = live.filter(x => x.todayStage).sort((a, b) => times(a.p)[0].localeCompare(times(b.p)[0]));
    const soon = live.filter(x => !x.todayStage && x.nx && x.nx.date > t && x.nx.date <= addDays(t, 7)).sort((a, b) => (a.nx.date + times(a.p)[0]).localeCompare(b.nx.date + times(b.p)[0]));
    const card = (x) => {
      const key = x.todayStage.key, kick = key === "kickoff", n = (x.p.groups || []).length, c = kick ? null : counts(x.p, key);
      const [st, stl] = sessionState(x.p, t); const pend = kick ? [] : (x.p.groups || []).filter(g => gStatus(x.p, g, key) === "pending").map(g => g.name);
      const id = esc(x.site.id + "|" + x.p.code);
      return `<article class="sess ${st}" aria-label="${esc(x.p.code)} ${esc(x.todayStage.label)} session">
        <div class="sh"><div><span class="stime">${esc(timeLabel(x.p))}</span><span class="chip ${st}">${esc(stl)}</span></div></div>
        <div class="scode"><b>${esc(x.p.code)}</b><span class="tool">${esc(x.todayStage.label)}</span></div>
        <div class="ssite">${dot(x.site.id)}${esc(x.site.name)} · ${n} group${n === 1 ? "" : "s"}</div>
        ${kick ? `<p class="muted sm">Kick-off session: groups are formed, no presentation status to track.</p>` : `${bar(c, n, true)}
        <div class="leg"><span class="l-d">${c.done} presented</span><span class="l-p">${c.pending} pending</span><span class="l-a">${c.absent} absent</span></div>
        ${pend.length ? `<p class="sm ${st === "ended" ? "warn-t" : "muted"}">${st === "ended" ? "Not marked: " : "Pending: "}${esc(pend.join(", "))}</p>` : ""}`}
        <div class="sf"><span>👥 ${x.students.length} students · <b>${x.visitedToday}</b> checked in today</span>
          <span class="acts"><button class="btn ghost sm" data-open="${id}" data-sub="groups">View groups</button><button class="btn ghost sm" data-open="${id}" data-sub="att">Attendance</button></span></div>
      </article>`;
    };
    return `<div class="sect"><h2>Today <span class="muted">· ${esc(fmtD(t))}</span></h2>
        ${now.length ? `<div class="sessions">${now.map(card).join("")}</div>` : `<div class="empty sm"><b>No session scheduled today</b><span>${S.site === "all" ? "Across all sites." : "On this site."} Upcoming sessions are listed below.</span></div>`}</div>
      <div class="sect"><h2>Upcoming <span class="muted">· next 7 days</span></h2>
        ${soon.length ? `<div class="twrap"><table class="tbl"><thead><tr><th scope="col" class="stick">Date</th><th scope="col">Time</th><th scope="col">Project code</th><th scope="col">Site</th><th scope="col">Session</th><th scope="col">Groups presented so far</th><th scope="col" class="r">Students</th><th scope="col"><span class="sr">Actions</span></th></tr></thead><tbody>
          ${soon.map(x => { const k = x.nx.key, n = (x.p.groups || []).length; return `<tr><td class="stick">${esc(fmtD(x.nx.date))}</td><td>${esc(timeLabel(x.p))}</td><td><b>${esc(x.p.code)}</b></td><td>${dot(x.site.id)}${esc(x.site.name)}</td><td><span class="tool">${esc(x.nx.label)}</span></td><td>${k === "kickoff" ? `<span class="muted">Kick-off</span>` : bar(counts(x.p, k), n)}</td><td class="r">${x.students.length}</td><td><button class="btn ghost sm" data-open="${esc(x.site.id + "|" + x.p.code)}" data-sub="groups">View</button></td></tr>`; }).join("")}
        </tbody></table></div>` : `<div class="empty sm"><b>Nothing scheduled in the next 7 days</b></div>`}</div>`;
  }

  /* ---------- Project codes ---------- */
  const PCOLS = [["timing", "Timing"], ["next", "Next session"], ["groups", "Groups"], ...COLS.map(([k, l]) => ["st_" + k, l]), ["students", "Students"], ["today", "Today"], ["d7", "7 days"]];
  function projectsHtml(M) {
    const q = S.pq.trim().toLowerCase(); const H = new Set(S.hide);
    let rows = M.projects.filter(x => inSite(x.site.id) && (!q || (x.p.code + " " + x.site.name).toLowerCase().includes(q)));
    const key = { code: x => String(x.p.code), site: x => x.site.name, timing: x => x.orphan ? 9 : +x.p.presDay, next: x => x.nx ? x.nx.date + times(x.p)[0] : "9999", groups: x => (x.p.groups || []).length, students: x => x.students.length, today: x => x.visitedToday, d7: x => x.active7 }[S.psort[0]] || (x => x.p.code);
    rows = rows.slice().sort((a, b) => { const A = key(a), B = key(b); return (A > B ? 1 : A < B ? -1 : 0) * S.psort[1] || String(a.p.code).localeCompare(b.p.code); });
    const vis = (k) => !H.has(k);
    return `<div class="bar2"><input id="tk-pq" type="search" placeholder="Search project code or site…" value="${esc(S.pq)}" aria-label="Search project codes">
        <div class="colsm"><button class="btn ghost" id="tk-cols" aria-expanded="${S.colsOpen}" aria-haspopup="true">Columns</button>
          ${S.colsOpen ? `<div class="pop right" role="group" aria-label="Show columns">${PCOLS.map(([k, l]) => `<label><input type="checkbox" data-col="${k}" ${vis(k) ? "checked" : ""}> ${esc(l)}</label>`).join("")}</div>` : ""}</div>
        <span class="muted">${rows.length} project code${rows.length === 1 ? "" : "s"}</span></div>
      ${rows.length ? `<div class="twrap tall"><table class="tbl"><thead><tr>${th(S.psort, "code", "Project code", "stick")}
        ${vis("timing") ? th(S.psort, "timing", "Timing") : ""}${vis("next") ? th(S.psort, "next", "Next session") : ""}${vis("groups") ? th(S.psort, "groups", "Groups", "r") : ""}
        ${COLS.filter(([k]) => vis("st_" + k)).map(([, l]) => `<th scope="col">${l}</th>`).join("")}
        ${vis("students") ? th(S.psort, "students", "Students", "r") : ""}${vis("today") ? th(S.psort, "today", "Today", "r") : ""}${vis("d7") ? th(S.psort, "d7", "7 days", "r") : ""}</tr></thead><tbody>
        ${rows.map(x => { const n = (x.p.groups || []).length, id = esc(x.site.id + "|" + x.p.code); return `<tr data-open="${id}" tabindex="0" title="Open groups and attendance for ${esc(x.p.code)}">
          <td class="stick"><b>${esc(x.p.code)}</b><div class="sub">${dot(x.site.id)}${esc(x.site.name)}</div></td>
          ${vis("timing") ? `<td>${x.orphan ? `<span class="muted">n/a</span>` : `${DAYS[+x.p.presDay] || ""} · ${esc(timeLabel(x.p))}`}</td>` : ""}
          ${vis("next") ? `<td>${x.orphan ? `<span class="muted">Students with a deleted or missing code</span>` : x.nx ? `${esc(x.nx.label)}<div class="sub">${esc(fmtD(x.nx.date))}</div>` : `<span class="chip done">Completed</span>`}</td>` : ""}
          ${vis("groups") ? `<td class="r">${x.orphan ? `<span class="muted">n/a</span>` : n}</td>` : ""}
          ${COLS.filter(([k]) => vis("st_" + k)).map(([k]) => `<td>${x.orphan ? `<span class="muted">n/a</span>` : bar(counts(x.p, k), n)}</td>`).join("")}
          ${vis("students") ? `<td class="r">${x.students.length}</td>` : ""}${vis("today") ? `<td class="r">${x.visitedToday}</td>` : ""}${vis("d7") ? `<td class="r">${x.active7}</td>` : ""}</tr>`; }).join("")}
        </tbody></table></div>
        <p class="note"><span class="seg-k d"></span>presented <span class="seg-k a"></span>nobody from the group presented <span class="seg-k p"></span>pending · Click a row for groups, members and day-by-day attendance.</p>`
        : `<div class="empty"><b>${q ? "No project code matches your search" : "No project codes yet"}</b><span>${q ? "Try another code or site name." : "Create project codes on each site's Project Schedule page."}</span></div>`}`;
  }

  /* ---------- Students ---------- */
  function studentsHtml(M) {
    const t = M.t, q = S.q.trim().toLowerCase(), ds = rangeDays();
    const base = M.students.filter(s => inSite(s.site));
    const codes = [...new Set(base.map(s => s.batch || "(none)"))].sort();
    const groups = [...new Set(base.filter(s => S.fCode === "all" || (s.batch || "(none)") === S.fCode).map(s => s.group || "(none)"))].sort();
    let list = base.filter(s => (S.fCode === "all" || (s.batch || "(none)") === S.fCode) && (S.fGroup === "all" || (s.group || "(none)") === S.fGroup)
      && (S.fAct === "all" || (S.fAct === "today" ? s.days.includes(t) : S.fAct === "week" ? s.days.some(d => d >= addDays(t, -6)) : !s.days.some(d => d >= addDays(t, -6))))
      && (!q || [s.name, s.group, s.batch, s.last4, s.siteName].join(" ").toLowerCase().includes(q)));
    const inR = (s) => s.days.filter(d => d >= ds[0]).length;
    const key = { name: s => s.name.toLowerCase(), site: s => s.siteName, code: s => s.batch || "", group: s => s.group || "", prog: s => s.prog && s.prog.pct != null ? +s.prog.pct : -1, sql: s => s.prog && s.prog.sql != null ? +s.prog.sql : -1, days: inR, last: s => s.last || 0 }[S.ssort[0]] || (s => s.last);
    list = list.slice().sort((a, b) => { const A = key(a), B = key(b); return (A > B ? 1 : A < B ? -1 : 0) * S.ssort[1]; });
    const opt = (v, cur, l) => `<option value="${esc(v)}" ${cur === v ? "selected" : ""}>${esc(l || v)}</option>`;
    return `<div class="bar2"><input id="tk-q" type="search" placeholder="Search name, group, project code or last 4 mobile digits…" value="${esc(S.q)}" aria-label="Search students">
        <select id="tk-fcode" aria-label="Project code">${opt("all", S.fCode, "All project codes")}${codes.map(c => opt(c, S.fCode)).join("")}</select>
        <select id="tk-fgroup" aria-label="Group">${opt("all", S.fGroup, "All groups")}${groups.map(g => opt(g, S.fGroup)).join("")}</select>
        <select id="tk-fact" aria-label="Activity">${opt("all", S.fAct, "Any activity")}${opt("today", S.fAct, "Checked in today")}${opt("week", S.fAct, "Active last 7 days")}${opt("idle", S.fAct, "Inactive 7+ days")}</select>
        <span class="muted">${list.length} of ${base.length}</span></div>
      ${list.length ? `<div class="twrap tall"><table class="tbl"><thead><tr>${th(S.ssort, "name", "Student", "stick")}${th(S.ssort, "site", "Site")}${th(S.ssort, "code", "Project code")}${th(S.ssort, "group", "Group")}
        ${th(S.ssort, "prog", "Site progress")}${th(S.ssort, "sql", "SQL solved", "r")}${th(S.ssort, "days", `Days (${S.days}d)`, "r")}<th scope="col">Check-ins</th>${th(S.ssort, "last", "Last visit")}<th scope="col"><span class="sr">Actions</span></th></tr></thead><tbody>
        ${list.slice(0, 500).map(s => { const idle = !s.days.some(d => d >= addDays(t, -6)); const pid = esc(s.site + "|" + (M.projects.find(x => x.site.id === s.site && !x.orphan && norm(x.p.code) === norm(s.batch)) ? M.projects.find(x => x.site.id === s.site && norm(x.p.code) === norm(s.batch)).p.code : "(no / old code)"));
          return `<tr><td class="stick"><b>${esc(s.name)}</b><div class="sub">${s.last4 ? "📱 ••" + esc(s.last4) : "no mobile"}${s.devices > 1 ? ` · ${s.devices} devices` : ""}</div></td>
          <td>${dot(s.site)}${esc(s.siteName)}</td><td>${esc(s.batch || "—")}</td><td>${esc(s.group || "—")}</td>
          <td>${s.prog && s.prog.pct != null ? `<span class="pbar" title="Progress tracked on the project site"><i style="width:${Math.max(0, Math.min(100, +s.prog.pct))}%"></i></span> ${Math.round(+s.prog.pct)}%` : `<span class="muted" title="This student hasn't synced progress from the site yet">Not synced</span>`}</td>
          <td class="r">${s.prog && s.prog.sql != null ? esc(s.prog.sql) : `<span class="muted">—</span>`}</td>
          <td class="r">${inR(s)}${s.days.includes(t) ? ` <span class="chip live">today</span>` : idle ? ` <span class="chip warn">idle</span>` : ""}</td>
          <td>${spark(s.days)}</td><td title="${s.last ? esc(new Date(s.last).toLocaleString("en-IN")) : ""}">${s.last ? rel(s.last) : "—"}</td>
          <td><button class="btn ghost sm" data-open="${pid}" data-sub="att" title="Open this student's project code">Project</button></td></tr>`; }).join("")}
        </tbody></table></div>${list.length > 500 ? `<p class="note">Showing the first 500. Narrow the search or use Export CSV for everyone.</p>` : ""}`
        : `<div class="empty"><b>${base.length ? "No student matches these filters" : "No students have checked in yet"}</b><span>${base.length ? "Clear the search or change the filters." : "Students appear here after they log in on a project site with their mobile number."}</span></div>`}`;
  }
  function rangeDays() { const t = today(); return Array.from({ length: +S.days }, (_, i) => addDays(t, i - (+S.days - 1))); }
  function spark(days) { const set = new Set(days); const ds = rangeDays().slice(-30); return `<span class="spark" role="img" aria-label="${ds.filter(d => set.has(d)).length} check-ins in the last ${ds.length} days">${ds.map(d => `<i class="${set.has(d) ? "on" : ""}" title="${esc(fmtShort(d))}"></i>`).join("")}</span>`; }

  /* ---------- Daily visits ---------- */
  function visitsHtml(M) {
    const ds = rangeDays(), t = M.t; const sites = S.data.sites.filter(s => inSite(s.id));
    const rep = sites.filter(s => s.report);
    if (!rep.length) return emptyNA();
    const val = (s, d) => { const r = (s.report.daily || []).find(x => x.day === d); return r ? (r.named || 0) : 0; };
    const per = ds.map(d => rep.map(s => val(s, d))); const tot = per.map(a => a.reduce((x, y) => x + y, 0));
    const sum = tot.reduce((a, b) => a + b, 0), avg = sum / ds.length, peakI = tot.indexOf(Math.max(...tot));
    const last7 = tot.slice(-8, -1), avg7 = last7.length ? last7.reduce((a, b) => a + b, 0) / last7.length : 0, tdy = tot[tot.length - 1];
    const max = Math.max(1, ...tot), W = 1000, H = 250, L = 36, B = 30, bw = (W - L - 8) / ds.length;
    let g = ""; for (let y = 0; y <= 4; y++) { const vv = Math.round(max * y / 4), yy = H - B - (H - B - 14) * y / 4; g += `<line x1="${L}" x2="${W}" y1="${yy}" y2="${yy}" stroke="#E3E8EF"/><text x="${L - 6}" y="${yy + 4}" font-size="11" text-anchor="end" fill="#64748B">${vv}</text>`; }
    ds.forEach((d, i) => { let y0 = H - B; rep.forEach((s, j) => { const v = per[i][j]; if (!v) return; const h = (H - B - 14) * v / max; y0 -= h; g += `<rect x="${L + i * bw + bw * .15}" y="${y0 + 1}" width="${Math.max(2, bw * .7)}" height="${Math.max(1, h - 1)}" rx="2" fill="${siteColor(s.id)}"><title>${esc(s.name)} · ${esc(fmtD(d))}: ${v}</title></rect>`; });
      if (d === t) g += `<text x="${L + i * bw + bw / 2}" y="${H - B - (H - B - 14) * tot[i] / max - 6}" font-size="11" font-weight="700" text-anchor="middle" fill="#0F1E3D">${tot[i]}</text>`;
      if (i % Math.max(1, Math.ceil(ds.length / 10)) === 0 || d === t) g += `<text x="${L + i * bw + bw / 2}" y="${H - 10}" font-size="10.5" text-anchor="middle" fill="${d === t ? "#0F1E3D" : "#64748B"}" font-weight="${d === t ? 700 : 400}">${d === t ? "Today" : esc(fmtShort(d))}</text>`; });
    const T = [["Check-ins in range", sum, `last ${ds.length} days`], ["Average per day", avg.toFixed(1), "students checked in"], ["Busiest day", tot[peakI] ? tot[peakI] : 0, tot[peakI] ? fmtD(ds[peakI]) : "no check-ins"], ["Today", tdy, `7-day average ${avg7.toFixed(1)}`]];
    return `<div class="kpis four">${T.map(([l, v, c]) => `<div class="kpi"><span class="kl">${esc(l)}</span><b class="kv">${esc(v)}</b><span class="kc">${esc(c)}</span></div>`).join("")}</div>
      <div class="card"><div class="ch"><h2>Students checked in per day</h2><span class="muted">Each student counts once per site per day</span></div>
        <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Daily check-ins for the last ${ds.length} days">${g}</svg>
        ${rep.length > 1 ? `<div class="legend">${rep.map(s => `<span>${dot(s.id)}${esc(s.name)}</span>`).join("")}</div>` : ""}</div>
      <div class="sect"><h2>By site</h2><div class="twrap"><table class="tbl"><thead><tr><th scope="col" class="stick">Site</th><th scope="col">Status</th><th scope="col" class="r">Check-ins (${ds.length}d)</th><th scope="col" class="r">Avg / day</th><th scope="col" class="r">Last 7 days</th><th scope="col" class="r">Today</th><th scope="col" class="r">Unique visitors (all time)</th></tr></thead><tbody>
        ${sites.map(s => { if (!s.report) { const st = STATE[s.state] || [s.state, "bad"]; return `<tr><td class="stick">${dot(s.id)}${esc(s.name)}</td><td><span class="st ${st[1]}">${esc(st[0])}</span></td><td class="r muted" colspan="5">Not available</td></tr>`; }
          const a = ds.map(d => val(s, d)), sm = a.reduce((x, y) => x + y, 0);
          return `<tr><td class="stick">${dot(s.id)}${esc(s.name)}</td><td><span class="st ok">Connected</span></td><td class="r">${sm}</td><td class="r">${(sm / ds.length).toFixed(1)}</td><td class="r">${a.slice(-7).reduce((x, y) => x + y, 0)}</td><td class="r">${a[a.length - 1]}</td><td class="r">${s.report.unique != null ? s.report.unique : "—"}</td></tr>`; }).join("")}
      </tbody></table></div></div>`;
  }

  /* ---------- project code drawer ---------- */
  function detailHtml(M) {
    const x = M.projects.find(y => y.site.id + "|" + y.p.code === S.open); if (!x) return "";
    const p = x.p, n = (p.groups || []).length, ds = rangeDays(), presDates = new Set(Object.values(x.ds || {}));
    const shown = S.onlyPres ? ds.filter(d => presDates.has(d)) : ds;
    const byGroup = {}; x.students.forEach(s => { (byGroup[gnorm(s.group)] = byGroup[gnorm(s.group)] || []).push(s); });
    const ic = { done: ["✅", "Presented"], pending: ["⏳", "Pending"], absent: ["❌", "Nobody presented"] };
    const sub = x.orphan ? "att" : S.sub;
    const groups = `<div class="twrap"><table class="tbl mx"><thead><tr><th scope="col" class="stick">Group</th><th scope="col">Members (from site)</th><th scope="col">Students checked in</th>${COLS.map(([k, l]) => `<th scope="col" class="c">${l}${x.ds[k] ? `<div class="sub">${esc(fmtShort(x.ds[k]))}</div>` : ""}</th>`).join("")}<th scope="col">Note</th></tr></thead><tbody>
      ${(p.groups || []).map(g => { const st = (p.status && p.status[g.id]) || {}; const s2 = byGroup[gnorm(g.name)] || [];
        return `<tr><td class="stick"><b>${esc(g.name)}</b></td><td class="wrap">${esc(g.members || "—")}</td><td class="wrap">${s2.map(s => esc(s.name)).join(", ") || '<span class="muted">None yet</span>'}</td>${COLS.map(([k]) => { const v = gStatus(p, g, k); return `<td class="c" title="${ic[v][1]}"><span aria-label="${ic[v][1]}">${ic[v][0]}</span></td>`; }).join("")}<td class="wrap">${esc(st.note || "")}</td></tr>`; }).join("") || `<tr><td colspan="9" class="muted">No groups on this project code.</td></tr>`}
      <tr class="tot"><td class="stick">Presented</td><td></td><td>${x.students.length} students</td>${COLS.map(([k]) => `<td class="c">${counts(p, k).done}/${n}</td>`).join("")}<td></td></tr></tbody></table></div>`;
    const att = `<div class="bar2"><label class="switch"><input type="checkbox" id="tk-only" ${S.onlyPres ? "checked" : ""}><span class="knob" aria-hidden="true"></span>Only session days</label><button class="btn ghost sm" id="tk-csv-one">⬇ Export this code (CSV)</button></div>
      ${shown.length ? `<div class="twrap att-wrap"><table class="tbl att"><thead><tr><th scope="col" class="stick">Student</th>${shown.map(d => `<th scope="col" class="c ${presDates.has(d) ? "pres" : ""}" title="${esc(fmtD(d))}${presDates.has(d) ? " · session day" : ""}">${esc(DAYS[parse(d).getDay()][0])}<br>${parse(d).getDate()}</th>`).join("")}</tr></thead><tbody>
      ${x.students.slice().sort((a, b) => String(a.group).localeCompare(b.group) || a.name.localeCompare(b.name)).map(s => { const set = new Set(s.days); return `<tr><td class="stick"><b>${esc(s.name)}</b>${s.last4 ? ` <span class="muted">••${esc(s.last4)}</span>` : ""}<div class="sub">${esc(s.group || "No group")} · ${shown.filter(d => set.has(d)).length}/${shown.length} days</div></td>${shown.map(d => `<td class="c ${presDates.has(d) ? "pres" : ""}">${set.has(d) ? '<span class="ck" aria-label="checked in">●</span>' : ""}</td>`).join("")}</tr>`; }).join("") || `<tr><td colspan="${1 + shown.length}" class="muted">No student has checked in with this project code yet.</td></tr>`}
      <tr class="tot"><td class="stick">Checked in that day</td>${shown.map(d => `<td class="c ${presDates.has(d) ? "pres" : ""}">${x.students.filter(s => s.days.includes(d)).length || ""}</td>`).join("")}</tr></tbody></table></div>` : `<div class="empty sm"><b>No session day in the selected range</b></div>`}
      <p class="note">● the student opened the project site that day (site check-in, not classroom attendance). Shaded columns are session days.</p>`;
    return `<div class="ov" id="tk-ov"><div class="drawer" role="dialog" aria-modal="true" aria-labelledby="dr-h">
      <div class="dh"><div><h2 id="dr-h">${esc(p.code)} <span class="muted">${dot(x.site.id)}${esc(x.site.name)}</span></h2>
        <p class="muted">${x.orphan ? "Students who checked in with a project code that no longer exists, or none." : `Kick-off ${esc(fmtD(x.ds.kickoff))} · every ${esc(["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][+p.presDay])}, ${esc(timeLabel(p))} · ${n} groups · ${x.nx ? "next: " + esc(x.nx.label) + ", " + esc(fmtD(x.nx.date)) : "completed"}`}</p></div>
        <div class="acts"><a class="btn ghost sm" href="${esc(x.site.url)}" target="_blank" rel="noopener" title="Open the project site to update statuses">Open site ↗</a><button class="btn ghost sm icon" id="tk-close" aria-label="Close">✕</button></div></div>
      ${x.orphan ? "" : `<nav class="tabs sm" role="tablist">${[["groups", "Groups & presentations"], ["att", "Attendance by day"]].map(([k, l]) => `<button role="tab" aria-selected="${sub === k}" class="${sub === k ? "on" : ""}" data-sub="${k}">${l}</button>`).join("")}</nav>`}
      ${sub === "att" ? att : groups}</div></div>`;
  }

  /* ---------- CSV ---------- */
  const csvCell = (v) => { const s = String(v == null ? "" : v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  function download(name, rows) { const blob = new Blob(["﻿" + rows.map(r => r.map(csvCell).join(",")).join("\n")], { type: "text/csv" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); return rows.length - 1; }
  function csvAll() {
    const M = model(); const ds = rangeDays(); const list = M.students.filter(s => inSite(s.site));
    if (!list.length) return toast("Nothing to export for this selection.");
    download(`attendance-${S.site === "all" ? "all-sites" : S.site}-${today()}.csv`, [["Site", "Project code", "Group", "Student", "Mobile (last 4)", "Site progress %", "SQL solved", "Days checked in", ...ds],
      ...list.map(s => { const set = new Set(s.days); return [s.siteName, s.batch, s.group, s.name, s.last4, s.prog && s.prog.pct != null ? Math.round(s.prog.pct) : "", s.prog && s.prog.sql != null ? s.prog.sql : "", ds.filter(d => set.has(d)).length, ...ds.map(d => set.has(d) ? 1 : 0)]; })]);
    toast(`CSV with ${list.length} student${list.length === 1 ? "" : "s"} sent to your downloads.`);
  }
  function csvOne() {
    const M = model(); const x = M.projects.find(y => y.site.id + "|" + y.p.code === S.open); if (!x) return; const ds = rangeDays();
    download(`attendance-${String(x.p.code).replace(/[^\w-]+/g, "_")}-${today()}.csv`, [["Student", "Group", "Mobile (last 4)", "Days checked in", ...ds], ...x.students.map(s => { const set = new Set(s.days); return [s.name, s.group, s.last4, ds.filter(d => set.has(d)).length, ...ds.map(d => set.has(d) ? 1 : 0)]; }),
      [], ["Group", ...COLS.map(c => c[1]), "Note"], ...(x.p.groups || []).map(g => [g.name, ...COLS.map(([k]) => gStatus(x.p, g, k)), ((x.p.status || {})[g.id] || {}).note || ""])]);
    toast(`CSV for ${x.p.code} sent to your downloads.`);
  }

  /* ---------- events ---------- */
  function bind() {
    const on = (s, ev, fn) => { const el = $(s); if (el) el.addEventListener(ev, fn); };
    on("#tk-login", "submit", e => { e.preventDefault(); load($("#tk-u").value.trim(), $("#tk-p").value); });
    on("#tk-ref", "click", refresh); on("#tk-retry", "click", refresh);
    on("#tk-out", "click", () => { ss.del("pvt_u"); ss.del("pvt_p"); S.data = null; S.open = null; S.error = ""; clearInterval(timer); render(); });
    on("#tk-days", "change", e => { S.days = +e.target.value; ls.set("pvt_days", S.days); refresh(); });
    on("#tk-auto", "change", e => { S.auto = e.target.checked; ls.set("pvt_auto", S.auto); schedule(); render(); });
    on("#tk-csv", "click", csvAll); on("#tk-csv-one", "click", csvOne);
    on("#tk-only", "change", e => { S.onlyPres = e.target.checked; render(); });
    on("#tk-sites", "click", e => { e.stopPropagation(); S.sitesOpen = !S.sitesOpen; S.colsOpen = false; render(); if (S.sitesOpen) { const q = $("#tk-siteq"); if (q) q.focus(); } });
    on("#tk-siteq", "input", e => { S.siteQ = e.target.value; keepFocus("tk-siteq", render); });
    on("#tk-siteq", "keydown", e => { if (e.key === "ArrowDown") { e.preventDefault(); const b = document.querySelector("#tk-pop [data-site]"); if (b) b.focus(); } });
    on("#tk-pop", "keydown", e => { if (!["ArrowDown", "ArrowUp"].includes(e.key)) return; e.preventDefault(); const bs = [...document.querySelectorAll("#tk-pop [data-site]")]; const i = bs.indexOf(document.activeElement); const n = bs[Math.max(0, Math.min(bs.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)))]; if (n) n.focus(); });
    document.querySelectorAll(".pop").forEach(p => p.addEventListener("click", e => e.stopPropagation()));
    on("#tk-cols", "click", e => { e.stopPropagation(); S.colsOpen = !S.colsOpen; S.sitesOpen = false; render(); });
    document.querySelectorAll("[data-col]").forEach(c => { c.addEventListener("click", e => e.stopPropagation()); c.addEventListener("change", () => { const k = c.dataset.col; S.hide = c.checked ? S.hide.filter(x => x !== k) : [...S.hide, k]; ls.set("pvt_hide", S.hide); render(); }); });
    on("#tk-pq", "input", e => { S.pq = e.target.value; keepFocus("tk-pq", render); });
    on("#tk-q", "input", e => { S.q = e.target.value; keepFocus("tk-q", render); });
    on("#tk-fcode", "change", e => { S.fCode = e.target.value; S.fGroup = "all"; render(); });
    on("#tk-fgroup", "change", e => { S.fGroup = e.target.value; render(); });
    on("#tk-fact", "change", e => { S.fAct = e.target.value; render(); });
    document.querySelectorAll("[data-sort]").forEach(b => b.addEventListener("click", () => {
      const k = b.dataset.sort, which = S.tab === "students" ? "ssort" : "psort"; const cur = S[which];
      S[which] = cur[0] === k ? [k, -cur[1]] : [k, ["last", "today", "d7", "students", "days", "prog", "sql"].includes(k) ? -1 : 1]; ls.set("pvt_" + which, S[which]); render();
      const nb = document.querySelector(`[data-sort="${k}"]`); if (nb) nb.focus(); }));
    const tabs = [...document.querySelectorAll('[role="tab"][data-tab]')];
    tabs.forEach((b, i) => { b.addEventListener("click", () => { S.tab = b.dataset.tab; ls.set("pvt_tab", S.tab); render(); const nb = document.getElementById("tab-" + S.tab); if (nb) nb.focus(); });
      b.addEventListener("keydown", e => { if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return; e.preventDefault(); const j = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length; tabs[j].click(); }); });
    document.querySelectorAll("[data-site]").forEach(b => b.addEventListener("click", () => { S.site = b.dataset.site; ls.set("pvt_site", S.site); S.sitesOpen = false; S.siteQ = ""; S.fCode = "all"; S.fGroup = "all"; render(); const sb = $("#tk-sites"); if (sb) sb.focus(); }));
    document.querySelectorAll(".drawer [data-sub]").forEach(b => b.addEventListener("click", () => { S.sub = b.dataset.sub; render(); }));
    document.querySelectorAll("[data-open]").forEach(b => { const go = (e) => { if (e) e.stopPropagation(); S.open = b.dataset.open; S.sub = b.dataset.sub || "groups"; render(); const c = $("#tk-close"); if (c) c.focus(); };
      b.addEventListener("click", go); if (b.tagName === "TR") b.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } }); });
    const close = () => { const back = S.open; S.open = null; render(); const r = document.querySelector(`[data-open="${CSS.escape(back || "")}"]`); if (r) r.focus(); };
    on("#tk-close", "click", close); on("#tk-ov", "click", e => { if (e.target.id === "tk-ov") close(); });
  }
  document.addEventListener("click", () => { if (S.sitesOpen || S.colsOpen) { S.sitesOpen = false; S.colsOpen = false; render(); } });
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (S.sitesOpen || S.colsOpen) { S.sitesOpen = false; S.colsOpen = false; render(); const b = $("#tk-sites"); if (b) b.focus(); }
    else if (S.open) { $("#tk-close") && $("#tk-close").click(); }
  });
  setInterval(() => { const u = $("#tk-upd"); if (u && S.data && !S.loading) u.textContent = `Updated ${new Date(S.data.checkedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} · ${rel(S.data.checkedAt)}${S.auto ? " · auto every 2 min" : ""}`; }, 30000);
  render();
  if (ss.get("pvt_u") && ss.get("pvt_p")) refresh();
})();
