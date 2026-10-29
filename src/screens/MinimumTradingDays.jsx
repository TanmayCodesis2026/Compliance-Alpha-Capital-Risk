import AutoFlags from './AutoFlags.jsx'
import { fetchMinimumTradingDays } from '../api.js'
import { breachedFilter, legacyFilter, loginFilter, platformFilter, statusFilter } from './ruleFilters.js'

// GET /api/minimum-trading-days/ — one row per account (`mtd:<login>`), clean
// rows included. The API's `breached=true` means the days are NOT MET: a
// payout note, never a rule breach, so it is worded that way here.
export default function MinimumTradingDays(props) {
  return (
    <AutoFlags
      title="Minimum Trading Days"
      subtitle="Accounts that have not met the required trading days — a payout note, not a rule breach. One row per account."
      fetcher={fetchMinimumTradingDays}
      searchPlaceholder="Search flag IDs…"
      emptyText="No accounts found."
      filters={[
        loginFilter,
        breachedFilter({ yes: 'Not met', no: 'Met' }),
        statusFilter,
        { param: 'payout_type', label: 'Payout', type: 'text', placeholder: 'Biweekly', width: 100 },
        platformFilter,
        legacyFilter,
      ]}
      {...props}
    />
  )
}
