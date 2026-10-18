# ProjectVault — Data Analyst Capstone Project Library

Static site (HTML + CSS + JS, no build step). Deploy: push this folder to a GitHub repo → Vercel → Add New Project → Import → Deploy. Every push to `main` redeploys.

## Edit projects
All 11 projects are in the `PROJECTS` list at the top of `app.js` (name, live URL, image, KPIs, data model, SQL topics, insights). Profile name, photo and social links are in `PROFILE`.

## What works
- Click a project card (or **Open Project ↗**) → the live project opens in a new tab.
- **Details** → overview, KPIs, data model, dashboard link, SQL / logic, insights, case study, notes, and "My status" (Not started / In progress / Completed).
- Search (also searches KPIs and tools; press `/` to jump to it), industry and tool filters, Favourites only, sort, grid / list view.
- Favourites, Recently Opened, Compare (2–3 projects), per-project Notes, Learning Progress and added projects are saved in the visitor's browser (localStorage).
- ProjectVault logo → back to the home view.

## Trainer Dashboard (tracker.html)
Sidebar → **Trainer Dashboard** (or open `/tracker.html`). Log in with the same trainer username + password as on the project sites.
- Shows, live from all 11 project sites: today's presentations (groups presented / pending / absent), the next 7 days, every project code with group status per stage (Excel, Tableau, Power BI, SQL QA, Final), students per project code and group, and day-by-day attendance (site check-ins), with CSV export.
- `api/hub.js` reads each site's own `/api/schedule` from the server. Nothing new is stored. The list of sites is at the top of `api/hub.js` (update it if a site URL changes), or set env `HUB_SITES` in Vercel.
- A site shows 🟠 until its Upstash database is connected, and 🔴 if it can't be reached.
- If you change the trainer password on one site only, that site shows 🔒 here; keep the same password on all sites.
