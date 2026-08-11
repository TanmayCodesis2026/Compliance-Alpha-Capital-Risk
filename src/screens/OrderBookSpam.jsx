import TradeFlags from './TradeFlags.jsx'
import { fetchOrderBookSpam, fetchOrderBookSpamDetail } from '../api.js'
import { fmtDate, fmtDay } from '../data.js'
import { DirectionPill, Pill } from '../components/ScanFields.jsx'
import { uniq } from '../components/scanFormat.js'
import OrderBookSpamDetail from './OrderBookSpamDetail.jsx'

// An OBS row is a *scan result*, not a trade: one login, one scan date, and a
// list of clusters — each cluster being N positions opened on the same symbol
// and side inside a rolling window. Symbol/direction therefore live per-cluster
// rather than on the row, so the list summarises them and the expanded panel
// (OrderBookSpamDetail) shows each cluster in full.
const clustersOf = (r) => (Array.isArray(r.clusters) ? r.clusters : [])

const columns = [
  { key: 'flag_id', label: 'Flag ID', width: 165, mono: true, render: (r) => <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{r.flag_id}</span> },
  { key: 'login_id', label: 'Login', width: 105, mono: true },
  { key: 'scan_date', label: 'Scan date', width: 120, muted: true, render: (r) => fmtDay(r.scan_date) },
  { key: 'symbols', label: 'Symbols', width: 130, mono: true, render: (r) => {
      const s = uniq(clustersOf(r).map((c) => c.symbol))
      return s.length ? s.join(', ') : '—'
    } },
  { key: 'direction', label: 'Direction', width: 110, render: (r) => {
      const d = uniq(clustersOf(r).map((c) => c.direction))
      if (d.length === 0) return <span style={{ color: 'var(--text-3)' }}>—</span>
      if (d.length === 1) return <DirectionPill direction={d[0]} />
      // mixed sides across clusters — don't pick one to show
      return <Pill>MIXED · {d.length}</Pill>
    } },
  { key: 'cluster_count', label: 'Clusters', width: 90, align: 'right', mono: true, render: (r) => Number(r.cluster_count ?? clustersOf(r).length).toLocaleString() },
  { key: 'total_entries_flagged', label: 'Entries', width: 90, align: 'right', mono: true, render: (r) => Number(r.total_entries_flagged ?? 0).toLocaleString() },
  { key: 'created_at', label: 'Flagged at', width: 130, mono: true, muted: true, render: (r) => fmtDate(r.created_at) },
]

export default function OrderBookSpam({ onAccountClick, initialAccount }) {
  return (
    <TradeFlags
      title="Order Book Spam"
      subtitle="OBS — three or more positions opened on one symbol and side inside a rolling 90-second window, held open together."
      fetcher={fetchOrderBookSpam}
      flagSource="order_book_spam"
      columns={columns}
      onAccountClick={onAccountClick}
      initialAccount={initialAccount}
      detailFetcher={fetchOrderBookSpamDetail}
      // there is no numeric pk on an OBS row — the flag_id ("obs-d64401ee4e4d")
      // is the resource key
      detailIdOf={(r) => r.flag_id}
      renderDetail={(d) => <OrderBookSpamDetail data={d} />}
      searchPlaceholder="Search flag IDs…"
      filters={[
        { param: 'direction', label: 'Direction', options: [
          { value: 'buy', label: 'Buy', color: 'var(--ok)', soft: 'var(--ok-soft)' },
          { value: 'sell', label: 'Sell', color: 'var(--crit)', soft: 'var(--crit-soft)' },
        ] },
        { param: 'symbol', label: 'Symbol', type: 'text', placeholder: 'XAUUSD', upper: true, width: 100 },
        { param: 'login_id', label: 'Login', type: 'text', placeholder: 'login id…', width: 120 },
        { param: 'scan_date', label: 'Scan date', type: 'text', placeholder: 'YYYY-MM-DD', width: 120 },
      ]}
    />
  )
}
