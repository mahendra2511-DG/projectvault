/* ProjectVault — Mahendra Singh's Data Analyst capstone project library.
   Static site (no build step). Everything the visitor changes (favourites, notes, progress,
   added projects) is saved in this browser only. */

const PROFILE = {
  name: "Mahendra Singh",
  role: "Data Analyst Trainer · ExcelR",
  photo: "assets/mahendra-photo.jpg",
  links: [
    { k: "medium", label: "Medium", icon: "M", url: "https://medium.com/@mahendraa1188" },
    { k: "youtube", label: "YouTube", icon: "▶", url: "https://www.youtube.com/channel/UC2q-vZWSlQpiGiMcSLUqnIg" },
    { k: "linkedin", label: "LinkedIn", icon: "in", url: "https://www.linkedin.com/in/mahendra-singh-%F0%9F%87%AE%F0%9F%87%B3%F0%9F%9A%80%E2%9D%84%EF%B8%8F-%F0%9F%90%8D-%F0%9F%A6%84-83699485/" },
  ],
};

const STD_TOOLS = ["Excel", "MySQL", "Tableau", "Power BI"];
const PROJECTS = [
  { id: "healthcare", tables: 7, name: "AXON Healthcare (EMR)", industry: "Healthcare", img: "healthcare.jpg", color: "#18a8e8", url: "https://emr-site-nine.vercel.app/",
    desc: "Hospital EMR data: patients, doctors, visits, treatments, lab tests, billing and insurance claims.",
    tools: STD_TOOLS, size: "7 tables · 10,000 patients · 1,000 doctors",
    kpis: ["Total Visits", "Visit Completion %", "Cancellation %", "Treatment Success %", "Lab Abnormal %", "Collection Rate %"],
    model: "Department → Doctor → Visit ← Patient. Treatment, Lab Test and Billing all hang off Visit ID, so Visit is the centre of the model.",
    sql: ["Visits and completion / cancellation rates", "Department and doctor workload", "Lab turnaround and abnormal results", "Billing, insurance coverage and collections"],
    insights: ["Visit is the grain: count everything per visit, then roll up to doctor and department", "Lab numeric results are empty for imaging and pending tests, which is expected", "Billing and lab results only make sense once linked back to the visit"] },
  { id: "manufacturing", tables: 9, name: "AXon Manufacturing", industry: "Manufacturing", img: "manufacturing.jpg", color: "#f4a500", url: "https://manufacturing-delta.vercel.app/",
    desc: "Garment plant production data: work orders, machines, operations, rejections, cost and delivery.",
    tools: STD_TOOLS, size: "9 tables · 10,000 work orders · 86 machines",
    kpis: ["Total Work Orders", "Efficiency Rate %", "Machine Utilization %", "Rejection Rate %", "On-Time Delivery %", "Cost per Unit"],
    model: "Star schema: fact_Production in the centre, joined to dim_Buyer, dim_Customer, dim_Employee, dim_Operation, dim_Machine, dim_Department, dim_Item and dim_Date.",
    sql: ["Filter the 679 blank rows (Doc_Num IS NULL) before every count", "Efficiency and utilization as ratios of sums", "Rejection rate by operation, machine and department", "On-time delivery and repeat orders by buyer"],
    insights: ["10,679 rows but only 10,000 real work orders", "On-time delivery is 32.94% (30.85% if the blank rows stay in)", "Rejection rate sits at 0.81%–0.84% in every department: no problem department"] },
  { id: "crm", tables: 5, name: "AXon CRM", industry: "CRM", img: "crm.jpg", color: "#16a89a", url: "https://crm-ruddy-xi-99.vercel.app/",
    desc: "Salesforce CRM exports loaded into Snowflake: leads, accounts, opportunities, products and sales reps.",
    tools: ["Excel", "Snowflake", "Tableau", "Power BI"], size: "5 tables · 10,000 leads · 4,646 opportunities",
    kpis: ["Total Leads", "Lead Conversion Rate", "Win Rate", "Open Pipeline", "Won Revenue", "Avg Deal Size"],
    model: "Raw → Staging → Mart in Snowflake. fact_opportunity is the centre; accounts and users join one-to-many, product lines hang off opportunity_id, leads link in after they convert.",
    sql: ["Lead funnel and conversion", "Pipeline by stage and rep", "Won revenue without double counting product lines", "Mart views vw_lead_funnel and vw_opp_summary"],
    insights: ["Three facts at three grains: lead, opportunity and product line", "Getting the grain wrong triples revenue", "Leads join to accounts and opportunities only after conversion"] },
  { id: "hr", tables: 18, name: "Proxima HR Analytics", industry: "HR", img: "hr.jpg", color: "#7357e8", url: "https://hrnalytics.vercel.app/",
    desc: "Workforce data across hiring, headcount, attrition, promotions, performance and pay.",
    tools: STD_TOOLS, size: "18 tables · 2,299 employees · 1,338 current headcount",
    kpis: ["Headcount (Closing)", "Attrition %", "Voluntary Attrition %", "New Hires", "Offer Acceptance Rate %", "Promotion Rate %"],
    model: "Employee is the hub, with department, role and location dimensions and separate event tables for hiring, exits, promotions and performance.",
    sql: ["Opening and closing headcount", "Attrition and voluntary attrition rates", "Hiring funnel and offer acceptance", "Promotion and retention rates"],
    insights: ["2,299 employees ever, 1,338 still on the books", "Attrition needs an average-headcount denominator, not the closing number", "Voluntary and regrettable attrition tell a different story from total attrition"] },
  { id: "ecommerce", tables: 5, name: "ShopNova E-Commerce", industry: "E-Commerce", img: "ecommerce.jpg", color: "#f04478", url: "https://e-commerce-theta-ten-42.vercel.app/",
    desc: "Online retail data: orders, customers, products, returns and marketing campaigns.",
    tools: STD_TOOLS, size: "5 tables · 7,562 order lines · 800 customers",
    kpis: ["GMV", "Net Revenue", "AOV", "Return Rate", "Repeat Purchase Rate", "ROAS / CAC"],
    model: "Customers → Orders ← Products, Orders → Returns. Campaigns has no key into Orders: it is one row per channel × month, so join it on channel and month only.",
    sql: ["GMV and net revenue after returns", "Cancellation and return rates", "3-day shipping SLA", "Channel ROAS and CAC"],
    insights: ["Repeat purchase rate is 48%", "Campaigns is pre-aggregated: never join it row by row to orders", "Coupon_Code is empty when no coupon was used, which is expected"] },
  { id: "swiggy", tables: 12, name: "Swiggy Data Analytics", industry: "Food Delivery", img: "swiggy.jpg", color: "#ff6b16", url: "https://swiggypr-eight.vercel.app/",
    desc: "Food-delivery data: orders, deliveries, payments, ratings, restaurants, menus and customers.",
    tools: STD_TOOLS, size: "12 tables · 10,000 orders · 499 restaurants",
    kpis: ["Total Revenue", "AOV", "Repeat Customers %", "On-Time Delivery %", "Cancellation Rate", "Customer Satisfaction Score"],
    model: "Orders is the hub. Delivery joins 1:1, Payments on Payment ID, Ratings on the 'ORD' number minus 999. Menu links only to Restaurant: there is no order-items table.",
    sql: ["Revenue, AOV and revenue per customer", "Repeat customers counted per customer", "On-time % from Delivery Status = 'On Time'", "The ORD-offset join for payments and ratings"],
    insights: ["Revenue ₹1,04,33,244 from 10,000 orders (AOV ₹1,043.32)", "Repeat customers 41.73% (the KPI sheet's formula wrongly gives 100%)", "Two order-status columns agree on only 16.6% of rows"] },
  { id: "stock", tables: 13, name: "ALPHA Stock Analytics", industry: "Finance / Stock", img: "stock.jpg", color: "#159a69", url: "https://stock-market-project-iota.vercel.app/",
    desc: "Market data for 8 NSE and NASDAQ companies: prices, orders, trades, positions, dividends and P&L.",
    tools: STD_TOOLS, size: "13 tables · 1,032 price rows · 500 trades",
    kpis: ["Daily Return", "Volatility", "Portfolio Value", "Order Fill Rate", "Fees", "Realized P&L"],
    model: "Load the small dimensions first (exchange, sector, company, trader, portfolio, calendar), then the facts. fact_trades links back to fact_orders; trade P&L is derived from the sell trades.",
    sql: ["Daily returns with LAG", "Volatility per company", "Fees by desk and trader", "Win rate and realized P&L"],
    insights: ["Split-unadjusted prices make returns look wrong: use the adjusted close", "Every order maps to exactly one trade", "Suspect-volume rows are flagged, not deleted"] },
  { id: "insurance", tables: 16, name: "InsureIQ", industry: "Insurance", img: "insurance.jpg", color: "#1d70e8", url: "https://insurance-iq.vercel.app/",
    desc: "Insurance broker branch performance plus a 5,000-policy book with customers, claims and payments.",
    tools: STD_TOOLS, size: "2 datasets · 16 tables · 51 account executives",
    kpis: ["New Business Achievement %", "Cross-Sell Achievement %", "Renewal Achievement %", "Placed vs Invoiced", "Open Pipeline", "Claims Ratio"],
    model: "Branch Data is exec-centric: every fact (brokerage, fees, invoices, meetings, opportunities, budgets) joins through the account executive. Policy Data is a simple star around Policy Details. Keep them as two schemas.",
    sql: ["Achievement % against New / Cross-Sell / Renewal budgets", "Placed vs invoiced revenue", "Pipeline and meetings per exec", "Policy, claims and payment KPIs"],
    insights: ["Two datasets, two schemas: don't force a join between them", "Budgets are per exec, so achievement is computed per exec first", "Pipeline and meetings explain who will hit target next"] },
  { id: "hospitality", tables: 5, name: "Shodwe Hotels", industry: "Hospitality", img: "hospitality.jpg", color: "#c88b12", url: "https://hospitality-neon.vercel.app/",
    desc: "Hotel booking data for 25 hotels in 4 cities: bookings, capacity, revenue and ratings, May–July 2022.",
    tools: STD_TOOLS, size: "5 tables · 134,590 bookings · 25 hotels",
    kpis: ["Revenue", "ADR", "RevPAR", "Occupancy %", "Cancellation %", "Realisation %"],
    model: "Two facts at two grains: fact_bookings (one row per booking) and fact_aggregated_bookings (hotel × day × room capacity), sharing dim_hotels, dim_date and dim_rooms.",
    sql: ["Revenue realized vs generated", "ADR and RevPAR", "Occupancy from successful bookings ÷ capacity", "Cancellation and no-show rates"],
    insights: ["Never join the two facts directly: filter both through the shared dimensions", "RevPAR needs capacity from the aggregated table", "Weekend vs weekday is defined in dim_date"] },
  { id: "supply-chain", tables: 6, name: "Supply Chain Analytics", industry: "Supply Chain", img: "supply-chain.jpg", color: "#1266d6", url: "https://supply-chain-omega-two.vercel.app/",
    desc: "Orders, inventory snapshots, suppliers, warehouses, products and customers across the supply chain.",
    tools: STD_TOOLS, size: "6 tables · 12,000 orders · 20 warehouses",
    kpis: ["Revenue", "Gross Margin", "On-Time Delivery %", "Avg Delay Days", "Fill Rate", "Inventory Turnover"],
    model: "Fact_Orders is the hub, joined to Customer, Product, Supplier and Warehouse. Fact_Inventory shares only Product and Warehouse: never join the two facts directly.",
    sql: ["Revenue and gross margin by tier", "On-time delivery and delay days", "Supplier scorecards", "Inventory snapshots (don't sum them like sales)"],
    insights: ["Revenue is $187.98M", "Average delay counts only rows with Delay_Days above 0", "Inventory snapshots summed like sales make stock look inflated"] },
  { id: "payflow", tables: 18, name: "PayFlow Fintech Analytics", industry: "Fintech", img: "payflow.jpg", color: "#2563eb", url: "https://fintechpayflow.vercel.app/",
    desc: "Payments data for PayFlow, a merchant payment gateway: transactions, refunds, disputes, fraud cases and settlements.",
    tools: STD_TOOLS, size: "18 tables · 306,141 payment attempts · 820 merchants",
    kpis: ["Total Payment Volume (TPV)", "Processing Revenue", "Payment Success Rate", "Merchant Activation Rate", "Refund Rate", "Confirmed Fraud Rate"],
    model: "fact_payment sits at the centre; refunds, disputes, fraud cases, settlements and settlement lines are child facts, with shared date, merchant, payment-method, status, customer and risk dimensions.",
    sql: ["TPV and revenue by merchant and month", "Success rate by payment method", "Refunds and disputes against original payments", "Settlement reconciliation"],
    insights: ["Count payment intents, not retry attempts", "Refunds and disputes link back to the original payment", "47 KPIs across Merchant 360° and Fraud & Risk dashboards"] },
  { id: "marketing", tables: 9, name: "AXon Marketing Analytics", industry: "Marketing", img: "marketing.jpg", color: "#d92d8a", url: "https://marketingpr.vercel.app/",
    desc: "Email, Facebook, Instagram, WhatsApp and website data for AXon Retail, 2023–2024.",
    tools: STD_TOOLS, size: "9 tables · 313,895 email events · 103 campaigns",
    kpis: ["Delivery Rate", "Open Rate (Unique)", "Click-Through Rate", "Campaign Engagement Rate", "Unique Visitors", "Bounce Rate"],
    model: "Campaigns sit at the centre; email events, social ads, WhatsApp and web traffic are separate channel facts joined through campaign and date.",
    sql: ["Unique opens and clicks per campaign", "Channel funnel from send to conversion", "Top performing campaigns", "Web visitors and bounce rate"],
    insights: ["Count unique opens, not every open event", "Each channel has its own grain: compare rates, not raw counts", "60 KPIs across email, social, WhatsApp and web"] },
];
const NAV = [["All Projects", "▦"], ["Healthcare", "✚"], ["Manufacturing", "⚙"], ["CRM", "🤝"], ["HR", "👥"], ["E-Commerce", "🛒"], ["Food Delivery", "🛵"], ["Finance / Stock", "↗"], ["Insurance", "🛡"], ["Hospitality", "🏨"], ["Supply Chain", "🚚"], ["Marketing", "📣"], ["Fintech", "💳"]];
const TABS = ["Overview", "KPIs", "Data Model", "Dashboard", "SQL / Logic", "Key Insights", "Case Study", "Notes"];
const TAB_HINT = ["Business problem & scope", "Key metrics", "Tables & relationships", "Open the live project", "Key queries & calculations", "Business findings", "Approach & outcome", "Your notes for this project"];
const TAB_ICON = ["✦", "⌁", "⊞", "▣", "⌘", "♨", "⚑", "▤"];
const STATUS = ["Not started", "In progress", "Completed"];

