import { useState } from 'react'
import { scopeOptions, scopeOptionValue, validateScope } from '../scope.js'
import { isFunded, needsManualProfit, profitSourceLabel } from '../reviewModel.js'
import { Money } from './ScanFields.jsx'
import { smallBtn } from './buttonStyles.js'

// The payout-period switch (§3.2), built from the response's periods[]. It
// reports a scope object (scope.js) and shows the server's own label for what
// was actually applied — "current" can resolve to the full history.
//
// A custom range is entered in UTC: the API takes exact UTC instants, and
// converting from the MT5 server clock would need the GMT+2/+3 season rule on
// the client. The inputs say so.

const inputStyle = {
  font: 'inherit', fontSize: 12, color: 'var(--text)', background: 'var(--inset)', border: '1px solid var(--border)',
  borderRadius: 7, padding: '5px 9px', outline: 'none', fontFamily: "'Geist Mono',monospace",
}

// "2026-08-03T09:05:00.000Z" <-> the "2026-08-03T09:05" a datetime-local input holds.
const toInput = (iso) => (iso ? String(iso).slice(0, 16) : '')
const fromInput = (v) => (v ? `${v}:00.000Z` : '')

export default function ScopeSwitch({ scope, periods = [], applied, onChange, disabled }) {
  const options = scopeOptions(periods)
  const [customOpen, setCustomOpen] = useState(scope?.kind === 'custom')
  const [from, setFrom] = useState(toInput(scope?.kind === 'custom' ? scope.from : applied?.from))
  const [to, setTo] = useState(toInput(scope?.kind === 'custom' ? scope.to : applied?.to))
  const [error, setError] = useState(null)

  const pick = (value) => {
    setError(null)
    if (value === 'custom') { setCustomOpen(true); return }
    setCustomOpen(false)
    const opt = options.find((o) => o.value === value)
    if (opt?.scope) onChange(opt.scope)
  }

  const applyCustom = () => {
    const next = { kind: 'custom', from: fromInput(from), to: fromInput(to) }
    const msg = validateScope(next)
    setError(msg)
    if (!msg) onChange(next)
  }

  const value = customOpen ? 'custom' : scopeOptionValue(scope)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }} htmlFor="scope-switch">Scope</label>
        <select id="scope-switch" value={value} disabled={disabled} onChange={(e) => pick(e.target.value)} style={{ ...inputStyle, fontFamily: 'inherit', cursor: 'pointer' }}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {applied?.label && <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{applied.label}</span>}
      </div>

      {customOpen && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <input type="datetime-local" aria-label="Range start (UTC)" value={from} onChange={(e) => setFrom(e.target.value)} style={inputStyle} />
          <span style={{ color: 'var(--text-3)' }}>→</span>
          <input type="datetime-local" aria-label="Range end (UTC)" value={to} onChange={(e) => setTo(e.target.value)} style={inputStyle} />
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>UTC</span>
          <button onClick={applyCustom} disabled={disabled} className="ghost-btn" style={smallBtn}>Apply</button>
          <button onClick={() => { setCustomOpen(false); setError(null) }} className="ghost-btn" style={smallBtn}>Cancel</button>
        </div>
      )}
      {error && <div style={{ fontSize: 11.5, color: 'var(--crit)' }}>{error}</div>}
    </div>
  )
}

// period_profit (§3.2): the figure, where it came from, and — when it could not
// be measured on a funded account — the manual amount the Two Minute check
// needs as its reference.
export function PeriodProfit({ periodProfit, account, manualProfit, onManualProfit, disabled }) {
  const [draft, setDraft] = useState(manualProfit ? String(manualProfit) : '')
  const [error, setError] = useState(null)
  if (!periodProfit) return null

  const missing = needsManualProfit(periodProfit)
  const isManual = periodProfit.source === 'manual'
  const canEnter = isFunded(account) && (missing || isManual)

  const apply = () => {
    const n = Number(draft)
    if (!draft || !isFinite(n) || n <= 0) { setError('Enter a net profit above 0.'); return }
    setError(null)
    onManualProfit(n)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Period profit</span>
        {missing ? <span style={{ color: 'var(--text-3)' }}>—</span> : <Money value={periodProfit.profit} dp={2} />}
        {profitSourceLabel(periodProfit.source) && (
          <span style={{ fontSize: 10.5, color: 'var(--text-2)', background: 'var(--inset)', border: '1px solid var(--border)', borderRadius: 20, padding: '1px 8px' }}>
            {profitSourceLabel(periodProfit.source)}
          </span>
        )}
        {periodProfit.start_balance != null && (
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: "'Geist Mono',monospace" }}>
            balance {Number(periodProfit.start_balance).toLocaleString()} → {periodProfit.end_balance != null ? Number(periodProfit.end_balance).toLocaleString() : '—'}
          </span>
        )}
      </div>
      {periodProfit.note && <div style={{ fontSize: 11.5, color: 'var(--text-2)' }}>{periodProfit.note}</div>}

      {canEnter && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <label htmlFor="manual-profit" style={{ fontSize: 11.5, color: 'var(--text-2)' }}>
            {missing ? 'The Two Minute check needs a reference — enter the period net profit:' : 'Manual net profit:'}
          </label>
          <input id="manual-profit" inputMode="decimal" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') apply() }} placeholder="e.g. 1250.40" style={{ ...inputStyle, width: 120 }} />
          <button onClick={apply} disabled={disabled} className="ghost-btn" style={smallBtn}>Apply</button>
          {isManual && <button onClick={() => { setDraft(''); onManualProfit(null) }} disabled={disabled} className="ghost-btn" style={smallBtn}>Clear</button>}
          {error && <span style={{ fontSize: 11.5, color: 'var(--crit)' }}>{error}</span>}
        </div>
      )}
    </div>
  )
}
