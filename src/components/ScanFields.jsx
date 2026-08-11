import { fmtMoney } from '../data.js'

// Shared building blocks for the scan-result detail panels (Order Book Spam,
// Gambling, News Trading). Those three endpoints return the same envelope —
// flag_id / login_id / scan_date plus an array of findings — so their panels
// share a label-over-value grid, mono values and pill badges rather than each
// re-declaring them and drifting apart.
//
// Components only; the value formatters live in scanFormat.js.

// One labelled cell in a detail grid.
export const Field = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 100, flex: '1 0 auto' }}>
    <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</div>
    <div style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>{children ?? '—'}</div>
  </div>
)

// Wraps a set of <Field>s in the responsive grid the panels use.
export const FieldGrid = ({ children, min = 130 }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, gap: 14 }}>{children}</div>
)

export const Mono = ({ children }) => (
  <span style={{ fontFamily: "'Geist Mono',monospace" }}>
    {children === null || children === undefined || children === '' ? '—' : children}
  </span>
)

// fmtMoney rounds to whole units, which is right for a P/L column but loses the
// cents that decide a gambling threshold — `dp` keeps them where they matter.
export const Money = ({ value, dp = 0 }) => {
  const n = Number(value)
  if (value === null || value === undefined || value === '' || isNaN(n)) return '—'
  if (!dp) {
    const m = fmtMoney(n)
    return <span style={{ fontFamily: "'Geist Mono',monospace", fontWeight: 600, color: m.color }}>{m.text}</span>
  }
  const abs = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })
  return (
    <span style={{ fontFamily: "'Geist Mono',monospace", fontWeight: 600, color: n < 0 ? 'var(--crit)' : n > 0 ? 'var(--ok)' : 'var(--text-2)' }}>
      {(n < 0 ? '−$' : '$') + abs}
    </span>
  )
}

// Small colour-coded pill. `tone` picks the palette; anything else is neutral.
const TONES = {
  crit: { color: 'var(--crit)', background: 'var(--crit-soft)' },
  high: { color: 'var(--high)', background: 'var(--high-soft)' },
  ok: { color: 'var(--ok)', background: 'var(--ok-soft)' },
  info: { color: 'var(--info)', background: 'var(--info-soft)' },
  neutral: { color: 'var(--text-2)', background: 'var(--inset)' },
}

export const Pill = ({ tone = 'neutral', mono, children }) => (
  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.03em', padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap', fontFamily: mono ? "'Geist Mono',monospace" : 'inherit', ...(TONES[tone] || TONES.neutral) }}>
    {children}
  </span>
)

export const DirectionPill = ({ direction }) => {
  const up = String(direction || '').toUpperCase()
  const tone = up === 'LONG' || up === 'BUY' ? 'ok' : up === 'SHORT' || up === 'SELL' ? 'crit' : 'neutral'
  return <Pill tone={tone}>{up || '—'}</Pill>
}

// The scan envelope's shared header: which login and plan produced this.
export const ScanHeader = ({ data, kind, tone = 'high' }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <Pill tone={tone} mono>{kind}</Pill>
      {data.plan && <span style={{ fontSize: 11.5, color: 'var(--text-2)' }}>{data.plan}</span>}
    </div>
    <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
      Login <span style={{ color: 'var(--text)', fontWeight: 600, fontFamily: "'Geist Mono',monospace" }}>{data.login_id || '—'}</span>
    </div>
  </div>
)

// A collapsible strip of ids — used for the MT5 position ids each finding
// carries. These are platform position ids, not ids /api/trades/ resolves.
export const IdList = ({ ids, open, onToggle, label = 'position ids' }) => {
  if (!ids || ids.length === 0) return null
  return (
    <div>
      <button
        onClick={onToggle}
        style={{ font: 'inherit', fontSize: 11.5, fontWeight: 600, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        {open ? 'Hide' : 'Show'} {label} ({ids.length})
      </button>
      {open && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {ids.map((id) => (
            <span key={id} style={{ fontFamily: "'Geist Mono',monospace", fontSize: 11, color: 'var(--text-2)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 7px' }}>{id}</span>
          ))}
        </div>
      )}
    </div>
  )
}

// Why the scanner kept this finding — quoted rather than restated.
export const ReasonNote = ({ children }) => (
  <div style={{ fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.45, borderLeft: '2px solid var(--border)', paddingLeft: 10 }}>
    {children}
  </div>
)
