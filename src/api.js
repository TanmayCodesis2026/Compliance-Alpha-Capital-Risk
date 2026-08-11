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
