import AutoFlags from './AutoFlags.jsx'
import { fetchMatchOccurrences } from '../api.js'

// Prior occurrences of the same account pairing. A pair that keeps reappearing
// across instruments and dates is the strongest cross-account signal there is,
// which is why recurrence gates the RT/GT severities.
export default function MatchOccurrences(props) {
  return (
    <AutoFlags
      title="Match Occurrences"
      subtitle="Prior occurrences of the same account pairing — the recurrence history that gates RT and GT severity."
      fetcher={fetchMatchOccurrences}
      searchPlaceholder="Search flag IDs…"
      filters={[
        { param: 'login_id', label: 'Login', type: 'text', placeholder: 'login id…', width: 120 },
        { param: 'instrument', label: 'Instrument', type: 'text', placeholder: 'NQ', upper: true, width: 90 },
      ]}
      {...props}
    />
  )
}
