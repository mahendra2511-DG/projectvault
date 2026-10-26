/**
 * ProjectVault — Trainer tracking hub (Vercel serverless function), URL: /api/hub
 *
 * Reads every capstone site's own live API (/api/schedule) from the server, so the browser has no cross-site
 * (CORS) problems and nothing new is stored here:
 *   - GET  {site}/api/schedule                       → project codes, groups, presentation statuses
 *   - POST {site}/api/schedule {action:"report"}      → students, their group / project code and visit dates
 * The trainer's username + password are checked by the sites themselves (same login as on every site) and are
 * never stored. Only the fixed list of sites below is ever called. Optional env HUB_SITES = JSON list to override.
 *
 *   POST {user, pass, days} → {ok, checkedAt, sites:[{id, name, url, state, error, projects, report}]}
 */
const SITES = [
  { id: "marketing", name: "AXon Marketing Analytics", url: "https://marketingpr.vercel.app/" },
  { id: "hr", name: "Proxima HR Analytics", url: "https://hrnalytics.vercel.app/" },
  { id: "crm", name: "AXon CRM", url: "https://crm-ruddy-xi-99.vercel.app/" },
  { id: "hospitality", name: "Shodwe Hotels", url: "https://hospitality-neon.vercel.app/" },
  { id: "manufacturing", name: "AXon Manufacturing", url: "https://manufacturing-delta.vercel.app/" },
  { id: "swiggy", name: "Swiggy Data Analytics", url: "https://swiggypr-eight.vercel.app/" },
  { id: "ecommerce", name: "ShopNova E-Commerce", url: "https://e-commerce-theta-ten-42.vercel.app/" },
  { id: "supply-chain", name: "Supply Chain Analytics", url: "https://supply-chain-omega-two.vercel.app/" },
  { id: "healthcare", name: "AXON Healthcare (EMR)", url: "https://emr-site-nine.vercel.app/" },
  { id: "insurance", name: "InsureIQ", url: "https://insurance-iq.vercel.app/" },
  { id: "stock", name: "ALPHA Stock Analytics", url: "https://stock-market-project-iota.vercel.app/" },
  { id: "payflow", name: "PayFlow Fintech Analytics", url: "https://fintechpayflow.vercel.app/" },
];
const hits = new Map();
function sites() {
  try { const s = JSON.parse(process.env.HUB_SITES || "null"); if (Array.isArray(s) && s.length) return s.filter(x => x && /^https?:\/\//.test(x.url)); } catch (e) {}
  return SITES.filter(s => s.url);
}
async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  return await new Promise(r => { let d = ""; req.on("data", c => { d += c; if (d.length > 20000) req.destroy(); }); req.on("end", () => { try { r(JSON.parse(d || "{}")); } catch (e) { r({}); } }); req.on("error", () => r({})); });
}
const send = (res, code, obj) => { res.statusCode = code; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(obj)); };
const api = (s) => s.url.replace(/\/?$/, "/") + "api/schedule";
async function call(url, opts, ms) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms || 9000);
  try { const r = await fetch(url, Object.assign({ signal: ac.signal, headers: { "Content-Type": "application/json" } }, opts || {})); const j = await r.json().catch(() => null); return { status: r.status, j }; }
  catch (e) { return { status: 0, j: null, error: e.name === "AbortError" ? "timeout" : "unreachable" }; }
  finally { clearTimeout(t); }
}

