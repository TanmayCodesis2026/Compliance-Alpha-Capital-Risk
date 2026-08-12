import AutoFlags from './AutoFlags.jsx'
import { fetchOnePercent } from '../api.js'

// Sibling of Two Minute, whose payload turned out to be a flat per-trade row
// rather than the scan envelope. This one's exact fields aren't confirmed yet,
// so AutoFlags derives the columns from the first row and shows the remainder
// on expand — no request beyond the list itself.
export default function OnePercent(props) {
  return (
    <AutoFlags
      title="One Percent"
      subtitle="Single trades risking more than one percent of the account balance."
      fetcher={fetchOnePercent}
      searchPlaceholder="Search flag IDs…"
      filters={[
        { param: 'login_id', label: 'Login', type: 'text', placeholder: 'login id…', width: 120 },
        { param: 'instrument', label: 'Instrument', type: 'text', placeholder: 'XAUUSD', upper: true, width: 110 },
        { param: 'trade_date', label: 'Trade date', type: 'text', placeholder: 'YYYY-MM-DD', width: 120 },
      ]}
      {...props}
    />
  )
}
