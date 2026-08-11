import { useState } from 'react'
import { fmtDate, fmtDay, fmtMt5 } from '../data.js'
import {
  Field, FieldGrid, IdList, Money, Mono, Pill, ReasonNote, ScanHeader,
} from '../components/ScanFields.jsx'
import { pct, stripPositionId, sumNumeric } from '../components/scanFormat.js'

// Rendered inside TradeFlags' expanded row panel via:
//   detailFetcher={fetchGamblingDetail}
//   renderDetail={d => <GamblingDetail data={d} />}
//
// `data` is the gambling scan result — the same shape the list returns:
//   { flag_id, login_id, plan, scan_date, initial_balance, profit_threshold,
//     finding_count,
//     findings: [{ id, profit, profitShare, symbols[], openTime, closeTime,
//                  durationMs, tradeDuration, positionIds[], tradeGroupId,
//                  events: [{ id, name, date, time, type, currency, gmtOffset }] }],
//     created_at, updated_at }
//
// Everything is embedded, so there's no second-level trade fetch: positionIds
// are MT5 position ids, which /api/trades/ does not resolve.

// The news releases the trade group was open across.
function EventRow({ e }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', fontSize: 11.5, padding: '6px 0' }}>
      <Pill tone="info">{e.currency || '—'}</Pill>
      <span style={{ fontWeight: 600 }}>{e.name || 'Unnamed event'}</span>
      <span style={{ color: 'var(--text-3)', fontFamily: "'Geist Mono',monospace" }}>
        {fmtDay(e.date)} · {e.time || '—'}{e.gmtOffset ? ` ${e.gmtOffset}` : ''}
      </span>
      {e.type && <span style={{ color: 'var(--text-3)', textTransform: 'capitalize' }}>{e.type}</span>}
    </div>
  )
}

function Finding({ f, index, threshold }) {
  const [showIds, setShowIds] = useState(false)
  const ids = (f.positionIds || []).map(stripPositionId)
  const events = Array.isArray(f.events) ? f.events : []
  const symbols = (f.symbols || []).join(', ')
  // the threshold is what makes the profit a finding — show the relationship
  const overThreshold = Number(f.profit) >= Number(threshold)

  return (
    <div style={{ background: 'var(--inset)', border: '1px solid var(--border)', borderRadius: 9, padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--text-3)', fontFamily: "'Geist Mono',monospace" }}>#{index + 1}</span>
        <span style={{ fontFamily: "'Geist Mono',monospace", fontWeight: 600, fontSize: 12.5 }}>{symbols || '—'}</span>
        {overThreshold && <Pill tone="high">OVER THRESHOLD</Pill>}
        <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--text-2)' }}>
          <Money value={f.profit} dp={2} /> <span style={{ color: 'var(--text-3)' }}>· {pct(f.profitShare)} of balance</span>
        </span>
      </div>

      <FieldGrid>
        <Field label="Open"><Mono>{fmtMt5(f.openTime, { withDate: true })}</Mono></Field>
        <Field label="Close"><Mono>{fmtMt5(f.closeTime, { withDate: true })}</Mono></Field>
        <Field label="Duration"><Mono>{f.tradeDuration}</Mono></Field>
        <Field label="Positions"><Mono>{ids.length}</Mono></Field>
        <Field label="Trade group"><Mono>{stripPositionId(f.tradeGroupId)}</Mono></Field>
      </FieldGrid>

      <div>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)', marginBottom: 4 }}>
          News events during the hold · {events.length}
        </div>
        {events.length === 0
          ? <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>No events recorded.</div>
          : events.map((e, i) => <EventRow key={e.id || i} e={e} />)}
      </div>

      <IdList ids={ids} open={showIds} onToggle={() => setShowIds((v) => !v)} />
    </div>
  )
}

export default function GamblingDetail({ data }) {
  if (!data) return null
  const findings = Array.isArray(data.findings) ? data.findings : []
  const totalProfit = sumNumeric(findings.map((f) => f.profit))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <ScanHeader data={data} kind="GAMBLING" />

      <FieldGrid>
        <Field label="Flag ID"><Mono>{data.flag_id}</Mono></Field>
        <Field label="Scan date"><Mono>{fmtDay(data.scan_date)}</Mono></Field>
        <Field label="Initial balance"><Money value={data.initial_balance} /></Field>
        <Field label="Profit threshold"><Money value={data.profit_threshold} dp={2} /></Field>
        <Field label="Findings"><Mono>{data.finding_count ?? findings.length}</Mono></Field>
        <Field label="Total profit"><Money value={totalProfit} dp={2} /></Field>
        <Field label="Flagged at"><Mono>{fmtDate(data.created_at)}</Mono></Field>
      </FieldGrid>

      <div>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)', marginBottom: 9 }}>
          Findings · {findings.length}
        </div>
        {findings.length === 0 ? (
          <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>No findings on this scan.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {findings.map((f, i) => (
              <Finding key={f.id || f.tradeGroupId || i} f={f} index={i} threshold={data.profit_threshold} />
            ))}
          </div>
        )}
      </div>

      {data.updated_at && data.updated_at !== data.created_at && (
        <ReasonNote>Last updated {fmtDate(data.updated_at)}.</ReasonNote>
      )}
    </div>
  )
}
