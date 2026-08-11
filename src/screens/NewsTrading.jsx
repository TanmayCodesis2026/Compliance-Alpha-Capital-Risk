import TradeFlags from './TradeFlags.jsx'
import { fetchNewsTrading, fetchNewsTradingDetail } from '../api.js'
import { fmtDate, fmtDay } from '../data.js'
import { Money, Pill } from '../components/ScanFields.jsx'
import { sumNumeric, uniq } from '../components/scanFormat.js'
import NewsTradeDetail from './NewsTradeDetail.jsx'

// A news-trading row is a *scan result* for one login on one day: every trade
// that opened or closed inside a restricted window around a high-impact release,
// widened by `buffer_minutes` either side. Symbol, event and breach point live
// per-trade, so the list rolls them up and the expanded panel (NewsTradeDetail)
// shows each breach in full.
const tradesOf = (r) => (Array.isArray(r.flagged_trades) ? r.flagged_trades : [])

const columns = [
  { key: 'flag_id', label: 'Flag ID', width: 175, mono: true, render: (r) => <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{r.flag_id}</span> },
  { key: 'login_id', label: 'Login', width: 100, mono: true },
  { key: 'plan', label: 'Plan', width: 150, muted: true },
  { key: 'scan_date', label: 'Scan date', width: 120, muted: true, render: (r) => fmtDay(r.scan_date) },
  { key: 'symbols', label: 'Symbols', width: 120, mono: true, render: (r) => {
      const s = uniq(tradesOf(r).map((t) => t.symbol))
      return s.length ? s.join(', ') : '—'
    } },
  { key: 'events', label: 'Event', width: 190, muted: true, render: (r) => {
      const e = uniq(tradesOf(r).map((t) => t.eventName))
      if (e.length === 0) return '—'
      return e.length === 1 ? e[0] : `${e[0]} +${e.length - 1}`
    } },
  { key: 'breachedAt', label: 'Breached at', width: 110, render: (r) => {
      const b = uniq(tradesOf(r).map((t) => t.breachedAt))
      if (b.length === 0) return <span style={{ color: 'var(--text-3)' }}>—</span>
      if (b.length > 1) return <Pill>MIXED · {b.length}</Pill>
      // opening inside the window taints the whole group; closing inside is milder
      return <Pill tone={/open/i.test(b[0]) ? 'crit' : 'high'}>{String(b[0]).toUpperCase()}</Pill>
    } },
  { key: 'breach_count', label: 'Breaches', width: 90, align: 'right', mono: true, render: (r) => Number(r.breach_count ?? tradesOf(r).length).toLocaleString() },
  { key: 'profit', label: 'Profit', width: 105, align: 'right', render: (r) => <Money value={sumNumeric(tradesOf(r).map((t) => t.profit))} dp={2} /> },
  { key: 'buffer_minutes', label: 'Buffer', width: 75, align: 'right', mono: true, render: (r) => (r.buffer_minutes == null ? '—' : `±${r.buffer_minutes}m`) },
  { key: 'rules_version', label: 'Rules', width: 85, muted: true, mono: true },
  { key: 'created_at', label: 'Flagged at', width: 130, mono: true, muted: true, render: (r) => fmtDate(r.created_at) },
]

export default function NewsTrading({ onAccountClick, initialAccount }) {
  return (
    <TradeFlags
      title="News Trading"
      subtitle="Trades opened or closed inside the restricted window around a high-impact release."
      fetcher={fetchNewsTrading}
      flagSource="news_trading"
      columns={columns}
      onAccountClick={onAccountClick}
      initialAccount={initialAccount}
      detailFetcher={fetchNewsTradingDetail}
      // no numeric pk on the row — flag_id ("news-16c56e74a95c") is the key
      detailIdOf={(r) => r.flag_id}
      renderDetail={(d) => <NewsTradeDetail data={d} />}
      searchPlaceholder="Search flag IDs…"
      filters={[
        { param: 'symbol', label: 'Symbol', type: 'text', placeholder: 'XAUUSD', upper: true, width: 110 },
        { param: 'login_id', label: 'Login', type: 'text', placeholder: 'login id…', width: 120 },
        { param: 'scan_date', label: 'Scan date', type: 'text', placeholder: 'YYYY-MM-DD', width: 120 },
        { param: 'rules_version', label: 'Rules', options: [
          { value: 'legacy', label: 'Legacy', mono: true },
          { value: 'current', label: 'Current', mono: true },
        ] },
      ]}
    />
  )
}
