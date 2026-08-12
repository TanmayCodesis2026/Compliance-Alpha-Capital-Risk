import AutoFlags from './AutoFlags.jsx'
import { fetchMinimumTradingDays } from '../api.js'

// Sibling of Two Minute, whose payload turned out to be a flat per-trade row
// rather than the scan envelope. This one's exact fields aren't confirmed yet,
// so AutoFlags derives the columns from the first row and shows the remainder
// on expand — no request beyond the list itself.
export default function MinimumTradingDays(props) {
  return (
    <AutoFlags
      title="Minimum Trading Days"
      subtitle="Accounts that reached a payout without meeting the required number of trading days."
      fetcher={fetchMinimumTradingDays}
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
