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
import { scopeParams } from './scope.js'

const trimSlash = (u) => (u || '').replace(/\/$/, '')

// Falls back to the dev risk engine so a missing .env still reaches a backend
// rather than silently posting /api/* at whatever origin served the bundle.
const RISK_BASE = trimSlash(import.meta.env.VITE_RISK_API_BASE) || 'https://risk-engine-dev.alphacapitalgroup.uk'
const ADMIN_BASE = trimSlash(import.meta.env.VITE_BASE_URL)

// A failed request carries its status so callers can tell "the backend is down"
// (retry later) from "you asked for something that doesn't exist" (don't).
export class ApiError extends Error {
  constructor(message, status, body = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    // The parsed error body, when there was one: 300 carries `candidates[]`,
    // 404 `status: "not_found"`, 503 `validation_note`.
    this.body = body
    // 0 = network/CORS failure; 5xx = backend is up but unhealthy. Both mean
    // "try again later" rather than "this request was wrong".
    this.isUnavailable = status === 0 || status >= 500
  }

  // A login fragment that matched several accounts (300).
  get isAmbiguous() { return this.status === 300 }
  get candidates() { return this.body?.candidates || [] }

  // Form validation answers { "<field>": ["message", …] }. Non-field keys
  // (`detail`, `field`, context such as `login_id`) are left out; a database
  // refusal names its column in `field`, so it is folded back in under that name.
  get fieldErrors() {
    if (this.status !== 400 || !this.body || typeof this.body !== 'object') return {}
    const out = {}
    for (const [k, v] of Object.entries(this.body)) {
      if (Array.isArray(v) && v.every((m) => typeof m === 'string')) out[k] = v
    }
    if (this.body.field && this.body.detail) out[this.body.field] = [this.body.detail]
    return out
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
    // authJson stamps the status; the regex is the fallback for a plain Error.
    const status = e?.status ?? Number(/\b(\d{3})\b/.exec(e?.message || '')?.[1] || 0)
    throw new ApiError(e?.message || 'Request failed', status, e?.body ?? null)
  }
}

// The risk engine signals an expired token with 401 only; its 403 means "no
// permission" (no risk access, no news-editor rights) and must not end the
// session. See authFetch.
const RISK_AUTH = { authFailureStatuses: [401] }

// Risk engine (the default for everything below) …
const get = (path, params) => request(buildUrl(RISK_BASE, path, params), RISK_AUTH)
const post = (path, body, params) => request(buildUrl(RISK_BASE, path, params), { ...RISK_AUTH, method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) })
const patch = (path, body) => request(buildUrl(RISK_BASE, path), { ...RISK_AUTH, method: 'PATCH', body: JSON.stringify(body) })
// … and the customer backend, for the handful of admin endpoints.
const adminGet = (path, params) => request(buildUrl(ADMIN_BASE, path, params))

// Logins can carry '#', '@', '.', '+' ("D#2496320"), so a login in a path
// segment is always encoded. Query values are encoded by URLSearchParams.
const seg = (v) => encodeURIComponent(String(v))

// GET /api/overview/
export function fetchOverview() {
  return get('/api/overview/')
}

