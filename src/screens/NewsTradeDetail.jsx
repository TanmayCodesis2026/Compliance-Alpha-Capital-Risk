import { fmtDate, fmtDay, fmtMt5 } from '../data.js'
import {
  Field, FieldGrid, Money, Mono, Pill, ReasonNote, ScanHeader,
} from '../components/ScanFields.jsx'
import { stripPositionId, sumNumeric } from '../components/scanFormat.js'

// Rendered inside TradeFlags' expanded row panel via:
//   detailFetcher={fetchNewsTradingDetail}
//   renderDetail={d => <NewsTradeDetail data={d} />}
//
// `data` is the news-trading scan result — the same shape the list returns:
//   { flag_id, login_id, plan, scan_date, rules_version, buffer_minutes,
//     breach_count,
//     flagged_trades: [{ symbol, volume, profit, positionId, tradeGroupId,
//                        openTime, closeTime, tradeDuration, recordType,
//                        breachedAt, taintedAtEntry, restrictedWindow,
//                        reviewReason, eventName, eventDate, eventTime,
//                        eventType, currency, gmtOffset, speaker,
//                        sourceLabel, sourceUrl }],
//     excluded_speeches[], fallback_symbols[], created_at, updated_at }

// "2026/07/28 09:58:00 GMT+3 -> 2026/07/28 10:02:00 GMT+3" — the API already
// formats this for display, so it's split rather than reparsed.
function RestrictedWindow({ value }) {
  if (!value) return <span style={{ color: 'var(--text-3)' }}>—</span>
  const [from, to] = String(value).split(/\s*->\s*/)
  if (!to) return <Mono>{value}</Mono>
  return (
    <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 11.5 }}>
      {from} <span style={{ color: 'var(--text-3)' }}>→</span> {to}
    </span>
  )
}

function FlaggedTrade({ t, index }) {
  // opening inside the window taints every later fill in the group; closing
  // inside it is the milder case, so they read differently.
  const tainted = !!t.taintedAtEntry
  const source = t.sourceUrl
    ? <a href={t.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>{t.sourceLabel || 'Source'}</a>
    : (t.sourceLabel || '—')

  return (
    <div style={{ background: 'var(--inset)', border: '1px solid var(--border)', borderRadius: 9, padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--text-3)', fontFamily: "'Geist Mono',monospace" }}>#{index + 1}</span>
        <span style={{ fontFamily: "'Geist Mono',monospace", fontWeight: 600, fontSize: 12.5 }}>{t.symbol || '—'}</span>
        {t.breachedAt && <Pill tone={/open/i.test(t.breachedAt) ? 'crit' : 'high'}>BREACHED AT {String(t.breachedAt).toUpperCase()}</Pill>}
        {tainted && <Pill tone="crit">TAINTED AT ENTRY</Pill>}
        <span style={{ marginLeft: 'auto', fontSize: 11.5 }}><Money value={t.profit} dp={2} /></span>
      </div>

      <FieldGrid>
        <Field label="Volume"><Mono>{t.volume}</Mono></Field>
        <Field label="Open"><Mono>{fmtMt5(t.openTime, { withDate: true })}</Mono></Field>
        <Field label="Close"><Mono>{fmtMt5(t.closeTime, { withDate: true })}</Mono></Field>
        <Field label="Duration"><Mono>{t.tradeDuration}</Mono></Field>
        <Field label="Record">{t.recordType || '—'}</Field>
        <Field label="Position"><Mono>{t.positionId}</Mono></Field>
        <Field label="Trade group"><Mono>{stripPositionId(t.tradeGroupId)}</Mono></Field>
      </FieldGrid>

      {/* the release that created the restricted window */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 11px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', fontSize: 11.5 }}>
          <Pill tone="info">{t.currency || '—'}</Pill>
          <span style={{ fontWeight: 600 }}>{t.eventName || 'Unnamed event'}</span>
          <span style={{ color: 'var(--text-3)', fontFamily: "'Geist Mono',monospace" }}>
            {fmtDay(t.eventDate)} · {t.eventTime || '—'}{t.gmtOffset ? ` ${t.gmtOffset}` : ''}
          </span>
          {t.eventType && <span style={{ color: 'var(--text-3)' }}>{t.eventType}</span>}
        </div>
        <FieldGrid min={160}>
          <Field label="Restricted window"><RestrictedWindow value={t.restrictedWindow} /></Field>
          <Field label="Source">{source}</Field>
          {t.speaker && <Field label="Speaker">{t.speaker}</Field>}
        </FieldGrid>
      </div>

      {t.reviewReason && <ReasonNote>{t.reviewReason}</ReasonNote>}
    </div>
  )
}

const Chips = ({ label, items }) => {
  if (!items || items.length === 0) return null
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)', marginBottom: 6 }}>
        {label} · {items.length}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map((x, i) => (
          <span key={i} style={{ fontFamily: "'Geist Mono',monospace", fontSize: 11, color: 'var(--text-2)', background: 'var(--inset)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 7px' }}>
            {typeof x === 'string' ? x : (x?.name || x?.title || JSON.stringify(x))}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function NewsTradeDetail({ data }) {
  if (!data) return null
  const trades = Array.isArray(data.flagged_trades) ? data.flagged_trades : []
  const totalProfit = sumNumeric(trades.map((t) => t.profit))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <ScanHeader data={data} kind="NEWS TRADING" />

      <FieldGrid>
        <Field label="Flag ID"><Mono>{data.flag_id}</Mono></Field>
        <Field label="Scan date"><Mono>{fmtDay(data.scan_date)}</Mono></Field>
        <Field label="Breaches"><Mono>{data.breach_count ?? trades.length}</Mono></Field>
        <Field label="Buffer"><Mono>{data.buffer_minutes == null ? null : `±${data.buffer_minutes}m`}</Mono></Field>
        <Field label="Rules version"><Mono>{data.rules_version}</Mono></Field>
        <Field label="Total profit"><Money value={totalProfit} dp={2} /></Field>
        <Field label="Flagged at"><Mono>{fmtDate(data.created_at)}</Mono></Field>
      </FieldGrid>

      <div>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)', marginBottom: 9 }}>
          Flagged trades · {trades.length}
        </div>
        {trades.length === 0 ? (
          <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>No flagged trades on this scan.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {trades.map((t, i) => <FlaggedTrade key={t.tradeGroupId || t.positionId || i} t={t} index={i} />)}
          </div>
        )}
      </div>

      {/* context the scanner recorded but did not act on */}
      <Chips label="Excluded speeches" items={data.excluded_speeches} />
      <Chips label="Fallback symbols" items={data.fallback_symbols} />
    </div>
  )
}
