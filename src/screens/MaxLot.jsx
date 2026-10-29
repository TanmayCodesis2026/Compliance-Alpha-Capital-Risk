import AutoFlags from './AutoFlags.jsx'
import { fetchMaxLot } from '../api.js'
import { breachedFilter, legacyFilter, loginFilter, platformFilter, statusFilter } from './ruleFilters.js'

// GET /api/max-lot/ — one row per account (`mxl:<login>`), clean rows
// included; "Breached" narrows to accounts with a breach. Columns are derived
// from the first row (AutoFlags); the rest shows on expand.
export default function MaxLot(props) {
  return (
    <AutoFlags
      title="Max Lot"
      subtitle="Open lots above the plan's cap, one row per account."
      fetcher={fetchMaxLot}
      searchPlaceholder="Search flag IDs…"
      emptyText="No accounts found."
      filters={[
        loginFilter,
        breachedFilter(),
        statusFilter,
        { param: 'risk_category', label: 'Risk group', type: 'text', placeholder: '1% risk group', width: 120 },
        platformFilter,
        legacyFilter,
      ]}
      {...props}
    />
  )
}
