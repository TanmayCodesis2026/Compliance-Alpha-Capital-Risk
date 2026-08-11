import RuleFlags from './RuleFlags.jsx'
import { fetchMaxLot, fetchMaxLotDetail } from '../api.js'

export default function MaxLot(props) {
  return (
    <RuleFlags
      title="Max Lot"
      subtitle="Orders placed above the plan's maximum permitted lot size."
      kind="MAX LOT"
      flagSource="max_lot"
      fetcher={fetchMaxLot}
      detailFetcher={fetchMaxLotDetail}
      {...props}
    />
  )
}
