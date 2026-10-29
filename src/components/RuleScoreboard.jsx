import { severityStyle } from '../data.js'
import { CROSS_ACCOUNT_LABELS, ruleLabel, ruleOf, stateMeta } from '../reviewModel.js'
import { Money } from './ScanFields.jsx'
import { Notice, StateBadge } from './ReviewBits.jsx'

// The account-summary scoreboard (§3.7) for one scope. `total_breaches`
// counts the tiered rules only — Gambling (manual review), Minimum Trading
// Days (a payout note) and RT/GT (cross-account) sit beside it, not in it.
//
// summary.rules is the source; a server without it falls back to by_type.

const TONE_COLOR = { crit: 'var(--crit)', high: 'var(--high)', ok: 'var(--ok)', info: 'var(--info)', neutral: 'var(--text-3)' }

// The one extra figure each rule entry can carry.
function ruleDetail(key, r) {
  if (r.total_removable_profit != null) return <>remove <Money value={r.total_removable_profit} dp={2} /></>
  if (r.observed_days != null || r.required_days != null) return `${r.observed_days ?? '—'} of ${r.required_days ?? '—'} days`
  if (r.verdict_line) return r.verdict_line
  return r.reason || null
}

export default function RuleScoreboard({ data, activeRule, onOpenRule, onCrossAccount }) {
  const summary = data?.summary
  if (!summary) return null
  const rules = summary.rules
    ? Object.entries(summary.rules)
    : Object.entries(summary.by_type || {}).map(([k, n]) => [k, { state: n == null ? 'not_applicable' : n > 0 ? 'breached' : 'clean', count: n }])
  const total = summary.total_breaches ?? summary.total_flags ?? 0
  const severities = Object.entries(summary.cross_account_by_severity || summary.by_severity || {})

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', padding: '16px 18px', borderBottom: '1px solid var(--hair)' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Rules in this scope</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>Click a rule to open its findings for the same scope.</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: 28, fontWeight: 600, letterSpacing: '-0.03em', color: total ? 'var(--crit)' : 'var(--ok)' }}>{Number(total).toLocaleString()}</div>
          <div style={{ fontSize: 10.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            breaches in {data.scope?.kind === 'full' ? 'full history' : 'this scope'}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>tiered rules only</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, padding: '14px 18px' }}>
        {rules.map(([key, r]) => {
          const meta = stateMeta(r.state)
          const drill = ruleOf(key)
          const cross = !drill && CROSS_ACCOUNT_LABELS[key]
          const onClick = drill ? () => onOpenRule(drill.key) : cross && onCrossAccount ? () => onCrossAccount(key) : null
          const detail = ruleDetail(key, r)
          return (
            <button
              key={key}
              onClick={onClick || undefined}
              disabled={!onClick}
              title={r.reason || undefined}
              style={{
                font: 'inherit', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 5, padding: '10px 12px', borderRadius: 9,
                cursor: onClick ? 'pointer' : 'default', background: 'var(--surface-2)', opacity: meta.muted ? 0.75 : 1,
                border: `1px solid ${drill?.key === activeRule ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-2)', flex: 1, minWidth: 0 }}>{ruleLabel(key)}</span>
                <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 17, fontWeight: 600, color: TONE_COLOR[meta.tone] }}>{r.count == null ? '—' : r.count}</span>
              </div>
              <StateBadge state={r.state} />
              {detail && <span style={{ fontSize: 10.5, color: 'var(--text-3)', lineHeight: 1.35, overflowWrap: 'anywhere' }}>{detail}</span>}
            </button>
          )
        })}
      </div>

      {severities.length > 0 && (
        <div style={{ borderTop: '1px solid var(--hair)', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>RT / GT by severity</span>
          {severities.map(([k, n]) => {
            const sev = severityStyle(k)
            return (
              <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, color: sev ? sev.color : 'var(--text-2)', background: sev ? sev.soft : 'var(--inset)' }}>{String(k).toUpperCase()}</span>
                <span style={{ fontFamily: "'Geist Mono',monospace", fontWeight: 600 }}>{n}</span>
              </span>
            )
          })}
        </div>
      )}

      {(data.validation_note || data.mongo_note) && (
        <div style={{ padding: '0 18px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.validation_note && <Notice tone="high">{data.validation_note}</Notice>}
          {data.mongo_note && <Notice tone="high">{data.mongo_note}</Notice>}
        </div>
      )}
      {data.as_of_note && <div style={{ padding: '0 18px 14px', fontSize: 11, color: 'var(--text-3)' }}>{data.as_of_note}</div>}
    </div>
  )
}
