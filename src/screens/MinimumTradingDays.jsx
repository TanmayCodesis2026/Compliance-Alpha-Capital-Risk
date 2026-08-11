import RuleFlags from './RuleFlags.jsx'
import { fetchMinimumTradingDays, fetchMinimumTradingDaysDetail } from '../api.js'

export default function MinimumTradingDays(props) {
  return (
    <RuleFlags
      title="Minimum Trading Days"
      subtitle="Accounts that reached a payout without meeting the required number of trading days."
      kind="MIN TRADING DAYS"
      flagSource="minimum_trading_days"
      fetcher={fetchMinimumTradingDays}
      detailFetcher={fetchMinimumTradingDaysDetail}
      {...props}
    />
  )
}