// GET /api/account-summary/?login_id=…&scope=… — the per-scope scoreboard:
//   { login_id, resolved_logins, status, account, scope, periods, review,
//     two_minute, summary: { total_breaches, by_type, rules, by_severity, … },
//     notes, validation_note, generated_at }
// `summary.total_flags` is now an alias of total_breaches — breaches of the
// tiered rules in the scope, not row counts. 300 = ambiguous fragment
// (ApiError.candidates), 404 = unknown login, 503 = prod unreachable.
// `scope` is a scope object from scope.js.
export function fetchAccountSummary(loginId, scope, opts = {}) {
  return get('/api/account-summary/', { login_id: loginId, ...scopeParams(scope), ...opts })
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

// GET /api/max-risk/ — one row per account; the rule is under review with the
// client, so screens label it that way rather than as a breach.
// opts: { login_id, plan, scan_date, breached, status, tier, trading_platform,
//         date_from, date_to, ordering, page, page_size }
export function fetchMaxRisk(opts = {}) {
  return get('/api/max-risk/', opts)
}
// Accepts the flag id or the bare login.
export function fetchMaxRiskDetail(flagIdOrLogin) {
  return get(`/api/max-risk/${seg(flagIdOrLogin)}/`)
}

// GET /api/minimum-trading-days/ — accounts short of the required trading days.
// `breached=true` means "not met": a payout note, never a rule breach.
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
// currency / event_date / start_time / gmt_offset / speaker / source, plus the
// audit fields (created_by, updated_by, deleted_at, is_deleted,
// excluded_from_news_check).
// opts: { search, type, event_date, from, to, currency, speaker, event_name,
//         source, created_by, include_deleted, ordering, page, page_size }
// Soft-deleted rows are hidden unless include_deleted=true.
//
// GET /api/news-events/{id}/ — one event; a deleted one comes back with
// is_deleted: true.
export function fetchNewsEvents(opts = {}) {
  return get('/api/news-events/', opts)
}
export function fetchNewsEventDetail(id) {
  return get(`/api/news-events/${encodeURIComponent(id)}/`)
}

// ---- speech form (writes need staff or a news-editor group; else 403) ----
// Every write answers { event, warnings[] } (delete/restore: { event }).
// Build bodies with newsEventForm.js so they match the server's rules.

// GET /api/news-events/defaults/?date= -> { date, gmt_offset, type, source }
export function fetchNewsEventDefaults(date) {
  return get('/api/news-events/defaults/', { date })
}
// 201 -> { event, warnings }; 400 -> field errors (ApiError.fieldErrors)
export function createNewsEvent(body) {
  return post('/api/news-events/', body)
}
// Send only the changed fields; `type` cannot change and a deleted event must
// be restored first (both 400).
export function updateNewsEvent(id, changes) {
  return patch(`/api/news-events/${seg(id)}/`, changes)
}
// Soft delete; 400 if already deleted.
export function deleteNewsEvent(id) {
  return post(`/api/news-events/${seg(id)}/delete/`)
}
// 400 if not deleted.
export function restoreNewsEvent(id) {
  return post(`/api/news-events/${seg(id)}/restore/`)
}
// -> { event, count, history: [{ action, changed_by, changed_at, old_row, new_row }] }, oldest first
export function fetchNewsEventHistory(id) {
  return get(`/api/news-events/${seg(id)}/history/`)
}

// GET /api/account-search/ — the account directory. `search` under 2 chars is
// not sent by the caller; `phase` narrows to e.g. qualified accounts.
// -> { results, has_next }
//
// An exact single-login match on page 1 also builds the whole account page AND
// queues a re-check of every rule — so anything that is not a deliberate
// search-submit (type-ahead, the browsable list) must pass review=false. That
// is the default here; searchAccountWithReview below is the one opt-in.
export function fetchAccountSearch(search, opts = {}) {
  return get('/api/account-search/', { search, review: false, ...opts })
}

// Search-submit. On an exact match the response carries `review` (the same
// payload as fetchAccountReview) or `review_note` when the page could not be
// built; otherwise it is a plain directory listing.
export function searchAccountWithReview(search, scope) {
  return get('/api/account-search/', { search, ...scopeParams(scope) })
}

// ---- account page (T21 / T22) ----

// GET /api/account-review/ — the account page:
//   { login_id, account, scope, periods, period_profit, review, refreshing,
//     recheck: { task_id, sent, reused, note }, notes, generated_at }
// `refresh: false` only reads the stored review; leaving it out also queues a
// re-check of that scope.
export function fetchAccountReview(loginId, scope, { refresh = true } = {}) {
  return get('/api/account-review/', { login_id: loginId, ...scopeParams(scope), refresh: refresh ? undefined : false })
}

// The two calls below are in the spec but NOT in the current backend build
// ("no re-check queue in this build" — the Postman collection): there the
// page is a pure read and carries no `refreshing` / `recheck`, so
// useAccountReview never starts polling. Don't surface "Re-check now" until
// the queue ships.
//
// POST /api/account-review/recheck/ — "Re-check now". 202 when a task was
// sent, 200 when not (de-duplicated or rate-limited: `recheck.note` says why).
// -> { login_id, scope, refreshing, recheck, period_profit, notes }
export function postAccountRecheck(loginId, scope) {
  return post('/api/account-review/recheck/', { login_id: loginId, ...scopeParams(scope) })
}

// GET /api/account-review/status/ — one poll of a queued re-check.
// -> { task_id, state: refreshing|done|failed, error, review?, note?, … }
// login_id lets the server fill review.header.payoutPeriods.
export function fetchAccountReviewStatus(taskId, loginId) {
  return get('/api/account-review/status/', { task_id: taskId, login_id: loginId })
}

// GET /api/payout-periods/ — the scope switch on its own.
// -> { login_id, purchase_date, payout_type, periods[], current_scope, rules }
export function fetchPayoutPeriods(loginId) {
  return get('/api/payout-periods/', { login_id: loginId })
}

// GET /api/account-reviews/ — stored reviews, one row per login + scope_key.
// opts: { login_id, scope_key, status, tier, date_from, date_to, ordering, page, page_size }
export function fetchAccountReviews(opts = {}) {
  return get('/api/account-reviews/', opts)
}
// GET /api/account-reviews/<login>/?scope_key= — the row plus the full result.
export function fetchAccountReviewDetail(loginId, scopeKey) {
  return get(`/api/account-reviews/${seg(loginId)}/`, { scope_key: scopeKey })
}

// ---- rule drill-down (T23–T31) ----
// Nine endpoints, one envelope:
//   { login_id, scope, periods, account, result, stored_review_chip,
//     stored_review_checked_at }
// Keyed by the drill-down's rule key (see RULES in reviewModel.js).
export const RULE_ACCOUNT_PATHS = {
  news_trading: '/api/news-trading/account/',
  gambling: '/api/gambling/account/',
  weekend_holding: '/api/weekend-holding/account/',
  order_book_spam: '/api/order-book-spam/account/',
  max_risk: '/api/max-risk/account/',
  max_lot: '/api/max-lot/account/',
  one_percent: '/api/one-percent/account/',
  minimum_trading_days: '/api/minimum-trading-days/account/',
  two_minute: '/api/two-minute/account/',
}

export function fetchRuleForAccount(rule, loginId, scope) {
  const path = RULE_ACCOUNT_PATHS[rule]
  if (!path) return Promise.reject(new ApiError(`No drill-down for rule "${rule}".`, 400))
  // manual_profit only means something to Two Minute; the others would ignore it.
  const params = scopeParams(scope)
  if (rule !== 'two_minute') delete params.manual_profit
  return get(path, { login_id: loginId, ...params })
}

// ---- Two Minute (T24) ----

// GET /api/two-minute/verdict/ — one `verdict` for the scope, or with
// scope=all `verdicts[]` (oldest first) + `summary { periods,
// breached_periods, any_breach }`. Replaces the old payout `cycles[]`.
export function fetchTwoMinuteVerdict(loginId, scope) {
  return get('/api/two-minute/verdict/', { login_id: loginId, ...scopeParams(scope) })
}

// GET /api/two-minute/daily/ — per-day facts behind the verdict.
// opts: { login_id, trading_platform, trade_date, date_from, date_to, ordering, page, page_size }
export function fetchTwoMinuteDaily(opts = {}) {
  return get('/api/two-minute/daily/', opts)
}

// ---- system ----

// GET /api/health/ — no auth needed, but sent with it like everything else.
// -> { …, review_queue{configured, connected}, news_events{…}, nightly_runs{…} }
export function fetchHealth() {
  return get('/api/health/')
}

// GET /api/run-log/ — nightly detector runs. A `status: running` row that is
// old is a hung job.
// opts: { detector, status, run_date, sink, date_from, date_to, ordering, page, page_size }
export function fetchRunLog(opts = {}) {
  return get('/api/run-log/', opts)
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
