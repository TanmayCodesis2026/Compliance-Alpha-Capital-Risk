import RuleFlags from './RuleFlags.jsx'
import { fetchOnePercent, fetchOnePercentDetail } from '../api.js'

export default function OnePercent(props) {
  return (
    <RuleFlags
      title="One Percent"
      subtitle="Single trades risking more than one percent of the account balance."
      kind="ONE PERCENT"
      flagSource="one_percent"
      fetcher={fetchOnePercent}
      detailFetcher={fetchOnePercentDetail}
      {...props}
    />
  )
}
