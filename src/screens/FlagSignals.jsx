import AutoFlags from './AutoFlags.jsx'
import { fetchFlagSignals } from '../api.js'

// The individual signals behind each flag (opening match, closing match, profit
// symmetry, and so on) — the evidence a severity was derived from, not the
// verdict itself.
export default function FlagSignals(props) {
  return (
    <AutoFlags
      title="Flag Signals"
      subtitle="The individual signals behind each flag — the evidence a severity was derived from, rather than the verdict."
      fetcher={fetchFlagSignals}
      searchPlaceholder="Search flag IDs…"
      filters={[
        { param: 'flag_id', label: 'Flag', type: 'text', placeholder: 'flag id…', width: 160 },
        { param: 'signal_code', label: 'Signal', type: 'text', placeholder: 'OM', upper: true, width: 90 },
      ]}
      {...props}
    />
  )
}
