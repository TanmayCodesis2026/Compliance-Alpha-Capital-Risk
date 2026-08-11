import RuleFlags from './RuleFlags.jsx'
import { fetchTwoMinute, fetchTwoMinuteDetail } from '../api.js'

export default function TwoMinute(props) {
  return (
    <RuleFlags
      title="Two Minute"
      subtitle="Trades opened and closed inside the two-minute rule window."
      kind="TWO MINUTE"
      flagSource="two_minute"
      fetcher={fetchTwoMinute}
      detailFetcher={fetchTwoMinuteDetail}
      {...props}
    />
  )
}
