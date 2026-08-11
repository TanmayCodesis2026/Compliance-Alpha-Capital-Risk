import AutoFlags from './AutoFlags.jsx'
import { fetchUserTodProfile } from '../api.js'

// When in the session a user trades. Two accounts sharing an unusual
// time-of-day fingerprint corroborates a cross-account match; on its own it is
// not a violation, which is why this screen lists rather than flags.
export default function UserTodProfile(props) {
  return (
    <AutoFlags
      title="User Time of Day Profile"
      subtitle="When in the session each user trades. A shared fingerprint corroborates a cross-account match rather than flagging on its own."
      fetcher={fetchUserTodProfile}
      searchPlaceholder="Search users…"
      filters={[
        { param: 'user_id', label: 'User', type: 'text', placeholder: 'user id…', width: 120 },
        { param: 'login_id', label: 'Login', type: 'text', placeholder: 'login id…', width: 120 },
      ]}
      {...props}
    />
  )
}
