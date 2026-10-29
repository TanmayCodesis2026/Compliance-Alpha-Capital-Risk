// The speech form (news events): client-side copy of the server's rules, so a
// reviewer sees a bad field before the round-trip, plus the body builders for
// POST (create) and PATCH (only what changed).
//
// The server stays the authority — it re-validates and answers 400
// { "<field>": ["message"] }, which ApiError.fieldErrors returns in the same
// shape as validateNewsEvent below, so a form renders both the same way.
// Messages copy the API's wording where the spec gives it.

export const CURRENCIES = ['AUD', 'CAD', 'CHF', 'EUR', 'GBP', 'JPY', 'NZD', 'USD']
export const EVENT_TYPES = ['speech', 'release']
export const GMT_OFFSETS = ['GMT+2', 'GMT+3']

export const EXCLUDED_SPEECH_WARNING =
  'This speech has no live start or end time: News Trading does not check it and lists it as an excluded speech until both times are entered.'

export const EMPTY_EVENT = {
  type: 'speech', event_date: '', event_name: '', speaker: '', currency: [],
  gmt_offset: '', start_time: '', live_start_time: '', end_time: '',
  source_url: '', notes: '',
}

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/
const PLACEHOLDERS = new Set(['--', 'tbd'])

const str = (v) => (v === null || v === undefined ? '' : String(v).trim())

// A real calendar day, not just the right shape ("2026-02-30" is not).
function isDay(v) {
  const m = DATE.exec(v)
  if (!m) return false
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3]
}

// "09:30" / "09:30:00" -> "09:30:00"; '' for blank or a placeholder; null when malformed.
export function normalizeTime(v) {
  const s = str(v)
  if (!s || PLACEHOLDERS.has(s.toLowerCase())) return ''
  const m = TIME.exec(s)
  return m ? `${m[1]}:${m[2]}:${m[3] || '00'}` : null
}

// "GMT+3" / "+3" / "3" -> "GMT+3"; '' for blank; null when not an allowed offset.
export function normalizeOffset(v) {
  const s = str(v).toUpperCase().replace(/^GMT/, '').replace(/^\+/, '')
  if (!s) return ''
  const label = `GMT+${s}`
  return GMT_OFFSETS.includes(label) ? label : null
}

// ["eur","USD"] or "eur, usd" -> ["EUR","USD"], de-duplicated, order kept.
export function parseCurrencies(v) {
  const list = Array.isArray(v) ? v : str(v).split(',')
  return [...new Set(list.map((c) => str(c).toUpperCase()).filter(Boolean))]
}

// -> { field: ["message"] }; empty object when the form can be sent.
export function validateNewsEvent(values) {
  const errors = {}
  const add = (field, msg) => { (errors[field] ||= []).push(msg) }
  const type = str(values.type) || 'speech'

  if (!EVENT_TYPES.includes(type)) add('type', 'The type must be speech or release.')

  const date = str(values.event_date)
  if (!date) add('event_date', 'The event date is required (YYYY-MM-DD).')
  else if (!isDay(date)) add('event_date', 'The event date must be a real date (YYYY-MM-DD).')

  const name = str(values.event_name)
  if (!name) add('event_name', 'The event name is required.')
  else if (name.length > 300) add('event_name', 'The event name must be at most 300 characters.')

  if (str(values.speaker).length > 200) add('speaker', 'The speaker must be at most 200 characters.')

  const currencies = parseCurrencies(values.currency)
  if (!currencies.length) add('currency', 'Pick at least one currency.')
  for (const c of currencies.filter((c) => !CURRENCIES.includes(c))) {
    add('currency', `Unknown currency ${c}. Allowed: ${CURRENCIES.join(', ')}.`)
  }

  if (normalizeOffset(values.gmt_offset) === null) add('gmt_offset', 'The GMT offset must be GMT+2 or GMT+3.')

  const start = normalizeTime(values.start_time)
  if (!start) add('start_time', 'The scheduled start time is required (HH:MM or HH:MM:SS).')

  // A release has no live window, so its live times are not validated (and
  // not sent — see toNewsEventBody).
  if (type === 'speech') {
    const live = normalizeTime(values.live_start_time)
    const end = normalizeTime(values.end_time)
    if (live === null) add('live_start_time', 'The live start time must be HH:MM or HH:MM:SS.')
    if (end === null) add('end_time', 'The end time must be HH:MM or HH:MM:SS.')
    // Zero-padded HH:MM:SS compares correctly as a string.
    if (live && end && end <= live) add('end_time', 'The end time must be after the live start time (same date).')
  }

  const url = str(values.source_url)
  if (url && !/^https?:\/\//i.test(url)) add('source_url', 'The source URL must start with http:// or https://.')

  return errors
}

// Predicts the server's excluded-speech warning so the form can say so before
// saving; the server's own `warnings[]` is what is shown after.
export function isExcludedSpeech(values) {
  return (str(values.type) || 'speech') === 'speech' && !(normalizeTime(values.live_start_time) && normalizeTime(values.end_time))
}

// Form values -> the POST body. Blank optional fields go as null so a PATCH
// built from the same function can clear them.
export function toNewsEventBody(values) {
  const type = str(values.type) || 'speech'
  const opt = (v) => str(v) || null
  return {
    type,
    event_date: str(values.event_date),
    event_name: str(values.event_name),
    speaker: opt(values.speaker),
    currency: parseCurrencies(values.currency).join(','),
    // left null, the server fills it from the date (GET /news-events/defaults/)
    gmt_offset: normalizeOffset(values.gmt_offset) || null,
    start_time: normalizeTime(values.start_time) || null,
    live_start_time: type === 'speech' ? normalizeTime(values.live_start_time) || null : null,
    end_time: type === 'speech' ? normalizeTime(values.end_time) || null : null,
    source_url: opt(values.source_url),
    notes: opt(values.notes),
  }
}

// A stored event row -> form values (the inverse of toNewsEventBody).
export function fromNewsEvent(event) {
  if (!event) return { ...EMPTY_EVENT }
  const out = { ...EMPTY_EVENT }
  for (const k of Object.keys(EMPTY_EVENT)) if (event[k] !== null && event[k] !== undefined) out[k] = event[k]
  out.currency = parseCurrencies(event.currency)
  for (const k of ['start_time', 'live_start_time', 'end_time']) out[k] = normalizeTime(out[k]) || ''
  return out
}

// The PATCH body: only fields whose normalised value differs from the stored
// row. `type` is never sent — the API refuses to change it.
export function newsEventChanges(event, values) {
  const before = toNewsEventBody(fromNewsEvent(event))
  const after = toNewsEventBody(values)
  const changes = {}
  for (const [k, v] of Object.entries(after)) {
    if (k !== 'type' && v !== before[k]) changes[k] = v
  }
  return changes
}

// Read-only users can open the form but not save; edits on a deleted row are
// refused until it is restored. Returns the reason a write is blocked, or null.
export function writeBlockedReason(event, { canEdit }) {
  if (!canEdit) return 'You can read news events but not change them (news editor rights needed).'
  if (event?.is_deleted) return 'Restore this event before editing it.'
  return null
}
