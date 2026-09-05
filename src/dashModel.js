// Shapes and rules for the Custom Dash tab.
//
// Bound to the real v1.1 payloads. Two envelopes:
//
//   GET  {base}/catalogue
//     { schema, generated_at, dashboards: [ { slug, title, description, hidden,
//       versions_count, created_at, current: <version> } ] }
//
//   GET  {base}/{slug}/versions?limit=50
//     { slug, current_version_id, versions: [ <version> ], next_cursor }
//
//   <version> = { version_id, published_at, kind, notes, data_run_date,
//                 stale_hours_at_publish, bytes_total, publisher_label? }
//
// `publisher_label` appears on the versions endpoint only — the catalogue's
// embedded `current` omits it — and `notes` is null on refresh versions.

// Every version records how old its source extract was at publish time. Past
// this many hours the tile and the page both warn: the numbers on screen are
// old enough that someone could act on a stale picture.
export const STALE_HOURS = 30

// Version ids lead with a timestamp ("20260903T183952Z-5eff"). published_at is
// the authority for ordering; this is the fallback when it is missing, and is
// still far better than the slug — it reflects when the version was published.
function timeFromVersionId(id) {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/.exec(id || '')
  if (!m) return 0
  const [, y, mo, d, h, mi, s] = m
  return Date.parse(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`) || 0
}

export function normVersion(v) {
  if (!v) return null
  const staleHours = Number(v.stale_hours_at_publish)
  const bytes = Number(v.bytes_total)
  return {
    versionId: v.version_id || '',
    publishedAt: v.published_at || '',
    // "authored" — someone published a new build. "refresh" — the nightly job
    // re-ran the same build against newer data. The picker marks refreshes so a
    // reviewer can tell a content change from a data change.
    kind: (v.kind || 'authored').toLowerCase(),
    // Null on every refresh version, so callers must treat it as optional.
    notes: v.notes || '',
    // The date of the data run behind the build, not the publish date — those
    // differ by the stale window and conflating them hides exactly the gap the
    // stale badge exists to show.
    dataRunDate: v.data_run_date || '',
    staleHours: Number.isFinite(staleHours) ? staleHours : null,
    bytes: Number.isFinite(bytes) ? bytes : 0,
    publisherLabel: v.publisher_label || '',
    // Sort key, resolved once here so callers never re-derive it.
    at: Date.parse(v.published_at) || timeFromVersionId(v.version_id),
  }
}

export function normEntry(e) {
  if (!e) return null
  return {
    slug: e.slug || '',
    title: e.title || e.slug || 'Untitled',
    description: e.description || '',
    hidden: Boolean(e.hidden),
    versionsCount: Number(e.versions_count) || 0,
    createdAt: e.created_at || '',
    current: normVersion(e.current),
  }
}

export function readCatalogue(payload) {
  return (payload?.dashboards || [])
    .map(normEntry)
    .filter((e) => e && e.slug && !e.hidden)
    // Newest publish first. Deliberately on the CURRENT version's published_at,
    // not the slug and not created_at — breach-watch was created first but its
    // latest version is the oldest publish, so it belongs last.
    .sort((a, b) => (b.current?.at || 0) - (a.current?.at || 0))
}

// -> { currentVersionId, versions, nextCursor }
//
// currentVersionId is carried through rather than inferred from position: it is
// what `promote` rewrites on a rollback, at which point "latest published" and
// "current" stop being the same version.
export function readVersions(payload) {
  return {
    currentVersionId: payload?.current_version_id || '',
    versions: (payload?.versions || [])
      .map(normVersion)
      .filter(Boolean)
      .sort((a, b) => (b.at || 0) - (a.at || 0)),
    // Only set if a dashboard ever exceeds the page limit; nothing pages yet.
    nextCursor: payload?.next_cursor || null,
  }
}

export const isStale = (v) => Number.isFinite(v?.staleHours) && v.staleHours > STALE_HOURS

// Reads as "how old the data already was when this was published", which is the
// question the number answers — not how long ago the publish happened.
export function fmtStale(h) {
  if (!Number.isFinite(h)) return ''
  if (h < 1) return `${Math.round(h * 60)}m`
  return `${h % 1 === 0 ? h : h.toFixed(1)}h`
}

export function fmtBytes(bytes) {
  if (!bytes) return ''
  const mb = bytes / 1e6
  return mb >= 10 ? `${Math.round(mb)} MB` : `${mb.toFixed(2)} MB`
}
