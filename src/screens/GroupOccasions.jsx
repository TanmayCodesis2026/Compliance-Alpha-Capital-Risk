import AutoFlags from './AutoFlags.jsx'
import { fetchGroupOccasions } from '../api.js'

// One row per recurrence of a group-trading flag. Recurrence is what separates
// a coincidence from a pattern, so this table is read alongside Group Trading
// rather than on its own.
export default function GroupOccasions(props) {
  return (
    <AutoFlags
      title="Group Occasions"
      subtitle="Each recorded occasion of a group-trading flag — the recurrence history behind a single GT verdict."
      fetcher={fetchGroupOccasions}
      searchPlaceholder="Search flag IDs…"
      filters={[
        { param: 'flag_id', label: 'Flag', type: 'text', placeholder: 'flag id…', width: 160 },
        { param: 'login_id', label: 'Login', type: 'text', placeholder: 'login id…', width: 120 },
      ]}
      {...props}
    />
  )
}
