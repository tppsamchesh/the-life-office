#!/usr/bin/env node
/**
 * Reality check: can the tools TLO ALREADY HAS turn a business owner's NAME
 * into a real, usable EMAIL often enough to be worth building on?
 *
 * This is the make-or-break test for the prospect-finding agent (see
 * docs/superpowers/specs/2026-06-23-lead-finder-agent-design-v2.md).
 * Run it and read the funnel BEFORE building any agent tools.
 *
 * It walks the real pipeline on a small sample and reports where yield is lost:
 *   Stage A  Companies House  -> recently incorporated UK companies + a director name
 *   Stage B  Brave / SerpAPI  -> the company's website domain
 *   Stage C  Hunter           -> a verified email for that director at that domain
 *
 * --------------------------------------------------------------------------
 * WHERE TO RUN IT
 * --------------------------------------------------------------------------
 * The API keys live in the VPS secrets manager, NOT on a laptop. So either:
 *
 *   (a) On the VPS, with the keys exported:
 *         export COMPANIES_HOUSE_KEY=...  BRAVE_KEY=...  HUNTER_API_KEY=...
 *         node scripts/reality-check-enrichment.mjs
 *
 *   (b) Locally, after pasting the keys into .env.local (this script loads it):
 *         COMPANIES_HOUSE_KEY=...
 *         BRAVE_KEY=...
 *         HUNTER_API_KEY=...
 *         SERPAPI_KEY=...        # optional, used as a fallback for Stage B
 *
 * Cost: Stage C spends ~1 Hunter credit per candidate (SAMPLE_SIZE below).
 *
 * NOTE: this script targets the documented API shapes but has not been run
 * end-to-end from the dev machine (no keys here). If a stage errors on first
 * run it's almost certainly a small response-shape tweak — the per-stage logs
 * tell you exactly which call and what it returned.
 */

import { readFileSync } from "node:fs";

// --- config -----------------------------------------------------------------
const SAMPLE_SIZE = 15; // how many director names to test end-to-end
const INCORPORATED_WINDOW_DAYS = 30; // "recently incorporated" lookback
// Bias toward founder/exec-type companies (optional). Empty = no SIC filter.
const SIC_CODES = ["70229", "62020", "64999", "70221"]; // mgmt/IT consultancy, financial

// --- tiny .env.local loader (so it can run locally without dotenv) ----------
try {
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  /* no .env.local — fine, rely on real env */
}

const CH_KEY = process.env.COMPANIES_HOUSE_KEY || process.env.COMPANIES_HOUSE_API_KEY;
const BRAVE_KEY = process.env.BRAVE_KEY || process.env.BRAVE_API_KEY;
const SERPAPI_KEY = process.env.SERPAPI_KEY;
const HUNTER_KEY = process.env.HUNTER_API_KEY || process.env.HUNTER_KEY;

