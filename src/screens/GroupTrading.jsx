import AutoFlags from './AutoFlags.jsx'
import { fetchGroupTrading, fetchGroupTradingDetail } from '../api.js'

// GT — several accounts entering the same instrument together, either on the
// same side (coordinated) or deliberately opposed.
export default function GroupTrading(props) {
  return (
    <AutoFlags
      title="Group Trading"
      subtitle="GT — multiple accounts entering the same instrument inside a short window. Expand a row for the signals and participating accounts."
      kind="GROUP TRADING"
      fetcher={fetchGroupTrading}
      detailFetcher={fetchGroupTradingDetail}
      searchPlaceholder="Search flag IDs…"
      filters={[
        { param: 'flag_type', label: 'Type', options: [
          { value: 'GT-1', label: 'GT-1', mono: true, color: 'var(--crit)', soft: 'var(--crit-soft)' },
          { value: 'GT-2', label: 'GT-2', mono: true, color: 'var(--high)', soft: 'var(--high-soft)' },
        ] },
        { param: 'login_id', label: 'Login', type: 'text', placeholder: 'login id…', width: 120 },
        { param: 'instrument', label: 'Instrument', type: 'text', placeholder: 'NQ', upper: true, width: 90 },
      ]}
      {...props}
    />
  )
}
