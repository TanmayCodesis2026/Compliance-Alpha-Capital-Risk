import { reviewView, ruleOf, stateMeta, warningText } from '../reviewModel.js'
import { Pill } from './ScanFields.jsx'
import { CopyButton, Notice, RefreshingBadge } from './ReviewBits.jsx'

// The Global Tier Summary (§3.3): status first, then the tier heading, the
// worked lines, the nine rule chips and whatever the run could not read.
//
// `review` is the stored review as the worker wrote it (camelCase).

const TONE_COLOR = { crit: 'var(--crit)', high: 'var(--high)', ok: 'var(--ok)', info: 'var(--info)', neutral: 'var(--text-2)' }
const TONE_SOFT = { crit: 'var(--crit-soft)', high: 'var(--high-soft)', ok: 'var(--ok-soft)', info: 'var(--info-soft)', neutral: 'var(--inset)' }

const STATUS_TEXT = {
  not_applicable: 'Not applicable',
  blocked: 'Blocked — the account could not be resolved',
  refused: 'Refused — the inputs are not supported',
}

function RuleChip({ chip, active, onOpen }) {
  const meta = stateMeta(chip.state)
  const rule = ruleOf(chip.rule)
  const clickable = !!(rule && onOpen)
  const color = TONE_COLOR[meta.tone]
  return (
    <button
      onClick={clickable ? () => onOpen(rule.key) : undefined}
      disabled={!clickable}
      title={chip.reason || undefined}
      aria-pressed={clickable ? !!active : undefined}
      style={{
        font: 'inherit', textAlign: 'left', cursor: clickable ? 'pointer' : 'default',
        display: 'flex', flexDirection: 'column', gap: 3, minWidth: 150, maxWidth: 260, padding: '8px 11px', borderRadius: 9,
        border: `1px solid ${active ? color : `color-mix(in srgb,${color} 30%,transparent)`}`,
        background: TONE_SOFT[meta.tone], opacity: meta.muted ? 0.7 : 1,
        boxShadow: active ? `0 0 0 2px color-mix(in srgb,${color} 25%,transparent)` : 'none',
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)' }}>{chip.name || rule?.label || chip.rule}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color }}>{chip.text || meta.label}</span>
      {/* cannot_run / not_applicable say why; the others don't need to */}
      {chip.reason && <span style={{ fontSize: 10.5, color: 'var(--text-3)', lineHeight: 1.35 }}>{chip.reason}</span>}
    </button>
  )
}

export default function TierSummary({ review, notes = [], refreshing, stalled, activeRule, onOpenRule }) {
  const v = reviewView(review)

  const heading = (children, tone = 'neutral', badge = null) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.015em', color: TONE_COLOR[tone] }}>{children}</div>
      {badge}
      {refreshing && <RefreshingBadge />}
      {stalled && <Pill tone="high">RE-CHECK STILL RUNNING</Pill>}
    </div>
  )

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)' }}>Global Tier Summary</div>

      {v.kind === 'missing' && (<>
        {heading('No stored review for this scope yet')}
        {notes.map((n) => <div key={n} style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{n}</div>)}
      </>)}

      {v.kind === 'status' && (<>
        {heading(STATUS_TEXT[v.status] || v.status.replace(/_/g, ' '), 'neutral', <Pill>{v.status.toUpperCase()}</Pill>)}
        {v.reason && <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{v.reason}</div>}
      </>)}

      {v.kind === 'verdict' && (<>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          {heading(v.overall, v.tone, v.tier != null ? <Pill tone={v.tone} mono>TIER {v.tier}</Pill> : null)}
          <CopyButton text={v.copyText} label="Copy summary" />
        </div>

        {v.lines.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {v.lines.map((l, i) => <div key={i} style={{ fontSize: 12.5, fontFamily: "'Geist Mono',monospace", color: 'var(--text)', overflowWrap: 'anywhere' }}>{l}</div>)}
          </div>
        )}

        {v.incomplete && (
          <Notice tone="high" title="Some findings may be missing.">A day table or Mongo could not be read during this review.</Notice>
        )}
        {v.warnings.map((w, i) => <Notice key={i} tone="high">{warningText(w)}</Notice>)}

        {v.chips.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {v.chips.map((c) => <RuleChip key={c.rule} chip={c} active={ruleOf(c.rule)?.key === activeRule} onOpen={onOpenRule} />)}
          </div>
        )}
      </>)}

      {review && (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11.5, color: 'var(--text-3)' }}>
          {(review.storedCheckedAtServer || review.checkedAt) && <span>Last checked <b style={{ color: 'var(--text-2)', fontFamily: "'Geist Mono',monospace" }}>{review.storedCheckedAtServer || review.checkedAt}</b></span>}
          {review.tradeRange?.from && <span>Trades <span style={{ fontFamily: "'Geist Mono',monospace" }}>{review.tradeRange.from} → {review.tradeRange.to}</span></span>}
          {review.closeRecords != null && <span><span style={{ fontFamily: "'Geist Mono',monospace" }}>{Number(review.closeRecords).toLocaleString()}</span> close records</span>}
        </div>
      )}
    </div>
  )
}