function requireKey(name, val) {
  if (!val) {
    console.error(`\n❌ Missing ${name}. Set it in the env or .env.local (see header). Aborting.`);
    process.exit(1);
  }
}
requireKey("COMPANIES_HOUSE_KEY", CH_KEY);
requireKey("HUNTER_API_KEY", HUNTER_KEY);
if (!BRAVE_KEY && !SERPAPI_KEY) {
  console.error("\n❌ Need BRAVE_KEY or SERPAPI_KEY for Stage B (finding the company domain). Aborting.");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ymd = (d) => d.toISOString().slice(0, 10);

// --- Stage A: Companies House -> recent companies + a director name ---------
async function fetchRecentDirectors(limit) {
  const from = new Date(Date.now() - INCORPORATED_WINDOW_DAYS * 86400_000);
  const params = new URLSearchParams({
    incorporated_from: ymd(from),
    size: "60",
    company_status: "active",
  });
  for (const s of SIC_CODES) params.append("sic_codes", s);

  const auth = "Basic " + Buffer.from(CH_KEY + ":").toString("base64");
  const res = await fetch(
    `https://api.company-information.service.gov.uk/advanced-search/companies?${params}`,
    { headers: { Authorization: auth } },
  );
  if (!res.ok) throw new Error(`Companies House search ${res.status}: ${await res.text()}`);
  const companies = (await res.json()).items ?? [];

  const out = [];
  for (const c of companies) {
    if (out.length >= limit) break;
    try {
      const oRes = await fetch(
        `https://api.company-information.service.gov.uk/company/${c.company_number}/officers`,
        { headers: { Authorization: auth } },
      );
      if (!oRes.ok) continue;
      const director = (await oRes.json()).items?.find((o) =>
        (o.officer_role || "").includes("director") && o.name && !o.resigned_on,
      );
      if (!director) continue;
      // CH name format: "SURNAME, First Middle"
      const [surname, rest = ""] = director.name.split(",").map((x) => x.trim());
      const first = rest.split(" ")[0];
      if (!first || !surname) continue;
      out.push({
        company: c.company_name,
        company_number: c.company_number,
        first_name: titleCase(first),
        last_name: titleCase(surname),
      });
      await sleep(120); // be polite to CH rate limits
    } catch {
      /* skip this company */
    }
  }
  return out;
}

const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

// --- Stage B: web search -> company domain ----------------------------------
async function findDomain(company) {
  const q = `${company} official website`;
  let url;
  if (BRAVE_KEY) {
    const r = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=5`, {
      headers: { "X-Subscription-Token": BRAVE_KEY, Accept: "application/json" },
    });
    if (r.ok) url = (await r.json()).web?.results?.[0]?.url;
  }
  if (!url && SERPAPI_KEY) {
    const r = await fetch(`https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(q)}&api_key=${SERPAPI_KEY}`);
    if (r.ok) url = (await r.json()).organic_results?.[0]?.link;
  }
  if (!url) return null;
  const host = new URL(url).hostname.replace(/^www\./, "");
  // ignore obvious non-company hosts
  if (/(linkedin|facebook|companieshouse|gov\.uk|crunchbase|wikipedia|find-and-update)/.test(host)) return null;
  return host;
}

// --- Stage C: Hunter -> verified email --------------------------------------
async function findEmail(domain, first, last) {
  const u = `https://api.hunter.io/v2/email-finder?domain=${encodeURIComponent(domain)}&first_name=${encodeURIComponent(first)}&last_name=${encodeURIComponent(last)}&api_key=${HUNTER_KEY}`;
  const r = await fetch(u);
  if (!r.ok) return { email: null, note: `hunter ${r.status}` };
  const d = (await r.json()).data ?? {};
  return { email: d.email || null, score: d.score ?? null, status: d.verification?.status ?? null };
}

// --- run --------------------------------------------------------------------
console.log(`\nReality check — name → email, using existing tools only.`);
console.log(`Sample: ${SAMPLE_SIZE} recent UK directors. Stage C spends ~${SAMPLE_SIZE} Hunter credits.\n`);

const funnel = { names: 0, domains: 0, emails: 0, verified: 0 };
const rows = [];

const directors = await fetchRecentDirectors(SAMPLE_SIZE);
funnel.names = directors.length;
console.log(`Stage A — Companies House returned ${directors.length} director names.\n`);

for (const d of directors) {
  const domain = await findDomain(d.company).catch(() => null);
  let email = null, status = null, score = null;
  if (domain) {
    funnel.domains++;
    const res = await findEmail(domain, d.first_name, d.last_name).catch(() => ({}));
    email = res.email; status = res.status; score = res.score;
    if (email) funnel.emails++;
    if (email && status === "valid") funnel.verified++;
  }
  rows.push({ name: `${d.first_name} ${d.last_name}`, company: d.company.slice(0, 28), domain: domain || "—", email: email || "—", status: status || "—", score: score ?? "—" });
  console.log(`  ${email ? "✅" : domain ? "⚠️ " : "❌"} ${(d.first_name + " " + d.last_name).padEnd(22)} ${(domain || "no domain").padEnd(24)} ${email || ""} ${status ? "(" + status + ")" : ""}`);
  await sleep(250);
}

console.log(`\n──────────── FUNNEL ────────────`);
console.log(`Director names (Stage A):     ${funnel.names}`);
console.log(`→ domain found (Stage B):     ${funnel.domains}  (${pct(funnel.domains, funnel.names)})`);
console.log(`→ any email (Stage C):        ${funnel.emails}  (${pct(funnel.emails, funnel.names)} of names)`);
console.log(`→ VERIFIED email:             ${funnel.verified}  (${pct(funnel.verified, funnel.names)} of names)`);
console.log(`────────────────────────────────`);
console.log(`\nVerdict guide: end-to-end VERIFIED ≥ ~40% = the prospect channel is viable.`);
console.log(`Much lower = lean on partnerships / signals that already expose contact details.\n`);

function pct(n, d) {
  return d ? Math.round((100 * n) / d) + "%" : "0%";
}
