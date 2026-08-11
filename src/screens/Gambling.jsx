import TradeFlags from './TradeFlags.jsx'
import { fetchGambling, fetchGamblingDetail } from '../api.js'
import { fmtDate, fmtDay } from '../data.js'
import { Money } from '../components/ScanFields.jsx'
import { pct, sumNumeric, uniq } from '../components/scanFormat.js'
import GamblingDetail from './GamblingDetail.jsx'

// A gambling row is a *scan result* for one login on one day: the account's
// starting balance and the profit threshold derived from it, plus a finding per
// trade group whose profit was a large share of that balance while a news event
// was live. Symbols and profit live per-finding, so the list rolls them up and
// the expanded panel (GamblingDetail) shows each finding in full.
const findingsOf = (r) => (Array.isArray(r.findings) ? r.findings : [])

const columns = [
  { key: 'flag_id', label: 'Flag ID', width: 180, mono: true, render: (r) => <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{r.flag_id}</span> },
  { key: 'login_id', label: 'Login', width: 100, mono: true },
  { key: 'plan', label: 'Plan', width: 150, muted: true },
  { key: 'scan_date', label: 'Scan date', width: 120, muted: true, render: (r) => fmtDay(r.scan_date) },
  { key: 'symbols', label: 'Symbols', width: 120, mono: true, render: (r) => {
      const s = uniq(findingsOf(r).flatMap((f) => f.symbols || []))
      return s.length ? s.join(', ') : '—'
    } },
  { key: 'finding_count', label: 'Findings', width: 85, align: 'right', mono: true, render: (r) => Number(r.finding_count ?? findingsOf(r).length).toLocaleString() },
  { key: 'profit', label: 'Profit', width: 110, align: 'right', render: (r) => <Money value={sumNumeric(findingsOf(r).map((f) => f.profit))} dp={2} /> },
  // the finding that came closest to (or furthest past) the threshold
  { key: 'profitShare', label: 'Peak share', width: 95, align: 'right', mono: true, render: (r) => {
      const shares = findingsOf(r).map((f) => Number(f.profitShare)).filter((n) => !isNaN(n))
      return shares.length ? pct(Math.max(...shares)) : '—'
    } },
  { key: 'profit_threshold', label: 'Threshold', width: 105, align: 'right', render: (r) => <Money value={r.profit_threshold} dp={2} /> },
  { key: 'created_at', label: 'Flagged at', width: 130, mono: true, muted: true, render: (r) => fmtDate(r.created_at) },
]

export default function Gambling({ onAccountClick, initialAccount }) {
  return (
    <TradeFlags
      title="Gambling"
      subtitle="Trade groups whose profit was an outsized share of the account's starting balance while a news event was live."
      fetcher={fetchGambling}
      flagSource="gambling"
      columns={columns}
      onAccountClick={onAccountClick}
      initialAccount={initialAccount}
      detailFetcher={fetchGamblingDetail}
      // no numeric pk on the row — flag_id ("gambling-09ba3e66b546") is the key
      detailIdOf={(r) => r.flag_id}
      renderDetail={(d) => <GamblingDetail data={d} />}
      searchPlaceholder="Search flag IDs…"
      filters={[
        { param: 'symbol', label: 'Symbol', type: 'text', placeholder: 'US30', upper: true, width: 100 },
        { param: 'login_id', label: 'Login', type: 'text', placeholder: 'login id…', width: 120 },
        { param: 'scan_date', label: 'Scan date', type: 'text', placeholder: 'YYYY-MM-DD', width: 120 },
      ]}
    />
  )
}
