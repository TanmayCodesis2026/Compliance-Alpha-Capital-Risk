import { useCallback, useState } from 'react'
import TradeFlags from './TradeFlags.jsx'
import ScanDetail from './ScanDetail.jsx'
import AutoValue from '../components/AutoValue.jsx'
import { Field, FieldGrid } from '../components/ScanFields.jsx'
import { fieldLabel, fieldRank, isCountKey, isReasonKey } from '../components/fieldLabel.js'

// List screen for endpoints whose row shape isn't pinned down yet — the
// cross-account detectors and the trading profiles.
//
// Columns are derived from the first row of the first page rather than declared
// up front: whatever the API returns is on screen immediately, and a per-model
// column config can replace this later by passing `columns`. The alternative —
// guessing field names — produces a table of empty cells that looks like "no
// data" rather than "wrong field", which is the failure this avoids.
//
// Fields beyond the column cap are not dropped; they appear in the row's
// expanded panel, which for a list-only endpoint reads from the row itself and
// issues no request.

const MAX_COLS = 8

// Cell width by what the value looks like, so a table of ids doesn't get the
// same geometry as a table of counts.
function widthFor(key, v) {
  if (isCountKey(key) && typeof v === 'number') return 95
  if (typeof v === 'boolean') return 90
  if (typeof v === 'number') return 110
  if (Array.isArray(v)) return 130
  if (/^(created_at|updated_at|synced_at)$/i.test(key)) return 130
  if (/date$/i.test(key)) return 125
  if (/time$/i.test(key)) return 145
  if (/^flag_id$/i.test(key)) return 185
  // composite ids (occurrence_id, group_key) run to 64+ chars; they are
  // ellipsised either way, so give them enough width to stay recognisable
  if (/^(group_key|occurrence_id)$/i.test(key) || String(v ?? '').length > 40) return 200
  if (/id$/i.test(key)) return 115
  if (isReasonKey(key)) return 260
  const len = String(v ?? '').length
  return Math.min(240, Math.max(110, len * 8))
}

function inferColumns(row) {
  const entries = Object.entries(row)
    // nested arrays of objects belong in the expanded panel, not a cell
    .filter(([, v]) => !(Array.isArray(v) && v.length && typeof v[0] === 'object'))
    .sort((a, b) => fieldRank(a[0]) - fieldRank(b[0]) || a[0].localeCompare(b[0]))

  return entries.slice(0, MAX_COLS).map(([key, v]) => ({
    key,
    label: fieldLabel(key),
    width: widthFor(key, v),
    align: typeof v === 'number' && isCountKey(key) ? 'right' : 'left',
    render: (r) => <AutoValue k={key} v={r[key]} compact />,
  }))
}

// Everything the columns didn't show, rendered from the row — no request.
function rowDetail(row, shownKeys) {
  const entries = Object.entries(row)
  const nested = entries.filter(([, v]) => Array.isArray(v) && v.length && typeof v[0] === 'object')
  const reasons = entries.filter(([k, v]) => isReasonKey(k) && typeof v === 'string' && v)
  const skip = new Set([...nested, ...reasons].map(([k]) => k))
  const rest = entries.filter(([k]) => !skip.has(k))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <FieldGrid>
        {rest.map(([k, v]) => (
          <Field key={k} label={fieldLabel(k)}><AutoValue k={k} v={v} /></Field>
        ))}
      </FieldGrid>

      {nested.map(([k, rows]) => (
        <div key={k}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)', marginBottom: 6 }}>
            {fieldLabel(k)} · {rows.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {rows.map((r, i) => (
              <div key={r.id || i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
                <FieldGrid min={110}>
                  {Object.entries(r).filter(([, rv]) => rv !== null && rv !== '').map(([rk, rv]) => (
                    <Field key={rk} label={fieldLabel(rk)}><AutoValue k={rk} v={rv} /></Field>
                  ))}
                </FieldGrid>
              </div>
            ))}
          </div>
        </div>
      ))}

      {reasons.map(([k, v]) => (
        <div key={k} style={{ fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.45, borderLeft: '2px solid var(--border)', paddingLeft: 10 }}>
          {v}
        </div>
      ))}

      {shownKeys.length > 0 && rest.length === 0 && (
        <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Every field is already shown in the table.</div>
      )}
    </div>
  )
}

export default function AutoFlags({
  title, subtitle, kind, fetcher, detailFetcher, detailIdOf,
  columns: fixedColumns, filters = [], searchPlaceholder = 'Search…',
  onAccountClick, initialAccount, actions, banner, emptyText,
}) {
  const [cols, setCols] = useState(fixedColumns || [])

  // TradeFlags owns the fetch, so the first page arrives here via onData —
  // that's the only place the row shape is knowable.
  const onData = useCallback((d) => {
    if (fixedColumns) return
    const first = (d?.results || [])[0]
    if (first) setCols((c) => (c.length ? c : inferColumns(first)))
  }, [fixedColumns])

  const shownKeys = cols.map((c) => c.key)

  return (
    <TradeFlags
      title={title}
      subtitle={subtitle}
      fetcher={fetcher}
      columns={cols}
      onData={onData}
      searchPlaceholder={searchPlaceholder}
      onAccountClick={onAccountClick}
      initialAccount={initialAccount}
      actions={actions}
      banner={banner}
      emptyText={emptyText}
      // with a detail endpoint the panel shows the fetched payload; without one
      // it shows the rest of the row
      {...(detailFetcher
        ? {
            detailFetcher,
            detailIdOf: detailIdOf || ((r) => r.flag_id ?? r.id),
            renderDetail: (d) => <ScanDetail data={d} kind={kind} />,
          }
        : { inlineDetail: (r) => rowDetail(r, shownKeys) })}
      filters={filters}
    />
  )
}
