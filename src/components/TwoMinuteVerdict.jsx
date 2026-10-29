import { Money } from './ScanFields.jsx'
import { CopyButton, MetricGrid, Metric, MiniTable, Notice, SectionLabel, StateBadge } from './ReviewBits.jsx'
import { profitSourceLabel } from '../reviewModel.js'

// One Two Minute verdict (§3.5) — the object /two-minute/verdict/,
// /two-minute/account/ and account-summary's `two_minute` all return.
//
// Funded: breached when short-duration profit ≥ 50% of the (floored) period
// profit. Evaluation: the reference is the profit target and the line is
// > 50%. The server has already decided; this only shows its working.
//
// Evidence (the quick trades) is listed only when breached — that is what the
// client asked for, and the server sends it only then.

const EVIDENCE_COLS = [
  { label: 'Position', key: 'position_id', mono: true, width: 110 },
  { label: 'Symbol', key: 'symbol', mono: true, width: 90 },
  { label: 'Record', key: 'record_type', width: 120, muted: true },
  { label: 'Open (server)', key: 'open_time', mono: true, width: 190, muted: true },
  { label: 'Close (server)', key: 'close_time', mono: true, width: 190, muted: true },
  { label: 'Held', key: 'duration', mono: true, width: 80 },
  // the spec says `pnl`; the API sends `profit`
  { label: 'Profit', get: (r) => r.profit ?? r.pnl, kind: 'money', width: 105 },
  { label: 'Why', key: 'reason', width: 320, muted: true },
]

export default function TwoMinuteVerdict({ verdict, title, onManualProfitHint }) {
  if (!verdict) return null
  const v = verdict
  const headline = v.verdict_line || v.client_line
  const copyLine = v.summary_line || v.client_line
  const counts = Object.entries(v.short_by_record_type || {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
        <StateBadge state={v.state} />
        {title && <span style={{ fontWeight: 600, fontSize: 13 }}>{title}</span>}
        {v.scope?.label && <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{v.scope.label}</span>}
        <span style={{ marginLeft: 'auto' }}><CopyButton text={copyLine} label="Copy line" /></span>
      </div>

      {v.state === 'cannot_run' ? (
        <Notice tone="neutral" title="The check could not run.">
          {v.cannot_run || 'No reason given.'}
          {onManualProfitHint && v.period_profit && v.period_profit.profit == null && ' Enter the period net profit above to give it a reference.'}
        </Notice>
      ) : (
        headline && <div style={{ fontSize: 13, fontWeight: 600, overflowWrap: 'anywhere' }}>{headline}</div>
      )}

      {v.state !== 'cannot_run' && (
        <MetricGrid min={140}>
          <Metric label={v.reference_label || 'Reference'} hint={profitSourceLabel(v.reference_source)}><Money value={v.reference} dp={2} /></Metric>
          <Metric label="50% line"><Money value={v.fifty_percent_line} dp={2} /></Metric>
          <Metric label="Short-duration profit" hint={`${v.short_count ?? 0} closes`}><Money value={v.short_duration_profit} dp={2} /></Metric>
          <Metric label="Share">{v.share_text}</Metric>
          <Metric label="Compliant profit" hint={`${v.compliant_count ?? 0} closes`}><Money value={v.compliant_duration_profit} dp={2} /></Metric>
          {v.max_duration_seconds != null && <Metric label="Window">{v.max_duration_seconds}s</Metric>}
        </MetricGrid>
      )}

      {counts.length > 0 && (
        <div style={{ fontSize: 11.5, color: 'var(--text-2)' }}>
          Short closes by type: {counts.map(([k, n]) => `${k} ${n}`).join(' · ')}
        </div>
      )}

      {v.reference_source === 'daily_net_profit' && (
        <Notice tone="high">The balance history was missing, so the reference is the closed-trade net profit of the period’s days.</Notice>
      )}

      {v.breached && (v.evidence || []).length > 0 && (
        <div>
          <SectionLabel>Short-duration trades · {v.evidence.length}</SectionLabel>
          <MiniTable rows={v.evidence} cols={EVIDENCE_COLS} rowKey={(r, i) => r.id ?? `${r.position_id}-${i}`} />
        </div>
      )}
    </div>
  )
}

// scope=all: one verdict per payout period, oldest first, plus a rollup.
export function TwoMinuteAllPeriods({ data }) {
  if (!data) return null
  const s = data.summary || {}
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
        <b style={{ color: s.any_breach ? 'var(--crit)' : 'var(--ok)' }}>{s.breached_periods ?? 0} of {s.periods ?? 0}</b> payout periods breached.
      </div>
      {(data.verdicts || []).map((v, i) => (
        <div key={v.scope?.scope_key || i} style={{ borderTop: '1px solid var(--hair)', paddingTop: 12 }}>
          <TwoMinuteVerdict verdict={v} title={`Period ${v.scope?.period_index ?? i + 1}`} />
        </div>
      ))}
    </div>
  )
}