/* ---------- storage (never throws) ---------- */
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
const state = {
  q: "", industry: "All Projects", tool: "All Tools", sort: "Default", view: LS.get("pv-view", "grid"), favOnly: false,
  favorites: LS.get("pv-fav", []), recent: LS.get("pv-recent", []), compare: LS.get("pv-compare", []),
  notes: LS.get("pv-notes2", {}), status: LS.get("pv-status", {}), custom: LS.get("pv-custom", []),
  selected: null, tab: "Overview",
};
if (typeof state.notes !== "object" || Array.isArray(state.notes)) state.notes = {};
const save = () => { LS.set("pv-fav", state.favorites); LS.set("pv-recent", state.recent); LS.set("pv-compare", state.compare); LS.set("pv-notes2", state.notes); LS.set("pv-status", state.status); LS.set("pv-custom", state.custom); LS.set("pv-view", state.view); };

const all = () => [...PROJECTS, ...state.custom];
const byId = (id) => all().find((p) => p.id === id);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
const $ = (s, r = document) => r.querySelector(s);
const safeUrl = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ""; } catch (e) { return ""; } };

/* ---------- actions ---------- */
function touchRecent(id) { state.recent = [id, ...state.recent.filter((x) => x !== id)].slice(0, 6); save(); }
function openLive(id) {
  const p = byId(id); if (!p) return; const u = safeUrl(p.url); if (!u) { toast(`${p.name}: live link coming soon.`); return; }
  touchRecent(id); if (!state.status[id]) state.status[id] = "In progress"; save();
  window.open(u, "_blank", "noopener"); renderAll();
}
function toggleFav(id) { state.favorites = state.favorites.includes(id) ? state.favorites.filter((x) => x !== id) : [...state.favorites, id]; save(); renderAll(); }
function toggleCompare(id) {
  if (state.compare.includes(id)) state.compare = state.compare.filter((x) => x !== id);
  else if (state.compare.length >= 3) { toast("You can compare up to 3 projects. Remove one first."); return; }
  else state.compare = [...state.compare, id];
  save(); renderAll();
}
function goHome() { Object.assign(state, { q: "", industry: "All Projects", tool: "All Tools", sort: "Default", favOnly: false }); closeOverlays(); const s = $("#search"); if (s) s.value = ""; renderAll(); window.scrollTo({ top: 0, behavior: "smooth" }); }
function toast(msg) { let t = $("#toast"); if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t); } t.textContent = msg; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 2600); }
function closeOverlays() { document.querySelectorAll(".overlay").forEach((o) => o.remove()); state.selected = null; document.body.classList.remove("modalOpen"); }
function scrollToId(id) { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }

