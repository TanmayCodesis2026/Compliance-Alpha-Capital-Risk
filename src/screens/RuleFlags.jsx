import TradeFlags from './TradeFlags.jsx'
import { fmtDate, fmtDay } from '../data.js'
import ScanDetail from './ScanDetail.jsx'
import { findingCount, findingsOf, uniq } from '../components/scanFormat.js'

// List screen shared by the five rule-check models (two-minute,
// weekend-holding, one-percent, max-lot, minimum-trading-days).
//
// Their per-finding fields aren't pinned down yet, so the columns here are the
// scan envelope every confirmed model returns — flag_id / login_id / plan /
// scan_date / a `*_count` / created_at — plus a rolled-up symbol column read
// from whichever findings array the payload carries. When a model's real shape
// lands, pass `extraColumns` to splice in its own fields; nothing here needs to
// move.

const symbolsOf = (r) => uniq(findingsOf(r).rows.flatMap((f) => f.symbols || [f.symbol]))

const baseColumns = [
  { key: 'flag_id', label: 'Flag ID', width: 185, mono: true, render: (r) => <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{r.flag_id}</span> },
  { key: 'login_id', label: 'Login', width: 100, mono: true },
  { key: 'plan', label: 'Plan', width: 150, muted: true },
  { key: 'scan_date', label: 'Scan date', width: 120, muted: true, render: (r) => fmtDay(r.scan_date) },
  { key: 'symbols', label: 'Symbols', width: 130, mono: true, render: (r) => {
      const s = symbolsOf(r)
      return s.length ? s.join(', ') : '—'
    } },
  { key: 'count', label: 'Findings', width: 90, align: 'right', mono: true, render: (r) => Number(findingCount(r)).toLocaleString() },
  { key: 'created_at', label: 'Flagged at', width: 130, mono: true, muted: true, render: (r) => fmtDate(r.created_at) },
]

export default function RuleFlags({ title, subtitle, kind, fetcher, detailFetcher, flagSource, extraColumns = [], filters = [], onAccountClick, initialAccount }) {
  // extras land before the count/created_at tail, where a model's own fields read best
  const columns = extraColumns.length
    ? [...baseColumns.slice(0, 5), ...extraColumns, ...baseColumns.slice(5)]
    : baseColumns

  return (
    <TradeFlags
      title={title}
      subtitle={subtitle}
      fetcher={fetcher}
      flagSource={flagSource}
      columns={columns}
      onAccountClick={onAccountClick}
      initialAccount={initialAccount}
      detailFetcher={detailFetcher}
      // no numeric pk on a scan row — flag_id is the resource key
      detailIdOf={(r) => r.flag_id}
      renderDetail={(d) => <ScanDetail data={d} kind={kind} />}
      searchPlaceholder="Search flag IDs…"
      filters={[
        { param: 'login_id', label: 'Login', type: 'text', placeholder: 'login id…', width: 120 },
        { param: 'scan_date', label: 'Scan date', type: 'text', placeholder: 'YYYY-MM-DD', width: 120 },
        ...filters,
      ]}
    />
  )
}
