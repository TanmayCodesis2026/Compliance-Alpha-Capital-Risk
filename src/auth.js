// Token storage + refresh for the compliance API.
//
// Login (via useSession) writes the session here; screens read from here.
// "Remember me" picks the backing store: localStorage survives the tab,
// sessionStorage doesn't. Only one store is ever populated so a stale token
// can't outrank a fresh one.
//
// Screens should not call fetch() directly — use authJson()/authFetch(), which
// attach the bearer token and recover from an expired one exactly once.
const baseURL = import.meta.env.VITE_BASE_URL;

// const REFRESH_URL = 'https://backend.alphacapitalgroup.uk/get/refreshtoken/'
const REFRESH_URL = `${baseURL}get/refreshtoken/`
const KEYS = ['idToken', 'refreshToken', 'expiresAt']

// Refresh this far before the stamped expiry so a request in flight can't land
// on the far side of it (also absorbs mild client/server clock skew).
const SKEW_MS = 60 * 1000

// The store holding the current session. localStorage wins because clearTokens()
// guarantees the other one is empty.
const Token = localStorage.getItem('idToken')
function activeStore() {
  return localStorage.getItem('idToken') ? localStorage : sessionStorage
}

export function getToken() {
  return activeStore().getItem('idToken') || ''
}

export function getRefreshToken() {
  return activeStore().getItem('refreshToken') || ''
}

// Milliseconds until the token needs replacing; 0 when it already does.
export function msUntilRefresh() {
  const expiresAt = Number(activeStore().getItem('expiresAt') || 0)
  if (!expiresAt) return 0
  return Math.max(0, expiresAt - SKEW_MS - Date.now())
}

export function isTokenExpired() {
  return msUntilRefresh() === 0
}

export function clearTokens() {
  KEYS.forEach((k) => { localStorage.removeItem(k); sessionStorage.removeItem(k) })
}

// Accepts the sign-in / refresh payload in either casing the backend uses.
// `remember` is only passed at sign-in; a refresh keeps whichever store is live.
export function saveTokenData(data, { remember } = {}) {
  const idToken = data?.idToken || data?.id_token || ''
  if (!idToken) return ''

  const target = remember === undefined ? activeStore() : (remember ? localStorage : sessionStorage)
  const refresh = data?.refreshToken || data?.refresh_token || getRefreshToken()
  clearTokens() // drop any copy in the other store

  const expiryValue = data?.expiresIn ?? data?.expires_in
  const expiresAt = expiryValue
    ? Date.now() + Number(expiryValue) * 1000
    : Date.now() + 60 * 60 * 1000

  target.setItem('idToken', idToken)
  target.setItem('refreshToken', refresh)
  target.setItem('expiresAt', String(expiresAt))
  return idToken
}

// ---- session-expiry broadcast ----
// Anything holding session state (useSession) subscribes; auth.js fires this the
// moment a token proves unrecoverable, so the UI can drop back to Login.

const expiryListeners = new Set()

export function onSessionExpired(listener) {
  expiryListeners.add(listener)
  return () => expiryListeners.delete(listener)
}

export class SessionExpiredError extends Error {
  constructor(message = 'Your session has expired. Please sign in again.') {
    super(message)
    this.name = 'SessionExpiredError'
  }
}

function endSession() {
  clearTokens()
  expiryListeners.forEach((listener) => listener())
}

// ---- refresh ----

let refreshInFlight = null // single-flight guard

async function requestRefresh() {
  const refreshValue = getRefreshToken()
  if (!refreshValue) return ''

  const response = await fetch(REFRESH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Token}`,
    },
    credentials: 'include',
  }).catch((err) => {
    console.error('Token refresh request failed', err)
    return null
  })

  if (!response) return '' // network error — treat as unrecoverable for this attempt

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    console.error('Token refresh failed', response.status, response.statusText, data)
    return ''
  }
  return saveTokenData(data)
}

// Returns the new token, or '' when the session can't be recovered.
//
// Concurrent callers share one network round-trip: without this, three screens
// hitting a 401 together would fire three refreshes, and the last two would send
// a refresh token the first call had already rotated away.
export function refreshToken() {
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = requestRefresh().finally(() => { refreshInFlight = null })
  return refreshInFlight
}

// ---- authenticated fetch ----

function withAuth(url, options, token) {
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
    credentials: 'include',
  })
}

// fetch() with the bearer token attached. Refreshes ahead of a known expiry, and
// retries ONCE if the server rejects the token anyway. Throws SessionExpiredError
// when the session is gone — callers can let that propagate; useSession will have
// already bounced the UI to Login.
//
// `authFailureStatuses` says which codes mean "the token is bad". The default
// keeps 403 in for the customer backend; the risk engine answers 403 for a
// permission it will never grant (no news-editor rights), and treating that as
// an expired session would sign the reviewer out for pressing Save.
export async function authFetch(url, { authFailureStatuses = [401, 403], ...options } = {}) {
  const isAuthFailure = (res) => authFailureStatuses.includes(res.status)
  let token = getToken()

  // Proactive: don't spend a request we know will come back 401.
  if (!token || isTokenExpired()) {
    token = await refreshToken()
    if (!token) { endSession(); throw new SessionExpiredError() }
  }

  let response = await withAuth(url, options, token)
  if (!isAuthFailure(response)) return response

  // Reactive: server disagreed about validity (revoked, rotated elsewhere).
  const fresh = await refreshToken()
  if (!fresh) { endSession(); throw new SessionExpiredError() }

  response = await withAuth(url, options, fresh)
  if (isAuthFailure(response)) { endSession(); throw new SessionExpiredError() }
  return response
}

// authFetch + JSON parsing. Throws on a non-2xx with the server's `detail` when
// it sends one, so screens can surface a real message instead of a status code.
// The error also carries `status` and the parsed `body`: a 300 lists the
// candidate logins and a 400 names the fields that failed, and both are lost
// if only the message survives.
export async function authJson(url, options = {}) {
  const response = await authFetch(url, options)

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let body = null
    try { body = text ? JSON.parse(text) : null } catch { /* not JSON */ }
    console.error('Request failed', url, response.status, response.statusText, text)
    const err = new Error(body?.detail || `Request failed: ${response.status} ${response.statusText}`)
    err.status = response.status
    err.body = body
    throw err
  }

  return response.json()
}
