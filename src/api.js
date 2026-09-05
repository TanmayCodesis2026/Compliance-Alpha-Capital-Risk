// Thin client for the Risk Tracker API (RT/GT Surveillance).
//
// Two hosts, one bearer token:
//   VITE_RISK_API_BASE — the risk engine. Every /api/* surveillance endpoint:
//                        overview, account search/summary, the eight rule
//                        models, flag detail, reviews.
//   VITE_BASE_URL      — the customer backend. auth.js's token refresh and the
//                        admin surface (custom token, compliance duplicates).
//
// Requests are absolute in dev and prod alike, so BOTH hosts must allow this
// origin via CORS.
//
// Every request goes through authJson() so the bearer token is attached and a
// single 401 is recovered by a refresh — screens never call fetch() directly.

import { authJson } from './auth.js'

const trimSlash = (u) => (u || '').replace(/\/$/, '')

// Falls back to the dev risk engine so a missing .env still reaches a backend
// rather than silently posting /api/* at whatever origin served the bundle.
const RISK_BASE = trimSlash(import.meta.env.VITE_RISK_API_BASE) || 'https://risk-engine-dev.alphacapitalgroup.uk'
const ADMIN_BASE = trimSlash(import.meta.env.VITE_BASE_URL)

// A failed request carries its status so callers can tell "the backend is down"
// (retry later) from "you asked for something that doesn't exist" (don't).
export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    // 0 = network/CORS failure; 5xx = backend is up but unhealthy. Both mean
    // "try again later" rather than "this request was wrong".
    this.isUnavailable = status === 0 || status >= 500
  }
}

function buildUrl(base, path, params) {
  // `base` is absolute whenever its env var is set; the origin argument only
  // matters as a fallback when it isn't, and keeps this from throwing.
  const url = new URL(base + path, window.location.origin)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
    }
  }
  return url.toString()
}

// authJson throws a plain Error; re-wrap so callers get the status alongside the
// server's `detail` message. SessionExpiredError is left alone — useSession has
// already bounced the UI to Login and swallowing it here would hide that.
async function request(url, options) {
  try {
    return await authJson(url, options)
  } catch (e) {
    if (e?.name === 'SessionExpiredError' || e instanceof ApiError) throw e
    const status = Number(/\b(\d{3})\b/.exec(e?.message || '')?.[1] || 0)
    throw new ApiError(e?.message || 'Request failed', status)
  }
}

// Risk engine (the default for everything below) …
const get = (path, params) => request(buildUrl(RISK_BASE, path, params))
const post = (path, body) => request(buildUrl(RISK_BASE, path), { method: 'POST', body: JSON.stringify(body) })
// … and the customer backend, for the handful of admin endpoints.
const adminGet = (path, params) => request(buildUrl(ADMIN_BASE, path, params))

// GET /api/overview/
export function fetchOverview() {
  return get('/api/overview/')
}

// GET /api/account-summary/?login_id=… — per-login dossier: the resolved
// account record(s) plus a summary { total_flags, by_type, by_severity }.
// Keyed on login_id, the same identifier every scan endpoint reports against.
export function fetchAccountSummary(loginId, opts = {}) {
  return get('/api/account-summary/', { login_id: loginId, ...opts })
}

// GET /api/flags/{source}/{id}/
export function fetchFlagDetail(source, id) {
  return get(`/api/flags/${encodeURIComponent(source)}/${encodeURIComponent(id)}/`)
}

// ---- cross-account detectors (RT / GT) ----
// Unlike the per-login rule scans, these match one account's activity against
// another's, so a row spans several logins. Reverse and group trading have a
// detail route; the four supporting tables are list-only.
export function fetchReverseTrading(opts = {}) {
  return get('/api/reverse-flags/', opts)
}
export function fetchReverseTradingDetail(id) {
  return get(`/api/reverse-flags/${encodeURIComponent(id)}/`)
}

export function fetchGroupTrading(opts = {}) {
  return get('/api/group-flags/', opts)
}
export function fetchGroupTradingDetail(id) {
  return get(`/api/group-flags/${encodeURIComponent(id)}/`)
}

