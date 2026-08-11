import { useState } from 'react'
import { fetchAdminCustomToken } from '../api.js'

// Renders an account name as a clickable link. When an `email` is available
// for the row, clicking mints an admin custom-login token for that user
// (POST /api/auth/admin/custom-token/) and redirects to the main trading
// app's admin-login route with the resulting tokens — this is a "log in as
// this user" action, not the internal dossier. Falls back to opening the
// dossier (the previous behavior) when no email is available for the row,
// since the custom-token endpoint has nothing to key off otherwise.
// Falls back to plain muted text when neither is available.
export default function AccountLink({ name, email, onAccountClick }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  if (!name) return <span style={{ color: 'var(--text-3)' }}>—</span>
  if (!email && !onAccountClick) return <span style={{ color: 'var(--text-2)' }}>{name}</span>

  const loginAsUser = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchAdminCustomToken(email)
      const { id_token, refresh_token } = res?.data || {}
      if (!id_token || !refresh_token) throw new Error('Admin login response was missing tokens.')
      window.open(`https://app.alpha-futures.com/admin-login/${id_token}/${refresh_token}`, '_blank', 'noopener,noreferrer')
    } catch (e) {
      setError(e.message || "Couldn't log in as this user.")
    } finally {
      setLoading(false)
    }
  }

  const handleClick = (e) => {
    e.stopPropagation()
    if (email) loginAsUser()
    else onAccountClick(name)
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      <button
        onClick={handleClick}
        disabled={loading}
        title={email ? `Log in as ${name} (${email})` : `Open ${name} dossier`}
        style={{ font: 'inherit', fontFamily: "'Geist Mono',monospace", color: 'var(--accent)', background: 'none', border: 'none', padding: 0, cursor: loading ? 'wait' : 'pointer', textAlign: 'left', textDecoration: 'underline', textDecorationColor: 'var(--border-strong)', textUnderlineOffset: 2, opacity: loading ? 0.6 : 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      >{name}</button>
      {error && <span title={error} style={{ fontSize: 10.5, color: 'var(--crit)' }}>⚠</span>}
    </span>
  )
}
