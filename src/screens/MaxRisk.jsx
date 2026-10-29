import AutoFlags from './AutoFlags.jsx'
import { fetchMaxRisk, fetchMaxRiskDetail } from '../api.js'
import { Notice } from '../components/ReviewBits.jsx'
import { breachedFilter, loginFilter, platformFilter, statusFilter } from './ruleFilters.js'

// GET /api/max-risk/ — one row per Alpha Direct account (`mxr:<login>`). The
// rule is under review with the client, so the screen says so rather than
// presenting the rows as enforced breaches. The detail route takes the flag id
// or the bare login.
export default function MaxRisk(props) {
  return (
    <AutoFlags
      title="Max Risk"
      subtitle="Net loss per asset above 1% of the starting balance, Alpha Direct accounts only."
      kind="MAX RISK"
      fetcher={fetchMaxRisk}
      detailFetcher={fetchMaxRiskDetail}
      searchPlaceholder="Search flag IDs…"
      emptyText="No accounts found."
      banner={<Notice tone="info" title="Under review with the client.">These results are shown for information and are not enforced yet.</Notice>}
      filters={[
        loginFilter,
        breachedFilter(),
        { param: 'tier', label: 'Tier', options: [{ value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }] },
        statusFilter,
        platformFilter,
      ]}
      {...props}
    />
  )
}
