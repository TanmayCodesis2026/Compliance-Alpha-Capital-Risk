import { useState } from 'react'
import { fmtDate, fmtDay } from '../data.js'
import {
  DirectionPill, Field, FieldGrid, IdList, Money, Mono, ReasonNote, ScanHeader,
} from '../components/ScanFields.jsx'
import { findingsOf, stripPositionId } from '../components/scanFormat.js'
import AutoValue from '../components/AutoValue.jsx'
import { fieldLabel, isIdArrayKey, isReasonKey } from '../components/fieldLabel.js'

// Detail panel for the rule-check models (two-minute, weekend-holding,
// one-percent, max-lot, minimum-trading-days).
//
// Those five share the scan envelope the confirmed models use —
//   { flag_id, login_id, plan, scan_date, <n>_count, <findings>[], created_at }
// — but their per-finding fields aren't pinned down yet, so this renders the
// envelope precisely and each finding by shape rather than by a fixed field
// list: recognised keys get the right formatter, anything else falls through as
// a labelled value. A field the API adds later shows up without a code change,
// and one that's renamed degrades to raw text instead of silently vanishing.

// Envelope keys are rendered by the header/summary, not repeated per finding.
const ENVELOPE = new Set([
  'flag_id', 'login_id', 'plan', 'scan_date', 'created_at', 'updated_at',
  'status', 'user_id', 'trading_platform', 'phase',
])

function Finding({ row, index }) {
  const [showIds, setShowIds] = useState(false)

  const entries = Object.entries(row).filter(([, v]) => v !== null && v !== undefined && v !== '')
  const idEntries = entries.filter(([k, v]) => isIdArrayKey(k) && Array.isArray(v))
  const reasons = entries.filter(([k, v]) => isReasonKey(k) && typeof v === 'string')
  const nested = entries.filter(([, v]) => Array.isArray(v) && v.length && typeof v[0] === 'object')
  const skip = new Set([...idEntries, ...reasons, ...nested].map(([k]) => k).concat(['id']))
  const fields = entries.filter(([k]) => !skip.has(k))

  // prefer plain position ids over the "position:"-prefixed group ids
  const ids = (idEntries.find(([k]) => /position/i.test(k)) || idEntries[0] || [])[1]

  // headline: whatever identifies this finding at a glance
  const symbol = row.symbol || (Array.isArray(row.symbols) ? row.symbols.join(', ') : null)

  return (
    <div style={{ background: 'var(--inset)', border: '1px solid var(--border)', borderRadius: 9, padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--text-3)', fontFamily: "'Geist Mono',monospace" }}>#{index + 1}</span>
        {symbol && <span style={{ fontFamily: "'Geist Mono',monospace", fontWeight: 600, fontSize: 12.5 }}>{symbol}</span>}
        {row.direction && <DirectionPill direction={row.direction} />}
        {row.profit != null && <span style={{ marginLeft: 'auto', fontSize: 11.5 }}><Money value={row.profit} dp={2} /></span>}
      </div>

      <FieldGrid>
        {fields.map(([k, v]) => <Field key={k} label={fieldLabel(k)}><AutoValue k={k} v={v} /></Field>)}
      </FieldGrid>

      {nested.map(([k, rows]) => (
        <div key={k}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)', marginBottom: 6 }}>
            {fieldLabel(k)} · {rows.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {rows.map((r, i) => (
              <div key={r.id || i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
                <FieldGrid min={110}>
                  {Object.entries(r).filter(([rk, rv]) => rk !== 'id' && rv !== null && rv !== '').map(([rk, rv]) => (
                    <Field key={rk} label={fieldLabel(rk)}><AutoValue k={rk} v={rv} /></Field>
                  ))}
                </FieldGrid>
              </div>
            ))}
          </div>
        </div>
      ))}

      {reasons.map(([k, v]) => <ReasonNote key={k}>{v}</ReasonNote>)}

      <IdList ids={(ids || []).map(stripPositionId)} open={showIds} onToggle={() => setShowIds((s) => !s)} />
    </div>
  )
}

export default function ScanDetail({ data, kind }) {
  if (!data) return null
  const { key: findingKey, rows } = findingsOf(data)
  // the model's own count field, e.g. finding_count / breach_count
  const countEntry = Object.entries(data).find(([k, v]) => /_count$/.test(k) && typeof v === 'number')

  // envelope scalars the header doesn't already show (buffer_minutes,
  // rules_version, initial_balance, …) — these differ per model
  const extras = Object.entries(data).filter(([k, v]) =>
    !ENVELOPE.has(k) && k !== findingKey && v !== null && v !== '' &&
    (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <ScanHeader data={data} kind={kind} />

      <FieldGrid>
        <Field label="Flag ID"><Mono>{data.flag_id}</Mono></Field>
        <Field label="Scan date"><Mono>{fmtDay(data.scan_date)}</Mono></Field>
        {countEntry && <Field label={fieldLabel(countEntry[0])}><Mono>{countEntry[1]}</Mono></Field>}
        {extras.filter(([k]) => k !== countEntry?.[0]).map(([k, v]) => (
          <Field key={k} label={fieldLabel(k)}><AutoValue k={k} v={v} /></Field>
        ))}
        <Field label="Flagged at"><Mono>{fmtDate(data.created_at)}</Mono></Field>
      </FieldGrid>

      <div>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)', marginBottom: 9 }}>
          {findingKey ? fieldLabel(findingKey) : 'Findings'} · {rows.length}
        </div>
        {rows.length === 0 ? (
          <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Nothing recorded on this scan.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {rows.map((r, i) => <Finding key={r.id || r.tradeGroupId || r.positionId || i} row={r} index={i} />)}
          </div>
        )}
      </div>
    </div>
  )
}
