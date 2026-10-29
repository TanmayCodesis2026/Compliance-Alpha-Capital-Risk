// The payout-period scope (T21): which slice of an account's history a review,
// a Two Minute verdict or a rule drill-down covers. Every period-aware endpoint
// takes the same query set, so the screens hold one scope object and api.js
// turns it into params here — no screen builds `scope=` strings by hand.
//
// Scope object (client side):
//   { kind: 'current' }                     default — the open period, or the
//                                           full history when nothing is closed
//   { kind: 'previous' }                    400 when there is no closed period
//   { kind: 'full' }
//   { kind: 'period', index: 2 }            1-based, oldest first
//   { kind: 'custom', from, to }            exact UTC instants "…T…:…:….000Z"
//   { kind: 'all' }                         Two Minute verdict only
// plus an optional `manualProfit` (> 0): the reviewer-entered period net profit
// the funded Two Minute check uses when no balance history exists.

export const DEFAULT_SCOPE = { kind: 'current' }

// The API rejects anything but milliseconds + Z, so "2026-08-03T09:05:00Z" is a 400.
const UTC_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

// Date | ISO string | epoch ms -> "2026-08-03T09:05:00.000Z", or '' when unparseable.
export function toUtcInstant(value) {
  if (value === null || value === undefined || value === '') return ''
  const d = value instanceof Date ? value : new Date(value)
  return isNaN(d) ? '' : d.toISOString()
}

// Why a scope can't be sent, or null when it can. Mirrors the server's 400s so
// the reviewer sees the problem before a round-trip.
export function validateScope(scope, { allowAll = false } = {}) {
  if (!scope) return null
  switch (scope.kind) {
    case 'current':
    case 'previous':
    case 'full':
      break
    case 'all':
      if (!allowAll) return 'All periods is only available for the Two Minute verdict.'
      break
    case 'period':
      if (!Number.isInteger(scope.index) || scope.index < 1) return 'Pick a payout period.'
      break
    case 'custom':
      if (!scope.from || !scope.to) return 'A custom range needs both a start and an end.'
      if (!UTC_INSTANT.test(scope.from) || !UTC_INSTANT.test(scope.to)) return 'The range must be exact UTC times.'
      if (scope.from >= scope.to) return 'The range end must be after its start.'
      break
    default:
      return `Unknown scope "${scope.kind}".`
  }
  if (scope.manualProfit !== undefined && scope.manualProfit !== null && scope.manualProfit !== '') {
    const n = Number(scope.manualProfit)
    if (!isFinite(n) || n <= 0) return 'The manual profit must be a number above 0.'
  }
  return null
}

// Scope object -> query params. Undefined values are dropped by buildUrl, so a
// missing scope sends nothing and the server applies its own default (current).
export function scopeParams(scope) {
  if (!scope) return {}
  const params = {}
  if (scope.kind === 'custom') {
    params.scope_from = scope.from
    params.scope_to = scope.to
  } else if (scope.kind === 'period') {
    params.scope = `period:${scope.index}`
  } else if (scope.kind) {
    params.scope = scope.kind
  }
  const profit = Number(scope.manualProfit)
  if (scope.manualProfit !== '' && isFinite(profit) && profit > 0) params.manual_profit = profit
  return params
}

// Stable identity for "is this the same scope", e.g. to drop a response that
// arrives after the reviewer has already switched.
export const scopeId = (scope) => JSON.stringify(scopeParams(scope))

const day = (iso) => (iso ? String(iso).slice(0, 10) : '')

// The switch's options, built from the response's periods[]. "Previous" only
// exists once a period has closed — the API answers 400 otherwise.
export function scopeOptions(periods = []) {
  const opts = [{ value: 'current', label: 'Current', scope: { kind: 'current' } }]
  if (periods.some((p) => p.status === 'closed')) {
    opts.push({ value: 'previous', label: 'Previous', scope: { kind: 'previous' } })
  }
  opts.push({ value: 'full', label: 'Full history', scope: { kind: 'full' } })
  for (const p of periods) {
    opts.push({
      value: `period:${p.index}`,
      label: `Period ${p.index} · ${day(p.start)} – ${p.end ? day(p.end) : 'open'}`,
      scope: { kind: 'period', index: p.index },
    })
  }
  opts.push({ value: 'custom', label: 'Custom range…', scope: null })
  return opts
}

// Inverse of scopeOptions' `value`, for a <select> bound to the current scope.
export function scopeOptionValue(scope) {
  if (!scope) return 'current'
  if (scope.kind === 'period') return `period:${scope.index}`
  return scope.kind
}
