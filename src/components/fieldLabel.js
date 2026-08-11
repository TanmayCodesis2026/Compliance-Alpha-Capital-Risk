// "totalOpenedLots" and "total_opened_lots" both -> "Total opened lots".
// Lower-casing after the camel split is what keeps the two spellings reading
// the same; the acronym pass then restores the ones that shouldn't be.
export const fieldLabel = (key) => String(key)
  .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  .replace(/[_-]+/g, ' ')
  .toLowerCase()
  .replace(/\b(id|ids|url|pnl|gmt|mt5|rr|rt|gt|tod|utc)\b/g, (m) => m.toUpperCase())
  .replace(/^./, (c) => c.toUpperCase())

// ---- value classification, shared by the auto-rendered table and detail panel ----
// Keys are matched by meaning rather than exact name so a model that spells a
// field differently still formats correctly.
export const isMt5Stamp = (v) => typeof v === 'string' && /^\d{4}[.\-/]\d{2}[.\-/]\d{2}[ T]\d{2}:\d{2}/.test(v)
export const isDay = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
export const isIso = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)
export const isClockTime = (v) => typeof v === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(v)

export const isMoneyKey = (k) => /profit|pnl|balance|amount|threshold|equity|payout|loss|risk|deduct/i.test(k)
export const isIdArrayKey = (k) => /ids$/i.test(k)
export const isReasonKey = (k) => /reason|note|message|description|summary/i.test(k)
export const isDirectionKey = (k) => /^(direction|side)$/i.test(k)
export const isCountKey = (k) => /count|total|num_|_num$|occurrences|recurrence/i.test(k)

// Fields that identify a row — these lead the table, in this order.
const IDENTITY_ORDER = [
  /^flag_id$/i, /^id$/i, /^flag_type$/i, /^type$/i, /^severity$/i,
  /^login_id$/i, /^login$/i, /^user_id$/i, /^account_name$/i, /^account$/i,
  /^plan/i, /^symbol/i, /^instrument/i, /^direction$/i, /^side$/i,
  // recurrence gates RT/GT severity, so it belongs in the table rather than
  // being ranked with the ordinary counts and pushed off the end
  /^recurrence$/i, /^num_users$/i,
  /date$/i, /^scan_date$/i, /time$/i,
]

// Sort key for a field: identity first (in IDENTITY_ORDER), then counts, then
// everything else alphabetically, with timestamps last since they're the least
// useful thing to scan a table by.
export function fieldRank(key) {
  const idx = IDENTITY_ORDER.findIndex((re) => re.test(key))
  if (idx !== -1) return idx
  if (/^(created_at|updated_at|synced_at)$/i.test(key)) return 900
  if (isCountKey(key)) return 500
  return 700
}