// Each group-trading flag can recur; one row per occasion.
export function fetchGroupOccasions(opts = {}) {
  return get('/api/group-occasions/', opts)
}
// The individual signals (OM, CM, PS, …) that fired for a flag.
export function fetchFlagSignals(opts = {}) {
  return get('/api/signals/', opts)
}
// The accounts participating in each flag.
export function fetchFlagAccounts(opts = {}) {
  return get('/api/flag-accounts/', opts)
}
// Prior occurrences of the same account pairing.
export function fetchMatchOccurrences(opts = {}) {
  return get('/api/match-occurrences/', opts)
}

// ---- trading profiles ----
// Behavioural fingerprints per user, used as corroborating signals rather than
// flags in their own right — list-only.
export function fetchUserTodProfile(opts = {}) {
  return get('/api/user-tod-daily/', opts)
}
export function fetchUserDurationProfile(opts = {}) {
  return get('/api/user-duration-daily/', opts)
}

// ---- detection models (one resource endpoint each) ----
// Every model below is a daily *scan* keyed on login_id, and every list row is
// the resource itself — `flag_id` ("gambling-09ba3e66b546") is the detail key,
// there is no numeric pk. List opts: { search, login_id, scan_date, page,
// page_size } plus whatever each model filters on.
//
// These are the 10 models the overview's by_type reports on; the five rule
// checks share the same envelope as the three below them.

// GET /api/two-minute/ — trades closed inside the two-minute rule window.
export function fetchTwoMinute(opts = {}) {
  return get('/api/two-minute/', opts)
}
export function fetchTwoMinuteDetail(flagId) {
  return get(`/api/two-minute/${encodeURIComponent(flagId)}/`)
}

// GET /api/weekend-holding/ — positions carried across the weekend close.
export function fetchWeekendHolding(opts = {}) {
  return get('/api/weekend-holding/', opts)
}
export function fetchWeekendHoldingDetail(flagId) {
  return get(`/api/weekend-holding/${encodeURIComponent(flagId)}/`)
}

// GET /api/one-percent/ — single-trade risk above the one-percent limit.
export function fetchOnePercent(opts = {}) {
  return get('/api/one-percent/', opts)
}
export function fetchOnePercentDetail(flagId) {
  return get(`/api/one-percent/${encodeURIComponent(flagId)}/`)
}

// GET /api/max-lot/ — orders above the plan's maximum lot size.
export function fetchMaxLot(opts = {}) {
  return get('/api/max-lot/', opts)
}
export function fetchMaxLotDetail(flagId) {
  return get(`/api/max-lot/${encodeURIComponent(flagId)}/`)
}

// GET /api/minimum-trading-days/ — accounts short of the required trading days.
export function fetchMinimumTradingDays(opts = {}) {
  return get('/api/minimum-trading-days/', opts)
}
export function fetchMinimumTradingDaysDetail(flagId) {
  return get(`/api/minimum-trading-days/${encodeURIComponent(flagId)}/`)
}

// GET /api/news-trading/ — trades inside a restricted window around a release.
export function fetchNewsTrading(opts = {}) {
  return get('/api/news-trading/', opts)
}
export function fetchNewsTradingDetail(flagId) {
  return get(`/api/news-trading/${encodeURIComponent(flagId)}/`)
}

// GET /api/gambling/ — profit an outsized share of the starting balance.
export function fetchGambling(opts = {}) {
  return get('/api/gambling/', opts)
}
export function fetchGamblingDetail(flagId) {
  return get(`/api/gambling/${encodeURIComponent(flagId)}/`)
}