/* ---------- filtering ---------- */
function filtered() {
  const q = state.q.trim().toLowerCase();
  let list = all().filter((p) => (state.industry === "All Projects" || p.industry === state.industry)
    && (state.tool === "All Tools" || (p.tools || []).includes(state.tool))
    && (!state.favOnly || state.favorites.includes(p.id))
    && (!q || [p.name, p.industry, p.desc, (p.tools || []).join(" "), (p.kpis || []).join(" ")].join(" ").toLowerCase().includes(q)));
  if (state.sort === "A–Z") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
  if (state.sort === "Recently opened") list = [...list].sort((a, b) => (state.recent.indexOf(a.id) + 1 || 99) - (state.recent.indexOf(b.id) + 1 || 99));
  return list;
}

/* ---------- render ---------- */
function shell() {
  const tools = ["All Tools", ...new Set(all().flatMap((p) => p.tools || []))];
  $("#app").innerHTML = `<div class="shell">
  <aside class="sidebar">
    <a class="brand brandButton" href="./" data-act="home" title="ProjectVault home"><div class="brandCube"><i></i><b></b><em></em></div><div><strong>Project<span>Vault</span></strong><small>My Analytics &amp; Digital Project Library</small></div></a>
    <nav class="nav" id="nav"></nav><div class="navDivider"></div><div id="utility"></div>
    <div class="sidebarBottom"><b>💡 Learn. Build. Grow.</b><span>All Data Analyst capstone projects<br>in one place.</span></div>
  </aside>
  <section class="main">
    <header class="hero"><div><h1>Project<span>Vault</span></h1><h2>My Analytics &amp; Digital Project Library</h2><p>End-to-end Data Analyst capstone projects across 12 industries: Excel, SQL, Tableau and Power BI on real-style business data. Click a project to open its live site.</p></div><div class="heroArt"><div class="mountain"></div><div class="miniChart"><span></span><span></span><span></span><span></span><span></span></div></div></header>
    <div class="toolbar"><div class="search"><span>⌕</span><input id="search" type="search" placeholder="Search projects, KPIs or tools (e.g. RevPAR, attrition, Snowflake)" aria-label="Search projects"></div>
      <select id="selIndustry" aria-label="Industry"></select>
      <select id="selTool" aria-label="Tool">${tools.map((x) => `<option>${esc(x)}</option>`).join("")}</select>
      <button class="favToggle" id="favToggle" data-act="favOnly">★ Favourites only</button>
      <button class="addBtn" data-act="add">＋ Add Project</button></div>
    <section class="stats" id="stats"></section>
    <div class="contentTitle"><h3 id="listTitle">All Projects</h3><div>Sort by: <select id="selSort" aria-label="Sort"><option>Default</option><option>A–Z</option><option>Recently opened</option></select><button class="viewBtn" data-act="view" data-v="grid" title="Grid view">▦</button><button class="viewBtn" data-act="view" data-v="list" title="List view">☷</button></div></div>
    <div class="grid" id="grid"></div>
    <div class="bottomGrid"><section class="recentPanel" id="recentPanel"></section><section class="comparePanel" id="comparePanel"></section></div>
  </section>
  <aside class="rightbar" id="rightbar"></aside></div>`;
  $("#selIndustry").innerHTML = NAV.map(([n]) => `<option>${esc(n)}</option>`).join("");
}
function renderSidebar() {
  const data = all();
  $("#nav").innerHTML = NAV.map(([n, i]) => { const c = n === "All Projects" ? data.length : data.filter((p) => p.industry === n).length;
    return `<button class="${state.industry === n && !state.favOnly ? "active" : ""}" data-act="industry" data-v="${esc(n)}"><span class="iconGlyph">${i}</span><span>${esc(n)}</span><small>${c || ""}</small></button>`; }).join("");
  $("#utility").innerHTML = `
    <button class="utility ${state.favOnly ? "active" : ""}" data-act="favOnly"><span class="iconGlyph">★</span><span>Favourites</span><small>${state.favorites.length}</small></button>
    <button class="utility" data-act="goRecent"><span class="iconGlyph">◷</span><span>Recently Opened</span><small>${state.recent.length}</small></button>
    <button class="utility" data-act="compare"><span class="iconGlyph">⚖</span><span>Compare Projects</span><small>${state.compare.length}</small></button>
    <button class="utility" data-act="notes"><span class="iconGlyph">▤</span><span>Notes</span><small>${Object.values(state.notes).filter((v) => v && v.trim()).length || ""}</small></button>
    <a class="utility trainerLink" href="tracker.html" title="Attendance and group presentation status of all projects (trainer login)"><span class="iconGlyph">📊</span><span>Trainer Dashboard</span><small>🔒</small></a>`;
}
function renderStats() {
  const data = all(); const done = data.filter((p) => state.status[p.id] === "Completed").length;
  const tables = PROJECTS.reduce((a, p) => a + (p.tables || 0), 0);
  $("#stats").innerHTML = [["▱", data.length, "Projects", "Live capstone sites"], ["▥", new Set(data.map((p) => p.industry)).size, "Industries", "Diverse domain coverage"],
    ["⊞", tables, "Data tables", "Across all datasets"], ["✓", `${done}/${data.length}`, "Completed", "Your progress on this device"]]
    .map(([i, n, b, s]) => `<div class="stat"><div class="statIcon">${i}</div><div><strong>${n}</strong><b>${b}</b><small>${s}</small></div></div>`).join("");
}
function card(p) {
  const fav = state.favorites.includes(p.id), cmp = state.compare.includes(p.id), st = state.status[p.id] || "Not started";
  return `<article class="card" style="--c:${esc(p.color || "#1768ed")}" data-open="${esc(p.id)}" tabindex="0" role="link" aria-label="Open ${esc(p.name)} in a new tab">
    <div class="cardImg"><img src="assets/${esc(p.img)}" alt="" loading="lazy"><div class="cardIcon" style="background:${esc(p.color)}">◈</div><span class="status st-${st.replace(/ /g, "").toLowerCase()}">${esc(st)}</span></div>
    <div class="cardBody"><div class="cardName"><h4 title="${esc(p.name)}">${esc(p.name)}</h4><button class="star ${fav ? "on" : ""}" data-act="fav" data-id="${esc(p.id)}" title="${fav ? "Remove from favourites" : "Add to favourites"}" aria-pressed="${fav}">★</button></div>
    <span class="tag">${esc(p.industry)}</span><p>${esc(p.desc)}</p>${p.size ? `<div class="size">${esc(p.size)}</div>` : ""}
    <div class="toolTags">${(p.tools || []).map((t) => `<span>${esc(t)}</span>`).join("")}</div>
    <div class="cardActions"><button class="openBtn" data-act="live" data-id="${esc(p.id)}">Open Project ↗</button><button class="ghost" data-act="details" data-id="${esc(p.id)}">Details</button><button class="compare ${cmp ? "on" : ""}" data-act="cmp" data-id="${esc(p.id)}" title="${cmp ? "Remove from compare" : "Add to compare (max 3)"}" aria-pressed="${cmp}">⚖</button></div></div></article>`;
}
function renderGrid() {
  const list = filtered();
  $("#listTitle").textContent = state.favOnly ? "Favourite Projects" : state.industry;
  $("#grid").className = "grid" + (state.view === "list" ? " listView" : "");
  document.querySelectorAll('[data-act="view"]').forEach((b) => b.classList.toggle("on", b.dataset.v === state.view));
  $("#favToggle").classList.toggle("on", state.favOnly);
  $("#selIndustry").value = state.industry; $("#selTool").value = state.tool; $("#selSort").value = state.sort;
  const empty = !list.length ? `<div class="emptyState"><b>No projects match.</b><span>${state.favOnly ? "Star a project to add it to your favourites." : "Try another search or filter."}</span><button data-act="home">Show all projects</button></div>` : "";
  $("#grid").innerHTML = empty + list.map(card).join("") + `<button class="newCard" data-act="add"><div>＋</div><b>Add New Project</b><span>Add a project link to your own library<br>(saved in this browser).</span></button>`;
}
function renderPanels() {
  const rec = state.recent.map(byId).filter(Boolean);
  $("#recentPanel").innerHTML = `<div class="panelTitle" id="recent"><h3>◷ Recently Opened</h3>${rec.length ? `<button data-act="clearRecent">Clear</button>` : ""}</div>
    <div class="recentList">${rec.map((p) => `<button data-act="live" data-id="${esc(p.id)}" title="Open ${esc(p.name)} in a new tab"><img src="assets/${esc(p.img)}" alt=""><span><b>${esc(p.name)}</b><small>${esc(p.industry)} · open again ↗</small></span></button>`).join("") || '<p class="empty">Projects you open will appear here.</p>'}</div>`;
  const cmp = state.compare.map(byId).filter(Boolean);
  $("#comparePanel").innerHTML = `<div class="panelTitle"><h3>⚖ Compare Projects</h3><button data-act="compare" ${cmp.length < 2 ? "disabled" : ""}>Compare ${cmp.length ? "(" + cmp.length + ")" : ""}</button></div>
    <p>Pick 2 or 3 projects with the ⚖ button on a card to compare their KPIs, tools and data model.</p>
    <div class="chips">${cmp.map((p) => `<button data-act="cmp" data-id="${esc(p.id)}">${esc(p.name)} ×</button>`).join("") || '<span class="muted">No projects selected yet.</span>'}</div>`;
}
function renderRight() {
  const data = all(); const n = data.length; const c = (s) => data.filter((p) => (state.status[p.id] || "Not started") === s).length;
  const done = c("Completed"), prog = c("In progress"), not = n - done - prog, pct = n ? Math.round(done / n * 100) : 0;
  $("#rightbar").innerHTML = `<div class="profile"><img class="avatarImg" src="${esc(PROFILE.photo)}" alt="${esc(PROFILE.name)}"><div><strong>${esc(PROFILE.name)}</strong><small>${esc(PROFILE.role)}</small></div></div>
    <div class="socialLinks">${PROFILE.links.map((l) => `<a class="s-${l.k}" href="${esc(l.url)}" target="_blank" rel="noopener" title="${esc(l.label)}"><b>${esc(l.icon)}</b> <span>${esc(l.label)}</span></a>`).join("")}</div>
    <section class="quick"><h3>📖 Quick Study</h3><p>${state.selected ? "Studying: " + esc(state.selected.name) : "Pick a topic, then choose a project, or press Details on any card."}</p>
    ${TABS.map((x, i) => `<button data-act="quick" data-v="${esc(x)}"><i>${TAB_ICON[i]}</i><span><b>${esc(x)}</b><small>${esc(TAB_HINT[i])}</small></span><em>›</em></button>`).join("")}</section>
    <section class="progress"><h3>📈 Learning Progress</h3><div class="progressBody"><div class="donut" style="--p:${pct}"><strong>${pct}%</strong><span>Completed</span></div>
    <div><p><i class="dot green"></i>Completed <b>${done}</b></p><p><i class="dot blue"></i>In Progress <b>${prog}</b></p><p><i class="dot gray"></i>Not Started <b>${not}</b></p></div></div>
    <div class="bar"><span style="width:${pct}%"></span></div><small>${n ? "Set a project's status in its Details. Opening a project marks it In Progress." : ""}</small></section>`;
}
function renderAll() { renderSidebar(); renderStats(); renderGrid(); renderPanels(); renderRight(); }

