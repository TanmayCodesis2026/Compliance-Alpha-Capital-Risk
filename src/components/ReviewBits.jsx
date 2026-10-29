import { useEffect, useState } from 'react'
import { Money, Pill } from './ScanFields.jsx'
import { stateMeta } from '../reviewModel.js'
import { smallBtn } from './buttonStyles.js'

// Small building blocks shared by the account page, the rule drill-downs and
// the speech form. Components only (helpers live in reviewModel.js) so Fast
// Refresh keeps working.

const NOTICE_TONES = {
  crit: { bg: 'var(--crit-soft)', border: 'var(--crit)' },
  high: { bg: 'var(--high-soft)', border: 'var(--high)' },
  ok: { bg: 'var(--ok-soft)', border: 'var(--ok)' },
  info: { bg: 'var(--info-soft)', border: 'var(--info)' },
  neutral: { bg: 'var(--inset)', border: 'var(--border-strong)' },
}

// The banner every screen already draws inline: tinted box, bold lead, muted body.
export const Notice = ({ tone = 'high', title, children, onClose, style }) => {
  const t = NOTICE_TONES[tone] || NOTICE_TONES.neutral
  return (
    <div role={tone === 'crit' ? 'alert' : undefined} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 13px', background: t.bg, border: `1px solid color-mix(in srgb,${t.border} 25%,transparent)`, borderRadius: 9, fontSize: 12.5, color: 'var(--text)', ...style }}>
      <div style={{ flex: 1, minWidth: 0, lineHeight: 1.45 }}>
        {title && <b>{title}</b>}{title && children ? ' ' : null}
        {children && <span style={{ color: 'var(--text-2)' }}>{children}</span>}
      </div>
      {onClose && (
        <button onClick={onClose} aria-label="Dismiss" style={{ flex: 'none', font: 'inherit', fontSize: 14, lineHeight: 1, background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 0 }}>×</button>
      )}
    </div>
  )
}

// Bottom-right message for something that happened off to the side (a
// re-check that failed). Dismisses itself.
export const Toast = ({ message, tone = 'crit', onClose, ms = 8000 }) => {
  useEffect(() => {
    if (!message) return undefined
    const t = setTimeout(() => onClose && onClose(), ms)
    return () => clearTimeout(t)
  }, [message, ms, onClose])
  if (!message) return null
  return (
    <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 60, maxWidth: 'min(420px, calc(100vw - 40px))', boxShadow: 'var(--shadow-lg, var(--shadow))', borderRadius: 9, background: 'var(--surface)' }}>
      <Notice tone={tone} onClose={onClose}>{message}</Notice>
    </div>
  )
}

// Copies the client-facing text (copyText, summary_line). Clipboard access can
// be refused (insecure origin, permissions), so failure is said, not swallowed.
export const CopyButton = ({ text, label = 'Copy' }) => {
  const [state, setState] = useState('idle')
  if (!text) return null
  const copy = (e) => {
    e.stopPropagation()
    Promise.resolve(navigator.clipboard?.writeText(text))
      .then(() => setState(navigator.clipboard ? 'done' : 'failed'))
      .catch(() => setState('failed'))
      .finally(() => setTimeout(() => setState('idle'), 1600))
  }
  return (
    <button onClick={copy} className="ghost-btn" style={smallBtn}>
      {state === 'done' ? 'Copied' : state === 'failed' ? 'Copy failed' : label}
    </button>
  )
}

// A result state as a pill (breached / to_review / not_met / cannot_run /
// clean / not_applicable / flagged / no_row).
export const StateBadge = ({ state, children }) => {
  const m = stateMeta(state)
  return <span style={{ opacity: m.muted ? 0.75 : 1 }}><Pill tone={m.tone}>{(children || m.label).toUpperCase()}</Pill></span>
}

// "Refreshing" while a re-check is in flight.
export const RefreshingBadge = () => (
  <span role="status" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.03em', color: 'var(--info)', background: 'var(--info-soft)', padding: '2px 8px', borderRadius: 6 }}>
    <span className="spinner" aria-hidden="true" style={{ display: 'inline-block', width: 9, height: 9, borderWidth: 1.5, borderColor: 'var(--border)', borderTopColor: 'var(--info)' }} />
    REFRESHING
  </span>
)