// GET /api/order-book-spam/ — one-sided order bursts in a rolling window.
export function fetchOrderBookSpam(opts = {}) {
  return get('/api/order-book-spam/', opts)
}
export function fetchOrderBookSpamDetail(flagId) {
  return get(`/api/order-book-spam/${encodeURIComponent(flagId)}/`)
}
// GET /api/news-events/ — the economic calendar. Rows carry event_name / type /
// currency / event_date / start_time / gmt_offset / speaker / source.
// opts: { search, type, currency, event_date, ordering, page, page_size }
//
// GET /api/news-events/{id}/ — one event, keyed on the row's UUID. Same shape
// as the list row (see fetchNewsEventDetail below).
export function fetchNewsEvents(opts = {}) {
  return get('/api/news-events/', opts)
}
export function fetchNewsEventDetail(id) {
  return get(`/api/news-events/${encodeURIComponent(id)}/`)
}

// GET /api/accounts/ — account autocomplete. `search` under 2 chars is not sent
// by the caller; `phase` narrows to e.g. qualified accounts. -> { results, has_next }
export function fetchAccountSearch(search, opts = {}) {
  return get('/api/account-search/', { search, ...opts })
}

// GET /api/trades/?trade_ids=a,b,c — bulk trade lookup. -> { results, missing }
export function fetchTradesByIds(ids = []) {
  return get('/api/trades/', { trade_ids: (ids || []).join(',') })
}

// GET /api/payouts/?account_name=… -> { count, results:[{ payout_id, … }] }
// GET /api/payouts/{payout_id}/tick-scalping/ — TS-1 verdict for the cycle.
// GET /api/payouts/{payout_id}/short-duration/ — SDT-1 verdict for the cycle.
// GET /api/payouts/{payout_id}/violations/{kind}/ — one violation tab's rows.
// `kind` is a VIOLATION_TABS key: news | gambling | hft | obs | rt-gt.

// ---- compliance review (R-4) ----
// GET  /api/reviews/{source}/{flag_id}/ -> { reviewed, verdict, notes, reviewed_by, reviewed_at }
export function fetchReviewState(source, flagId) {
  return get(`/api/reviews/${encodeURIComponent(source)}/${encodeURIComponent(flagId)}/`)
}
// POST /api/reviews/{source}/{flag_id}/ — body { reviewed, verdict, notes }.
// Never send reviewed_by; the server stamps it from the bearer token.
export function postReviewDecision(source, flagId, body) {
  return post(`/api/reviews/${encodeURIComponent(source)}/${encodeURIComponent(flagId)}/`, body)
}

// ---- admin (customer backend, not the risk engine) ----
// GET {VITE_BASE_URL}/admin/customtoken/?email=… -> { data: { id_token, refresh_token } }
// Mints a customer-app session so compliance can open the account as the user.
export function fetchAdminCustomToken(email) {
  return adminGet('/admin/customtoken/', { email })
}

// ---- system / logs (mounted at site root, not under /api) ----
// GET /logs/ — { count, logs: [...] }
export function fetchLogs() {
  return get('/logs/')
}

// ---- Custom Dash (a third host: the dash API Worker) ----
//
// VITE_RISK_CUSTOM_DASH_BASE already includes the API's own prefix, so it ends
// in .../v1/dash and the paths below append only /catalogue, /{slug}/versions
// and /{slug}/view-url.
//
// These are the one deliberate exception to "everything goes through
// authJson()". The app's bearer token belongs to the risk engine and the
// customer backend; forwarding it to a third service would hand that host a
// live session it has no business holding. authFetch also sends
// `credentials: 'include'`, which a Worker answering
// `Access-Control-Allow-Origin: *` would reject outright. So the dash API is
// authenticated with its own read key instead, and the host must allow this
// origin via CORS.
//
// READ THIS BEFORE TOUCHING THE KEY: Vite inlines every VITE_* var into the
// bundle, so VITE_DASH_READ_KEY ships in plain text to every visitor and is
// readable in devtools. It is therefore a public credential — whatever it can
// read, anyone who loads this app can read, including the named account holders
// inside the dashboards. That is the accepted trade for calling the API
// straight from the browser; moving these three calls behind a server-side
// proxy is the only way to keep the key private.
const DASH_OG = import.meta.env.VITE_RISK_CUSTOM_DASH_BASE
const DASH_RAW = trimSlash(import.meta.env.VITE_RISK_CUSTOM_DASH_BASE)
const DASH_READ_KEY = import.meta.env.VITE_DASH_READ_KEY || ''

