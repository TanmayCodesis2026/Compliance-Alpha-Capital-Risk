import AutoFlags from './AutoFlags.jsx'
import { fetchUserDurationProfile } from '../api.js'

// How long a user holds positions. Matching duration distributions across
// accounts is the other half of the behavioural fingerprint that supports an
// RT/GT match — listed, not flagged.
export default function UserDurationProfile(props) {
  return (
    <AutoFlags
      title="User Duration Profile"
      subtitle="How long each user holds positions. Matching distributions across accounts are the other half of the behavioural fingerprint."
      fetcher={fetchUserDurationProfile}
      searchPlaceholder="Search users…"
      filters={[
        { param: 'user_id', label: 'User', type: 'text', placeholder: 'user id…', width: 120 },
        { param: 'login_id', label: 'Login', type: 'text', placeholder: 'login id…', width: 120 },
      ]}
      {...props}
    />
  )
}
