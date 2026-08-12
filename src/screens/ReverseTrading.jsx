import AutoFlags from './AutoFlags.jsx'
import { fetchReverseTrading, fetchReverseTradingDetail } from '../api.js'
import { SEVERITY_FILTER } from '../components/severityFilter.js'

// RT — two accounts taking opposite sides of the same instrument, close enough
// in time and size that the pair nets out rather than taking real risk.
export default function ReverseTrading(props) {
  return (
    <AutoFlags
      title="Reverse Trading"
      subtitle="RT — paired accounts on opposite sides of the same instrument. Expand a row for the signals and participating accounts."
      kind="REVERSE TRADING"
      fetcher={fetchReverseTrading}
      detailFetcher={fetchReverseTradingDetail}
      searchPlaceholder="Search flag IDs…"
      filters={[
        SEVERITY_FILTER,
        { param: 'flag_type', label: 'Type', options: [
          { value: 'RT-1', label: 'RT-1', mono: true, color: 'var(--crit)', soft: 'var(--crit-soft)' },
          { value: 'RT-2', label: 'RT-2', mono: true, color: 'var(--high)', soft: 'var(--high-soft)' },
        ] },
        { param: 'login_id', label: 'Login', type: 'text', placeholder: 'login id…', width: 120 },
        { param: 'instrument', label: 'Instrument', type: 'text', placeholder: 'NQ', upper: true, width: 90 },
      ]}
      {...props}
    />
  )
}
