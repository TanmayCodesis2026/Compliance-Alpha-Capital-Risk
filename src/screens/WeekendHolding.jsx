import RuleFlags from './RuleFlags.jsx'
import { fetchWeekendHolding, fetchWeekendHoldingDetail } from '../api.js'

export default function WeekendHolding(props) {
  return (
    <RuleFlags
      title="Weekend Holding"
      subtitle="Positions carried through the weekend close instead of being flattened."
      kind="WEEKEND HOLDING"
      flagSource="weekend_holding"
      fetcher={fetchWeekendHolding}
      detailFetcher={fetchWeekendHoldingDetail}
      {...props}
    />
  )
}
