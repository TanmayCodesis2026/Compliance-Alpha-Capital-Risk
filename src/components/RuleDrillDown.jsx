import { useEffect, useState } from 'react'
import { fetchRuleForAccount } from '../api.js'
import { ruleOf, warningText } from '../reviewModel.js'
import { scopeId } from '../scope.js'
import { CellValue, CopyButton, Metric, MetricGrid, MiniTable, Notice, SectionLabel, StateBadge } from './ReviewBits.jsx'
import { smallBtn } from './buttonStyles.js'
import TwoMinuteVerdict from './TwoMinuteVerdict.jsx'

// One rule for one account in the chosen scope (T23–T31):
//   GET /<rule>/account/ -> { scope, result, stored_review_chip, … }
// The nine endpoints share an envelope; what differs is which figures and
// which item list a rule has, so each rule is a VIEW entry below rather than a
// component of its own. Items are already filtered to the scope server-side,
// on their own close/open time.

const m = (key, label, kind) => ({ key, label, kind })
const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj)

const VIEWS = {
  news_trading: {
    metrics: [m('breach_count', 'Breaches'), m('counts.flags', 'Flags'), m('counts.flagged_trades', 'Flagged trades'), m('counts.tainted_trade_groups', 'Tainted groups'), m('counts.partial_close_flags', 'Partial closes'), m('counts.final_close_flags', 'Final closes'), m('counts.event_groups', 'Event groups')],
    lists: [{
      key: 'flags', title: 'Flags',
      cols: [
        { label: 'Event', get: (r) => [r.eventName, r.speaker && `(${r.speaker})`].filter(Boolean).join(' '), width: 230 },
        { label: 'Event time', get: (r) => [r.eventDate, r.eventTime, r.gmtOffset].filter(Boolean).join(' '), mono: true, width: 190, muted: true },
        { label: 'Ccy', key: 'currency', mono: true, width: 60 },
        { label: 'Restricted window', key: 'restrictedWindow', mono: true, width: 200, muted: true },
        { label: 'Position', key: 'positionId', mono: true, width: 100 },
        { label: 'Symbol', key: 'symbol', mono: true, width: 85 },
        { label: 'Open (server)', key: 'openTime', mono: true, width: 150, muted: true },
        { label: 'Close (server)', key: 'closeTime', mono: true, width: 150, muted: true },
        { label: 'Breached at', key: 'breachedAt', width: 90 },
        { label: 'Tainted at entry', key: 'taintedAtEntry', kind: 'bool', width: 110 },
        { label: 'Profit', key: 'profit', kind: 'money', width: 100 },
      ],
    }],
    extras: [['excluded_speeches', 'Excluded speeches (no live start / end)'], ['fallback_symbols', 'Fallback symbols']],
  },
  gambling: {
    note: 'Manual review — Gambling is never a breach.',
    metrics: [m('finding_count', 'Findings'), m('initial_balance', 'Initial balance', 'money'), m('profit_threshold', 'Profit threshold', 'money')],
    lists: [{
      key: 'findings', title: 'Findings',
      cols: [
        { label: 'Summary', key: 'summaryItem', mono: true, width: 290 },
        { label: 'Symbols', key: 'symbols', mono: true, width: 100 },
        { label: 'Open (server)', key: 'openTime', mono: true, width: 150, muted: true },
        { label: 'Close (server)', key: 'closeTime', mono: true, width: 150, muted: true },
        { label: 'Held', key: 'tradeDuration', mono: true, width: 85 },
        { label: 'Share', key: 'profitShare', kind: 'pct', width: 75 },
        { label: 'Profit', key: 'profit', kind: 'money', width: 100 },
      ],
    }],
  },
  weekend_holding: {
    metrics: [m('breach_count', 'Breaches'), m('news_flagged_count', 'Also news-flagged'), m('total_removable_profit', 'Removable profit', 'money')],
    footnote: 'Removable profit leaves out records News Trading already flagged.',
    lists: [{
      key: 'breaches', title: 'Breaches',
      cols: [
        { label: 'Summary', key: 'summaryItem', mono: true, width: 280 },
        { label: 'Position', key: 'positionId', mono: true, width: 100 },
        { label: 'Symbol', key: 'symbol', mono: true, width: 85 },
        { label: 'Open (server)', key: 'openTime', mono: true, width: 150, muted: true },
        { label: 'Close (server)', key: 'closeTime', mono: true, width: 150, muted: true },
        { label: 'Held', key: 'tradeDuration', mono: true, width: 100 },
        { label: 'News-flagged', key: 'newsFlagged', kind: 'bool', width: 95 },
        { label: 'Removable', key: 'removableProfit', kind: 'money', width: 100 },
      ],
    }],
  },
  order_book_spam: {
    metrics: [m('cluster_count', 'Clusters'), m('total_entries_flagged', 'Entries flagged')],
    lists: [{
      key: 'clusters', title: 'Clusters',
      cols: [
        { label: 'Summary', key: 'summaryItem', mono: true, width: 300 },
        { label: 'Symbol', key: 'symbol', mono: true, width: 85 },
        { label: 'Side', key: 'direction', width: 60 },
        { label: 'Entries', key: 'entryCount', mono: true, width: 70 },
        { label: 'First (server)', key: 'firstOpenTime', mono: true, width: 150, muted: true },
        { label: 'Last (server)', key: 'lastOpenTime', mono: true, width: 150, muted: true },
        { label: 'Span', key: 'windowSpan', mono: true, width: 70 },
        { label: 'Lots', key: 'totalOpenedLots', mono: true, width: 70 },
        { label: 'Positions', key: 'positionIds', mono: true, width: 200, muted: true },
      ],
    }],
  },
  max_risk: {
    note: 'Under review with the client — shown for information, not enforced.',
    metrics: [m('starting_balance', 'Starting balance', 'money'), m('limit_amount', 'Limit per asset', 'money'), m('tier', 'Tier'), m('breach_count', 'Breaches in scope'), m('full_history_breach_count', 'Breaches, full history')],
    lines: ['review_lines.tierHeading', 'review_lines.limitLine'],
    lists: [{
      key: 'breaches', title: 'Breaches',
      cols: [
        { label: 'Summary', key: 'summaryItem', mono: true, width: 320 },
        { label: 'Asset', key: 'asset', mono: true, width: 85 },
        { label: 'Side', key: 'direction', width: 60 },
        { label: 'Type', key: 'type', width: 170, muted: true },
        { label: 'Net loss', key: 'netLoss', kind: 'money', width: 100 },
        { label: 'Limit', key: 'limit', kind: 'money', width: 95 },
        { label: 'Over', key: 'over', kind: 'money', width: 90 },
        { label: 'Positions', key: 'positionIds', mono: true, width: 200, muted: true },
      ],
    }],
  },
  max_lot: {
    metrics: [m('cap_line', 'Cap'), m('risk_category', 'Risk category'), m('max_allowed_lots', 'Max allowed lots'), m('peak_observed_lots', 'Peak observed lots'), m('open_lots_counted', 'Open lots counted'), m('retirement_applied', 'Retirement applied', 'bool'), m('breach_count', 'Breaches in scope'), m('full_history_breach_count', 'Breaches, full history')],
    lines: ['caps_text'],
    extras: [['caps_reasons', 'Cap reasons']],
    lists: [{
      key: 'breaches', title: 'Breaches',
      cols: [
        { label: 'Position', key: 'positionId', mono: true, width: 110 },
        { label: 'Symbol', key: 'symbol', mono: true, width: 90 },
        { label: 'Open (server)', key: 'openTime', mono: true, width: 160, muted: true },
        { label: 'Open lots', key: 'totalOpenLots', mono: true, width: 90 },
        { label: 'Allowed', key: 'maxAllowedLots', mono: true, width: 90 },
      ],
    }],
  },
  one_percent: {
    metrics: [m('loss_threshold', 'Loss threshold', 'money'), m('breach_count', 'Breaches in scope'), m('realized_loss_count', 'Realized-loss'), m('cooloff_count', 'Cool-off'), m('full_history_breach_count', 'Breaches, full history')],
    extras: [['summary_items', 'Summary items'], ['risk_inputs', 'Risk inputs']],
    lists: [
      {
        key: 'realized_loss_breaches', title: 'Realized-loss breaches',
        cols: [
          { label: 'Type', key: 'breachType', width: 130 },
          { label: 'Positions', key: 'positionIds', mono: true, width: 200 },
          { label: 'Open (UTC)', key: 'openTimeUtc', mono: true, width: 190, muted: true },
          { label: 'Close (UTC)', key: 'closeTimeUtc', mono: true, width: 190, muted: true },
        ],
      },
      {
        key: 'cooloff_breaches', title: 'Cool-off breaches',
        cols: [
          { label: 'Position', key: 'positionId', mono: true, width: 120 },
          { label: 'Close (UTC)', key: 'closeTimeUtc', mono: true, width: 190, muted: true },
        ],
      },
    ],
  },
  minimum_trading_days: {
    note: 'A payout note: “not met” is not a rule breach. This rule ignores the scope switch.',
    metrics: [m('required_days', 'Required days'), m('observed_days', 'Observed days'), m('missing_days', 'Missing days'), m('payout_type', 'Payout type'), m('cycle_start', 'Cycle start'), m('cycle_end', 'Cycle end')],
    lines: ['review_lines.statusLine'],
    extras: [['saved_days', 'Saved days'], ['new_days', 'New days'], ['trading_day_groups', 'Trading-day groups'], ['rows_not_counted', 'Rows not counted']],
    lists: [],
  },
}

