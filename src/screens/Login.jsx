import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { useTheme } from '../useTheme.js'

const inputStyle = {
  font: 'inherit',
  fontSize: 13,
  color: 'var(--text)',
  background: 'var(--inset)',
  border: '1px solid var(--border)',
  borderRadius: 9,
  padding: '10px 12px',
  outline: 'none',
  width: '100%',
}

export default function Login() {
  const { login } = useAuth()
  const [theme, toggleTheme] = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const themeLabel = theme === 'light' ? 'Dark' : 'Light'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const submit = (e) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError(null)
    login(email.trim(), password)
      .then(() => {
        const dest = location.state?.from?.pathname || '/overview'
        navigate(dest, { replace: true })
      })
      .catch((e) => setError(e.message || 'Could not sign in.'))
      .finally(() => setSubmitting(false))
  }

  return (
    <div data-theme={theme} style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Geist',system-ui,-apple-system,sans-serif", fontSize: 13, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 18 }}>
        <button className="theme-btn" onClick={toggleTheme} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 6, cursor: 'pointer', font: 'inherit', fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>
          <span style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid currentColor', background: 'linear-gradient(90deg, currentColor 50%, transparent 50%)', display: 'inline-block' }} />{themeLabel}
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px 60px' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, justifyContent: 'center', marginBottom: 26 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              <div style={{ width: 14, height: 14, border: '2.5px solid var(--accent-fg)', borderRadius: '50%', borderRightColor: 'transparent', transform: 'rotate(-45deg)' }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em', lineHeight: 1.1 }}>Risk tool</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)', fontFamily: "'Geist Mono',monospace" }}>Alpha</div>
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow)', padding: 26 }}>
            <h1 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>Sign in</h1>
            <div style={{ color: 'var(--text-2)', fontSize: 12.5, marginBottom: 20 }}>Detection Console access is staff-only.</div>

            {error && (
              <div style={{ marginBottom: 16, padding: '11px 13px', background: 'var(--crit-soft)', border: '1px solid color-mix(in srgb,var(--crit) 25%,transparent)', borderRadius: 9, fontSize: 12.5, color: 'var(--text)' }}>
                {error}
              </div>
            )}

            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Email</div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Password</div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  style={inputStyle}
                />
              </div>
              <button
                type="submit"
                className="accent-btn"
                disabled={submitting}
                style={{ font: 'inherit', fontWeight: 600, fontSize: 12.5, color: 'var(--accent-fg)', background: 'var(--accent)', border: 'none', borderRadius: 9, padding: '11px 18px', cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.7 : 1, marginTop: 4 }}
              >
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
