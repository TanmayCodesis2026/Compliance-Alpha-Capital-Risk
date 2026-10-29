import AutoFlags from './AutoFlags.jsx'
import { fetchOnePercent } from '../api.js'
import { breachedFilter, loginFilter, platformFilter, statusFilter } from './ruleFilters.js'

// GET /api/one-percent/ — one row per account over the full history
// (`1pct:<login>:full`) by default. scope=all also lists the per-period rows
// the account reviews stored. Columns are derived from the first row
// (AutoFlags); the rest shows on expand.
export default function OnePercent(props) {
  return (
    <AutoFlags
      title="One Percent"
      subtitle="Realized losses and cool-off breaches over one percent of the account balance, one row per account."
      fetcher={fetchOnePercent}
      searchPlaceholder="Search flag IDs…"
      emptyText="No accounts found."
      filters={[
        loginFilter,
        breachedFilter(),
        statusFilter,
        { param: 'scope', label: 'Rows', options: [{ value: 'all', label: 'Every stored scope' }] },
        platformFilter,
      ]}
      {...props}
    />
  )
}