// The headline the client asked for, with fallbacks for the rules that leave
// summary_line null (One Percent, Two Minute on Evaluation / manual).
const headlineOf = (r) => r.summary_line || r.verdict_line || get(r, 'review_lines.statusLine') || (Array.isArray(r.summary_items) && r.summary_items.length ? r.summary_items.join(' · ') : null)

const isEmpty = (v) => v == null || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length)

// What one rule found, rendered from the drill-down envelope. Pure: the
// fetching wrapper below owns loading and errors.
export function RuleResult({ rule, data }) {
  const view = VIEWS[rule] || { metrics: [], lists: [] }
  const r = data?.result
  if (!r) return null
  const chip = data.stored_review_chip
  const warnings = [...(r.data_warnings || []), ...(r.meta?.data_warnings || [])]
  return (
    <>
      {view.note && <Notice tone="info">{view.note}</Notice>}
      {data.scope?.label && <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{data.scope.label}</div>}

      {r.status && r.status !== 'checked' && (
        <Notice tone="neutral" title={r.status.replace(/_/g, ' ')}>{r.status_reason}</Notice>
      )}
      {r.state === 'cannot_run' && r.status_reason && r.status === 'checked' && <Notice tone="neutral">{r.status_reason}</Notice>}

      {rule === 'two_minute' ? (
        <TwoMinuteVerdict verdict={r} />
      ) : (<>
        {headlineOf(r) && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 600, fontFamily: "'Geist Mono',monospace", overflowWrap: 'anywhere' }}>{headlineOf(r)}</div>
            <CopyButton text={headlineOf(r)} label="Copy line" />
          </div>
        )}
        {(view.lines || []).map((p) => get(r, p)).filter(Boolean).map((l) => (
          <div key={l} style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{l}</div>
        ))}

        <MetricGrid>
          {view.metrics.filter((x) => get(r, x.key) !== undefined).map((x) => (
            <Metric key={x.key} label={x.label}><CellValue value={get(r, x.key)} kind={x.kind} /></Metric>
          ))}
        </MetricGrid>
        {view.footnote && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{view.footnote}</div>}

        {view.lists.map((l) => (
          (r[l.key] || []).length > 0 && (
            <div key={l.key}>
              <SectionLabel>{l.title} · {r[l.key].length}</SectionLabel>
              <MiniTable rows={r[l.key]} cols={l.cols} />
            </div>
          )
        ))}
        {view.lists.length > 0 && view.lists.every((l) => !(r[l.key] || []).length) && (
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Nothing in this scope.</div>
        )}

        {(view.extras || []).filter(([k]) => !isEmpty(r[k])).map(([k, label]) => (
          <div key={k}>
            <SectionLabel>{label}</SectionLabel>
            <div style={{ fontSize: 12, fontFamily: "'Geist Mono',monospace", color: 'var(--text-2)', overflowWrap: 'anywhere' }}><CellValue value={r[k]} /></div>
          </div>
        ))}
      </>)}

      {r.scope_note && <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{r.scope_note}</div>}
      {warnings.map((w, i) => <Notice key={i} tone="high">{warningText(w)}</Notice>)}

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-3)' }}>
        {chip && <span>Stored review: <b style={{ color: 'var(--text-2)' }}>{chip.text}</b></span>}
        {data.stored_review_checked_at && <span>reviewed {data.stored_review_checked_at}</span>}
        {(r.updated_at || r.meta?.last_updated) && <span>data updated {r.updated_at || r.meta.last_updated}</span>}
      </div>
    </>
  )
}