// The Worker does not send Access-Control-Allow-Origin for localhost, so a
// direct call from the dev server fails its preflight. In dev the same path is
// requested under /dash-api instead, which vite.config.js forwards to the same
// host — a same-origin request the browser never preflights. The path is taken
// from the configured URL rather than hardcoded, so both halves stay driven by
// the one env var.
//
// Dev only: a build has no proxy, and prod still needs the Worker to allow the
// deployed origin.
function devProxied(raw) {
  try { return '/dash-api' + trimSlash(new URL(raw).pathname) } catch { return raw }
}
const DASH_BASE = import.meta.env.DEV && DASH_RAW ? devProxied(DASH_RAW) : DASH_RAW

async function dashFetch(path, options = {}) {
  // Vite inlines these at build time, so an unset var is a missing rebuild, not
  // a missing runtime value — say so rather than letting it fail as a 401.
  if (!DASH_BASE || !DASH_READ_KEY) {
    const missing = [!DASH_BASE && 'VITE_RISK_CUSTOM_DASH_BASE', !DASH_READ_KEY && 'VITE_DASH_READ_KEY'].filter(Boolean)
    throw new ApiError(`Custom Dash is not configured — set ${missing.join(' and ')}, then rebuild.`, 0)
  }

  let response
  try {
    response = await fetch(DASH_BASE + path, {
      ...options,
      headers: {
        accept: 'application/json',
        // Omitted rather than sent as "Bearer undefined" when unset: a missing
        // key should read as unauthenticated, and the guard below names the
        // actual problem instead of letting the API reject a literal string.
        ...(DASH_READ_KEY ? { Authorization: `Bearer ${DASH_READ_KEY}` } : null),
        ...(options.body ? { 'content-type': 'application/json' } : null),
        ...(options.headers || {}),
      },
    })
  } catch (e) {
    // The browser reports a blocked CORS preflight and a dead host identically,
    // so name both rather than guessing which one it was.
    throw new ApiError(`Couldn’t reach the dash API — network or CORS. ${e?.message || ''}`.trim(), 0)
  }

  const text = await response.text().catch(() => '')
  let body = null
  try { body = text ? JSON.parse(text) : null } catch { /* not JSON */ }

  if (!response.ok) {
    console.error('Dash request failed', path, response.status, response.statusText, text)
    // The dash API answers { error, message, request_id }; `message` is the
    // human-readable half. `detail` keeps this aligned with the risk engine.
    throw new ApiError(body?.detail || body?.message || body?.error || `Request failed: ${response.status} ${response.statusText}`, response.status)
  }
  return body
}

// GET {base}/catalogue -> { schema, generated_at, dashboards: [...] }
export function fetchDashCatalogue() {
  return dashFetch('/catalogue')
}

// GET {base}/{slug}/versions?limit=50
//   -> { slug, current_version_id, versions: [...], next_cursor }
// One generous page keeps the picker to a single round-trip; a dashboard with
// more than 50 versions would come back with next_cursor set.
export function fetchDashVersions(slug) {
  return dashFetch(`/${encodeURIComponent(slug)}/versions?limit=50`)
}

// POST {base}/{slug}/view-url
//   -> { url, version_id, expires_at }
//
// `url` points at the viewer Worker and carries a signed token in the path
// (…/v/v1.<payload>.<sig>/index.html) that encodes the slug, the version and an
// expiry — so it is a capability, not an address: it grants access on its own
// and it stops working at `expires_at`. Treat it as short-lived, never cache or
// store it, and re-request rather than reusing a stale one.
//
// `version_id` reports which version was actually served, which matters when no
// version was asked for: it names whatever "current" resolved to.
//
// Omitting versionId asks for the current version; passing one pins that
// version, which is how ?v= renders an older build.
export function fetchDashViewUrl(slug, versionId) {
  return dashFetch(`/${encodeURIComponent(slug)}/view-url`, {
    method: 'POST',
    body: JSON.stringify(versionId ? { version_id: versionId } : {}),
  })
}
