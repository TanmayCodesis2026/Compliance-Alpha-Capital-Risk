// Value formatters shared by the scan-result screens (Order Book Spam,
// Gambling, News Trading). Kept apart from ScanFields.jsx so that file exports
// components only and Fast Refresh keeps working.

// 0.008771 -> "0.88%"
export function pct(fraction, dp = 2) {
  const n = Number(fraction)
  return isNaN(n) ? '—' : `${(n * 100).toFixed(dp)}%`
}

// "position:103270028" -> "103270028"
export const stripPositionId = (v) => String(v ?? '').replace(/^position:/, '')

// Sum a column of API numbers, which arrive as either numbers or decimal
// strings ("25000.000000"), skipping anything unparseable.
export const sumNumeric = (xs) => (xs || []).reduce((a, n) => a + (Number(n) || 0), 0)

export const uniq = (xs) => [...new Set((xs || []).filter(Boolean))]

// Each model names its findings array differently; this resolves it without
// each screen hard-coding the name. Returns { key, rows } so a panel can label
// the section with the API's own wording.
const FINDING_KEYS = ['findings', 'flagged_trades', 'clusters', 'breaches', 'violations', 'trades', 'entries', 'days', 'results']

export function findingsOf(row) {
  for (const k of FINDING_KEYS) if (Array.isArray(row?.[k])) return { key: k, rows: row[k] }
  // fall back to the first array of objects on the payload
  const found = Object.entries(row || {}).find(([, v]) => Array.isArray(v) && v.length && typeof v[0] === 'object')
  return found ? { key: found[0], rows: found[1] } : { key: null, rows: [] }
}

// The model's own "*_count" field when it has one, else the array length.
export function findingCount(row) {
  const entry = Object.entries(row || {}).find(([k, v]) => /_count$/.test(k) && typeof v === 'number')
  return entry ? entry[1] : findingsOf(row).rows.length
}