export default function RuleDrillDown({ rule, loginId, scope, onClose, onOpenList }) {
  // `req` names the request a result belongs to; loading is "the newest result
  // is for an older request", so nothing has to be reset when a request starts.
  const req = `${rule}|${loginId}|${scopeId(scope)}`
  const [result, setResult] = useState({ req: null, rule: null, data: null, error: null })
  const meta = ruleOf(rule)

  useEffect(() => {
    let alive = true
    fetchRuleForAccount(rule, loginId, scope)
      .then((d) => { if (alive) setResult({ req, rule, data: d, error: null }) })
      .catch((e) => { if (alive) setResult((s) => ({ req, rule, data: s.rule === rule ? s.data : null, error: e })) })
    return () => { alive = false }
    // scope is compared by its params (inside `req`), not by object identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req])

  // A scope switch keeps the same rule's last result on screen while the new
  // one loads; a different rule starts blank.
  const loading = result.req !== req
  const state = {
    loading,
    data: result.rule === rule ? result.data : null,
    error: loading ? null : result.error,
  }
  const r = state.data?.result

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 650, fontSize: 15 }}>{meta?.label || rule}</div>
        {r?.state && <StateBadge state={r.state} />}
        {state.loading && state.data && <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Updating…</span>}
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {meta?.screen && onOpenList && <button onClick={() => onOpenList(rule)} className="ghost-btn" style={smallBtn}>Open list</button>}
          <button onClick={onClose} className="ghost-btn" style={smallBtn}>Close</button>
        </span>
      </div>

      {state.loading && !state.data && <div className="skeleton" style={{ height: 120, borderRadius: 9 }} />}
      {state.error && (
        <Notice tone={state.error.isUnavailable ? 'high' : 'crit'} title={state.error.isUnavailable ? 'Temporarily unavailable.' : 'Couldn’t load this rule.'}>{state.error.message}</Notice>
      )}

      {r && <RuleResult rule={rule} data={state.data} />}
    </div>
  )
}
