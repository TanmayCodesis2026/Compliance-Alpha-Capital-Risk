import TradeFlags from './TradeFlags.jsx'
import { fetchTwoMinute } from '../api.js'
import { fmtDate, fmtDay, fmtDuration, fmtTime } from '../data.js'
import { Field, FieldGrid, Money, Mono, Pill } from '../components/ScanFields.jsx'

// GET /api/two-minute/ — one row per trade closed inside the two-minute window.
//
// Unlike the news/gambling/OBS scans, this is a flat per-trade record with no
// findings array: the trade *is* the finding.
//   { id, flag_id, flag_type, login_id, trading_platform, trade_id, instrument,
//     open_time, close_time, duration_min, duration_sec, record_type, pnl,
//     trade_date, created_at, updated_at }
//
// This is the trade list behind the per-period verdict; the verdict itself
// (breached or not, against the period profit) is on the account page.

// "1m 30s" from duration_sec; older rows only carry duration_min.
const fromSeconds = (s) => {
  const n = Math.round(Number(s))
  return n < 60 ? `${n}s` : `${Math.floor(n / 60)}m ${n % 60}s`
}
const secondsOf = (r) => (r.duration_sec != null ? Number(r.duration_sec) : Number(r.duration_min) * 60)

// A trade that opens and closes on the same second is the extreme case the
// rule exists to catch, so zero reads as "instant" rather than a bare 0s.
const duration = (r) => {
  if (r.duration_sec != null) return Number(r.duration_sec) === 0 ? 'instant' : fromSeconds(r.duration_sec)
  const n = Number(r.duration_min)
  if (isNaN(n)) return '—'
  return n === 0 ? 'instant' : fmtDuration(n)
}

const columns = [
  { key: 'flag_id', label: 'Flag ID', width: 170, mono: true, render: (r) => (
      <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{r.flag_id}</span>
    ) },
  { key: 'login_id', label: 'Login', width: 100, mono: true },
  { key: 'trade_id', label: 'Trade ID', width: 120, mono: true, muted: true },
  { key: 'instrument', label: 'Instrument', width: 100, mono: true },
  { key: 'open_time', label: 'Open', width: 95, mono: true, muted: true, render: (r) => fmtTime(r.open_time) },
  { key: 'close_time', label: 'Close', width: 95, mono: true, muted: true, render: (r) => fmtTime(r.close_time) },
  { key: 'duration_sec', label: 'Duration', width: 95, mono: true, render: (r) => (
      <span style={{ color: secondsOf(r) === 0 ? 'var(--crit)' : 'var(--text)' }}>{duration(r)}</span>
    ) },
  { key: 'record_type', label: 'Record', width: 125, muted: true, render: (r) => r.record_type || '—' },
  { key: 'pnl', label: 'P/L', width: 105, align: 'right', render: (r) => <Money value={r.pnl} dp={2} /> },
  { key: 'trade_date', label: 'Trade date', width: 120, muted: true, render: (r) => fmtDay(r.trade_date) },
  { key: 'trading_platform', label: 'Platform', width: 90, mono: true, muted: true, render: (r) => (r.trading_platform || '—').toUpperCase() },
  { key: 'created_at', label: 'Flagged at', width: 130, mono: true, muted: true, render: (r) => fmtDate(r.created_at) },
]

// The row already carries every field, so expanding renders from it rather than
// issuing a second request for the same 14 values.
const inlineDetail = (r) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
      <Pill tone="high" mono>{(r.flag_type || '2MIN').toUpperCase()}</Pill>
      <span style={{ fontFamily: "'Geist Mono',monospace", fontWeight: 600, fontSize: 12.5 }}>{r.instrument}</span>
      {secondsOf(r) === 0 && <Pill tone="crit">OPENED AND CLOSED IN THE SAME SECOND</Pill>}
      {r.record_type && <Pill>{r.record_type.toUpperCase()}</Pill>}
      <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--text-3)' }}>
        Login <span style={{ color: 'var(--text)', fontWeight: 600, fontFamily: "'Geist Mono',monospace" }}>{r.login_id}</span>
      </span>
    </div>

    <FieldGrid>
      <Field label="Flag ID"><Mono>{r.flag_id}</Mono></Field>
      <Field label="Record ID"><Mono>{r.id}</Mono></Field>
      <Field label="Trade ID"><Mono>{r.trade_id}</Mono></Field>
      <Field label="Platform"><Mono>{(r.trading_platform || '').toUpperCase()}</Mono></Field>
      <Field label="Open"><Mono>{fmtDate(r.open_time)}</Mono></Field>
      <Field label="Close"><Mono>{fmtDate(r.close_time)}</Mono></Field>
      <Field label="Duration"><Mono>{duration(r)}</Mono></Field>
      <Field label="Record type">{r.record_type || '—'}</Field>
      <Field label="P/L"><Money value={r.pnl} dp={2} /></Field>
      <Field label="Trade date"><Mono>{fmtDay(r.trade_date)}</Mono></Field>
      <Field label="Flagged at"><Mono>{fmtDate(r.created_at)}</Mono></Field>
      <Field label="Updated"><Mono>{fmtDate(r.updated_at)}</Mono></Field>
    </FieldGrid>
  </div>
)

export default function TwoMinute({ onAccountClick, initialAccount }) {
  return (
    <TradeFlags
      title="Two Minute"
      subtitle="Trades opened and closed inside the two-minute window. One row per trade — the trade is the finding."
      searchPlaceholder="Search flag IDs…"
      fetcher={fetchTwoMinute}
      columns={columns}
      inlineDetail={inlineDetail}
      onAccountClick={onAccountClick}
      initialAccount={initialAccount}
      filters={[
        { param: 'login_id', label: 'Login', type: 'text', placeholder: 'login id…', width: 120 },
        { param: 'instrument', label: 'Instrument', type: 'text', placeholder: 'XAUUSD', upper: true, width: 110 },
        { param: 'trade_date', label: 'Trade date', type: 'text', placeholder: 'YYYY-MM-DD', width: 120 },
        { param: 'record_type', label: 'Record', options: [
          { value: 'Closed position', label: 'Closed' },
          { value: 'Partial close', label: 'Partial' },
        ] },
      ]}
    />
  )
}