// One labelled figure in a metric strip.
export const Metric = ({ label, children, hint }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
    <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</div>
    <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "'Geist Mono',monospace", overflowWrap: 'anywhere' }}>{children ?? '—'}</div>
    {hint && <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{hint}</div>}
  </div>
)

export const MetricGrid = ({ children, min = 130 }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, gap: 14 }}>{children}</div>
)

export const SectionLabel = ({ children }) => (
  <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)', marginBottom: 7 }}>{children}</div>
)

// Renders one table cell value by kind. Server-time strings ("2026/05/20
// 17:29:05 GMT+3") are already in MT5 time and are printed as given.
export function CellValue({ value, kind }) {
  if (value === null || value === undefined || value === '') return <span style={{ color: 'var(--text-3)' }}>—</span>
  if (kind === 'money') return <Money value={value} dp={2} />
  if (kind === 'pct') return `${(Number(value) * 100).toFixed(2)}%`
  if (kind === 'bool') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.map((v) => (Array.isArray(v) ? v.join(' ') : typeof v === 'object' ? JSON.stringify(v) : v)).join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const LIST_CAP = 100

// Compact table for a rule's items. Long lists (24 short trades, hundreds of
// news flags) show the first LIST_CAP until asked.
export function MiniTable({ rows = [], cols, rowKey }) {
  const [all, setAll] = useState(false)
  if (!rows.length) return null
  const shown = all ? rows : rows.slice(0, LIST_CAP)
  const minWidth = cols.reduce((a, c) => a + (c.width || 120), 0)
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 9, overflow: 'hidden', background: 'var(--surface)' }}>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth, fontSize: 12 }}>
          <div style={{ display: 'flex', background: 'var(--surface-2)', color: 'var(--text-3)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            {cols.map((c) => <div key={c.label} style={{ flex: `0 0 ${c.width || 120}px`, padding: '8px 10px', textAlign: c.kind === 'money' ? 'right' : 'left' }}>{c.label}</div>)}
          </div>
          {shown.map((r, i) => (
            <div key={rowKey ? rowKey(r, i) : i} style={{ display: 'flex', borderTop: '1px solid var(--hair)' }}>
              {cols.map((c) => {
                const v = c.get ? c.get(r) : r[c.key]
                return (
                  <div key={c.label} title={typeof v === 'string' ? v : undefined} style={{ flex: `0 0 ${c.width || 120}px`, padding: '8px 10px', textAlign: c.kind === 'money' ? 'right' : 'left', fontFamily: c.mono ? "'Geist Mono',monospace" : 'inherit', whiteSpace: c.wrap ? 'normal' : 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: c.muted ? 'var(--text-2)' : 'var(--text)' }}>
                    <CellValue value={v} kind={c.kind} />
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      {rows.length > LIST_CAP && (
        <div style={{ padding: '8px 10px', borderTop: '1px solid var(--hair)', background: 'var(--surface-2)' }}>
          <button onClick={() => setAll((a) => !a)} style={{ ...smallBtn, border: 'none', background: 'none', color: 'var(--accent)', padding: 0 }}>
            {all ? `Show the first ${LIST_CAP}` : `Show all ${rows.length}`}
          </button>
        </div>
      )}
    </div>
  )
}

// Centred overlay for a form or history. Escape and the backdrop close it.
export function Modal({ title, onClose, children, width = 640 }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }} style={{ position: 'fixed', inset: 0, zIndex: 55, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '6vh 16px', overflowY: 'auto' }}>
      <div role="dialog" aria-modal="true" aria-label={title} style={{ width: '100%', maxWidth: width, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-lg, var(--shadow))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--hair)' }}>
          <div style={{ fontWeight: 650, fontSize: 14, flex: 1, minWidth: 0 }}>{title}</div>
          <button onClick={onClose} aria-label="Close" style={{ font: 'inherit', fontSize: 18, lineHeight: 1, background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: 18 }}>{children}</div>
      </div>
    </div>
  )
}