/* ---------- modals ---------- */
function overlay(id, inner) { document.querySelectorAll(".overlay").forEach((o) => o.remove()); document.body.insertAdjacentHTML("beforeend", `<div class="overlay" id="${id}" data-act="overlay"><div class="${id}" role="dialog" aria-modal="true">${inner}</div></div>`); document.body.classList.add("modalOpen"); setTimeout(() => { const f = document.querySelector(`#${id} .close`); f && f.focus(); }, 30); }
function tabContent(p, tab) {
  const box = (t, b) => `<div class="infoBox"><b>${esc(t)}</b><p>${esc(b)}</p></div>`;
  const list = (t, arr) => `<div class="infoBox"><b>${esc(t)}</b><ul>${(arr || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`;
  const u = safeUrl(p.url);
  switch (tab) {
    case "Overview": return box("What the project is about", p.desc) + (p.size ? box("Dataset size", p.size) : "") + box("Tools", (p.tools || []).join(" · ")) + box("Learning goal", "Turn business questions into KPIs, validate them in SQL, build the Tableau and Power BI dashboards and present the insights.");
    case "KPIs": return list("Core KPIs", p.kpis) + box("Where the full list is", "The live site's KPI Library has every KPI with its business question, formula, DAX and answer key.");
    case "Data Model": return box("Model", p.model) + box("Where to see it", "The live site's Data Model page has the diagram, join guide and load order.");
    case "Dashboard": return `<div class="infoBox"><b>Live project</b><p>The full interactive project: dashboards, KPI library, SQL practice and interview prep.</p>${u ? `<button class="primary" data-act="live" data-id="${esc(p.id)}">Open Project ↗</button>` : ""}</div><div class="infoBox"><b>URL</b><p class="mono">${esc(p.url)}</p></div>`;
    case "SQL / Logic": return list("Core logic to practise", p.sql) + box("Practise", "Each live site has a SQL Lab and an in-browser SQL Practice Editor with daily problems.");
    case "Key Insights": return list("Findings", p.insights) + box("Interview angle", "Say what the number is, why it moved, and what the business should do next.");
    case "Case Study": return box("Approach", "Business problem → dataset → data model → KPIs → SQL validation → Tableau & Power BI dashboards → QA → insights → recommendations.") + box("Outcome", "A portfolio-ready project you can explain in a 90-second pitch.");
    case "Notes": return `<div class="noteBox"><b>Your notes for ${esc(p.name)}</b><textarea id="notesArea" placeholder="Learning notes, interview points, questions…">${esc(state.notes[p.id] || "")}</textarea><span id="noteSaved">Saved in this browser only.</span></div>`;
  }
  return "";
}
function openDetails(id, tab) {
  const p = byId(id); if (!p) return; state.selected = p; state.tab = tab || state.tab || "Overview"; const st = state.status[p.id] || "Not started";
  overlay("detailModal", `<button class="close" data-act="close" aria-label="Close">×</button>
    <div class="detailHero"><img src="assets/${esc(p.img)}" alt=""><div><span class="tag">${esc(p.industry)}</span><h2>${esc(p.name)}</h2><p>${esc(p.desc)}</p>
    <div class="toolTags">${(p.tools || []).map((t) => `<span>${esc(t)}</span>`).join("")}</div>
    <div class="detailActions"><button class="primary" data-act="live" data-id="${esc(p.id)}">Open Project ↗</button>
    <label class="statusSel">My status <select data-act="status" data-id="${esc(p.id)}">${STATUS.map((s) => `<option ${s === st ? "selected" : ""}>${s}</option>`).join("")}</select></label>
    ${String(p.id).startsWith("custom-") ? `<button class="danger" data-act="delCustom" data-id="${esc(p.id)}">Delete</button>` : ""}</div></div></div>
    <div class="tabs" role="tablist">${TABS.map((t) => `<button role="tab" class="${state.tab === t ? "selected" : ""}" data-act="tab" data-v="${esc(t)}">${esc(t)}</button>`).join("")}</div>
    <div class="detailBody">${tabContent(p, state.tab)}</div>`);
  renderRight();
}
function pickProject(tab) {
  overlay("pickModal", `<button class="close" data-act="close" aria-label="Close">×</button><h2>${esc(tab)}: choose a project</h2>
    <div class="pickList">${all().map((p) => `<button data-act="details" data-id="${esc(p.id)}" data-tab="${esc(tab)}"><img src="assets/${esc(p.img)}" alt=""><span><b>${esc(p.name)}</b><small>${esc(p.industry)}</small></span></button>`).join("")}</div>`);
}
function openCompare() {
  const cmp = state.compare.map(byId).filter(Boolean);
  overlay("compareModal", `<button class="close" data-act="close" aria-label="Close">×</button><h2>Compare Projects</h2><p>KPIs, tools, data size and model side by side.</p>
    <div class="compareTable">${cmp.map((p) => `<div class="compareCol"><img src="assets/${esc(p.img)}" alt=""><h3>${esc(p.name)}</h3><span>${esc(p.industry)}</span>
    <b>Dataset</b><p>${esc(p.size || "—")}</p><b>KPIs</b><p>${(p.kpis || []).map(esc).join(" · ")}</p><b>Tools</b><p>${(p.tools || []).map(esc).join(" · ")}</p><b>Model</b><p>${esc(p.model)}</p>
    <div class="row"><button class="primary" data-act="live" data-id="${esc(p.id)}">Open ↗</button><button data-act="cmpRemove" data-id="${esc(p.id)}">Remove</button></div></div>`).join("")
    || '<div class="emptyCompare">Choose 2 or 3 projects with the ⚖ button on the cards.</div>'}</div>`);
}
function openAdd() {
  overlay("addModal", `<button class="close" data-act="close" aria-label="Close">×</button><h2>Add Project</h2><p>Add a live project link to your library. It is saved in this browser only.</p>
    <form id="addForm"><label>Project name<input id="newName" required maxlength="60" placeholder="e.g. Banking Analytics"></label>
    <label>Project URL<input id="newUrl" required type="url" placeholder="https://…"></label>
    <label>Industry<select id="newIndustry">${NAV.slice(1).map(([n]) => `<option>${esc(n)}</option>`).join("")}<option>Other</option></select></label>
    <label>Short description<input id="newDesc" maxlength="140" placeholder="What the project covers"></label>
    <p class="formErr" id="formErr"></p><button class="primary" type="submit">Save Project</button></form>`);
}
function saveCustom() {
  const name = $("#newName").value.trim(), url = safeUrl($("#newUrl").value.trim()), industry = $("#newIndustry").value, desc = $("#newDesc").value.trim();
  if (!name || !url) { $("#formErr").textContent = "Enter a name and a full link starting with https://"; return; }
  state.custom.push({ id: "custom-" + Date.now(), name, industry, desc: desc || "Custom project added to ProjectVault.", img: "marketing.jpg", color: "#2369ee", url, tools: [], size: "",
    kpis: ["Add your KPIs in Notes"], model: "Add your data model in Notes", insights: ["Add your insights in Notes"], sql: ["Add your SQL logic in Notes"] });
  save(); closeOverlays(); renderAll(); toast("Project added.");
}

