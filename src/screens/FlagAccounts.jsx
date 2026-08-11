import AutoFlags from './AutoFlags.jsx'
import { fetchFlagAccounts } from '../api.js'

// The join between a cross-account flag and the logins it implicates. One flag
// spans several accounts, so this is the table that answers "who was in it".
export default function FlagAccounts(props) {
  return (
    <AutoFlags
      title="Flag Accounts"
      subtitle="Which accounts participate in which flag — the join between a cross-account flag and the logins it implicates."
      fetcher={fetchFlagAccounts}
      searchPlaceholder="Search flag IDs…"
      filters={[
        { param: 'flag_id', label: 'Flag', type: 'text', placeholder: 'flag id…', width: 160 },
        { param: 'login_id', label: 'Login', type: 'text', placeholder: 'login id…', width: 120 },
      ]}
      {...props}
    />
  )
}