module.exports = async (req, res) => {
  if (req.method === "GET") return send(res, 200, { ok: true, sites: sites().map(s => ({ id: s.id, name: s.name, url: s.url })) });
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "method" });
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "?").split(",")[0].trim();
  const now = Date.now(); const a = (hits.get(ip) || []).filter(t => now - t < 60000);
  if (a.length >= 12) return send(res, 429, { ok: false, error: "Too many refreshes. Wait a minute." });
  a.push(now); hits.set(ip, a);

  const b = await readBody(req);
  const user = String(b.user || "").trim(), pass = String(b.pass || ""), days = Math.min(Math.max(+b.days || 30, 7), 120);
  if (!user || !pass) return send(res, 400, { ok: false, error: "Enter username and password." });
  const list = sites();

  // 1) check the login on ONE connected site first, so a wrong password doesn't count as a failed login on all 11
  const probes = await Promise.all(list.map(s => call(api(s) + "?fresh=1", { method: "GET" }, 8000)));   // always the latest status
  const connected = list.map((s, i) => ({ s, p: probes[i] })).filter(x => x.p.status === 200 && x.p.j && x.p.j.configured !== false && Array.isArray(x.p.j.projects));
  if (!connected.length) return send(res, 200, { ok: true, checkedAt: now, warning: "No site has its live database connected yet.", sites: list.map((s, i) => row(s, probes[i], null)) });
  // try connected sites one by one: a wrong password stops at once, a site with a database problem is skipped
  let chk = null, okSite = false;
  for (const c of connected.slice(0, 4)) {
    chk = await call(api(c.s), { method: "POST", body: JSON.stringify({ action: "check", user, pin: pass }) }, 9000);
    if (chk.j && chk.j.ok) { okSite = true; break; }
    if (chk.status === 401 || chk.status === 429) break;
  }
  if (!okSite) return send(res, chk && chk.status === 429 ? 429 : chk && chk.status === 401 ? 401 : 502, { ok: false, error: (chk && chk.j && chk.j.error) || "Wrong username or password." });
  // login only: the dashboard shows its saved copy from the last update (12 PM / 8 PM) and does not read every site again
  if (b.checkOnly) return send(res, 200, { ok: true, checkOnly: true });

  // 2) reports from every connected site, in parallel
  const reps = await Promise.all(list.map((s, i) => {
    const p = probes[i]; if (!(p.status === 200 && p.j && p.j.configured !== false && Array.isArray(p.j.projects))) return Promise.resolve(null);
    return call(api(s), { method: "POST", body: JSON.stringify({ action: "report", user, pin: pass, days }) }, 12000);
  }));
  return send(res, 200, { ok: true, checkedAt: now, days, sites: list.map((s, i) => row(s, probes[i], reps[i])) });
};
const dbErr = (e) => /max requests limit/i.test(String(e || "")) ? "Upstash free monthly request limit used up for this site's database" : String(e || "The site's API returned an error").slice(0, 200);
function row(s, probe, rep) {
  const base = { id: s.id, name: s.name, url: s.url, projects: [], report: null, state: "ok", error: "" };
  if (!probe.j) return Object.assign(base, { state: "down", error: probe.error === "timeout" ? "Site did not answer in time" : "Site or /api/schedule not reachable (not deployed with the latest zip?)" });
  if (probe.j.configured === false) return Object.assign(base, { state: "nodb", error: "Live database (Upstash) not connected on this site" });
  if (probe.status !== 200 || !Array.isArray(probe.j.projects)) return Object.assign(base, { state: "error", error: dbErr(probe.j.error) });
  base.projects = Array.isArray(probe.j.projects) ? probe.j.projects : [];
  if (rep) {
    if (rep.j && rep.j.ok) base.report = { today: rep.j.today, unique: rep.j.unique, views: rep.j.views, daily: rep.j.daily || [], students: (rep.j.students || []).map(x => ({ name: x.name, group: x.group, batch: x.batch, last4: x.last4, uid: x.uid, first: x.first, last: x.last, views: x.views, days: x.days || [], lastPage: x.lastPage })),
      accounts: (rep.j.accounts || []).slice(0, 5000).map(a => ({ uid: a.uid, name: a.name, email: a.email, last4: a.last4, batch: a.batch, group: a.group, created: a.created, lastLogin: a.lastLogin, logins: a.logins, hasPw: !!a.hasPw })),
      logins: (rep.j.logins || []).slice(0, 200).map(l => ({ t: l.t, uid: l.uid, name: l.name, batch: l.batch, group: l.group, how: l.how })),
      progress: Object.fromEntries(Object.entries(rep.j.progress || {}).slice(0, 3000).map(([k, v]) => [k, { pct: v && v.pct, sql: v && v.sql, ts: v && v.ts, rv: v && v.rv, viva: v && v.viva, ins: v && v.ins, cert: v && v.cert }])) };
    else if (rep.status === 401) Object.assign(base, { state: "auth", error: "Login failed on this site (its trainer password may be different)" });
    else Object.assign(base, { state: "error", error: dbErr(rep.j && rep.j.error) });
  }
  return base;
}