/* ---------- events (one delegated listener) ---------- */
document.addEventListener("click", (e) => {
  const a = e.target.closest("[data-act]");
  if (!a) { const c = e.target.closest("[data-open]"); if (c) openLive(c.dataset.open); return; }
  const act = a.dataset.act, id = a.dataset.id, v = a.dataset.v;
  if (act === "overlay") { if (e.target === a) { closeOverlays(); renderRight(); } return; }
  if (act === "home") { e.preventDefault(); goHome(); return; }
  e.stopPropagation();
  ({
    live: () => openLive(id), fav: () => toggleFav(id), cmp: () => toggleCompare(id),
    cmpRemove: () => { toggleCompare(id); openCompare(); },
    details: () => openDetails(id, a.dataset.tab || "Overview"),
    industry: () => { state.industry = v; state.favOnly = false; renderAll(); scrollToId("listTitle"); },
    favOnly: () => { state.favOnly = !state.favOnly; renderAll(); scrollToId("listTitle"); },
    goRecent: () => scrollToId("recent"), clearRecent: () => { state.recent = []; save(); renderAll(); },
    compare: () => openCompare(), add: () => openAdd(),
    notes: () => (state.selected ? openDetails(state.selected.id, "Notes") : pickProject("Notes")),
    quick: () => (state.selected ? openDetails(state.selected.id, v) : pickProject(v)),
    tab: () => openDetails(state.selected.id, v),
    view: () => { state.view = v; save(); renderGrid(); },
    close: () => { closeOverlays(); renderRight(); },
    delCustom: () => { if (!confirm("Delete this project from your library?")) return; state.custom = state.custom.filter((p) => p.id !== id); state.favorites = state.favorites.filter((x) => x !== id); state.compare = state.compare.filter((x) => x !== id); state.recent = state.recent.filter((x) => x !== id); delete state.notes[id]; delete state.status[id]; save(); closeOverlays(); renderAll(); },
  }[act] || (() => {}))();
});
document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.id === "selIndustry") { state.industry = t.value; state.favOnly = false; renderAll(); }
  else if (t.id === "selTool") { state.tool = t.value; renderGrid(); }
  else if (t.id === "selSort") { state.sort = t.value; renderGrid(); }
  else if (t.dataset.act === "status") { state.status[t.dataset.id] = t.value; save(); renderAll(); toast("Status saved: " + t.value); }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "search") { state.q = e.target.value; renderGrid(); }
  if (e.target.id === "notesArea" && state.selected) { state.notes[state.selected.id] = e.target.value; save(); const s = $("#noteSaved"); if (s) s.textContent = "Saved ✓ (this browser only)"; renderSidebar(); }
});
document.addEventListener("submit", (e) => { if (e.target.id === "addForm") { e.preventDefault(); saveCustom(); } });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && document.querySelector(".overlay")) { closeOverlays(); renderRight(); }
  if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches("[data-open]")) { e.preventDefault(); openLive(e.target.dataset.open); }
  if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); $("#search").focus(); }
});
window.addEventListener("storage", () => { Object.assign(state, { favorites: LS.get("pv-fav", []), recent: LS.get("pv-recent", []), compare: LS.get("pv-compare", []), status: LS.get("pv-status", {}), custom: LS.get("pv-custom", []) }); renderAll(); });

shell(); renderAll();
