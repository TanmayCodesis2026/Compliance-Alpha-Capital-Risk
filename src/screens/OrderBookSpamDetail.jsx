import { useState } from 'react'
import { fmtDate, fmtDay, fmtMt5 } from '../data.js'
import {
  DirectionPill, Field, FieldGrid, IdList, Mono, Pill, ReasonNote,
} from '../components/ScanFields.jsx'
import { stripPositionId } from '../components/scanFormat.js'

// Rendered inside TradeFlags' expanded row panel via:
//   detailFetcher={fetchOrderBookSpamDetail}
//   renderDetail={d => <OrderBookSpamDetail data={d} />}
//
// `data` is the OBS scan result — the same shape the list returns:
//   { flag_id, login_id, scan_date, cluster_count, total_entries_flagged,
//     clusters: [{ reason, symbol, direction, entryCount, windowSpan,
//                  firstOpenTime, lastOpenTime, totalOpenedLots,
//                  positionIds[], tradeGroupIds[] }],
//     created_at, updated_at }
//
// Everything is embedded, so there's no second-level trade fetch: the ids are
// MT5 position ids, which /api/trades/ does not resolve.

function Cluster({ c, index }) {
  const [showIds, setShowIds] = useState(false)
  // positionIds and tradeGroupIds carry the same set; prefer the plain ids.
  const ids = (Array.isArray(c.positionIds) && c.positionIds.length ? c.positionIds : (c.tradeGroupIds || [])).map(stripPositionId)
  const span = c.windowSpan === '0s' || c.windowSpan === '0' ? 'simultaneous' : c.windowSpan

  return (
    <div style={{ background: 'var(--inset)', border: '1px solid var(--border)', borderRadius: 9, padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--text-3)', fontFamily: "'Geist Mono',monospace" }}>#{index + 1}</span>
        <span style={{ fontFamily: "'Geist Mono',monospace", fontWeight: 600, fontSize: 12.5 }}>{c.symbol || '—'}</span>
        <DirectionPill direction={c.direction} />
        <span style={{ fontSize: 11.5, color: 'var(--text-2)' }}>
          <b style={{ fontFamily: "'Geist Mono',monospace", color: 'var(--text)' }}>{c.entryCount ?? ids.length}</b> entries
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-3)' }}>window <Mono>{span}</Mono></span>
      </div>

      <FieldGrid>
        <Field label="First open"><Mono>{fmtMt5(c.firstOpenTime, { withDate: true })}</Mono></Field>
        <Field label="Last open"><Mono>{fmtMt5(c.lastOpenTime, { withDate: true })}</Mono></Field>
        <Field label="Total lots"><Mono>{c.totalOpenedLots}</Mono></Field>
        <Field label="Positions"><Mono>{ids.length}</Mono></Field>
      </FieldGrid>

      {c.reason && <ReasonNote>{c.reason}</ReasonNote>}

      <IdList ids={ids} open={showIds} onToggle={() => setShowIds((v) => !v)} />
    </div>
  )
}

export default function OrderBookSpamDetail({ data }) {
  if (!data) return null
  const clusters = Array.isArray(data.clusters) ? data.clusters : []
  const entries = data.total_entries_flagged ?? clusters.reduce((a, c) => a + (c.entryCount || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <Pill tone="high" mono>{data.flag_type || 'OBS'}</Pill>
        <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
          Login <span style={{ color: 'var(--text)', fontWeight: 600, fontFamily: "'Geist Mono',monospace" }}>{data.login_id || '—'}</span>
          <span style={{ marginLeft: 8 }}>· scanned {fmtDay(data.scan_date)}</span>
        </div>
      </div>

      <FieldGrid>
        <Field label="Flag ID"><Mono>{data.flag_id}</Mono></Field>
        <Field label="Clusters"><Mono>{data.cluster_count ?? clusters.length}</Mono></Field>
        <Field label="Entries flagged"><Mono>{entries}</Mono></Field>
        <Field label="Flagged at"><Mono>{fmtDate(data.created_at)}</Mono></Field>
        <Field label="Updated"><Mono>{fmtDate(data.updated_at)}</Mono></Field>
      </FieldGrid>

      <div>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)', marginBottom: 9 }}>
          Clusters · {clusters.length}
        </div>
        {clusters.length === 0 ? (
          <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>No clusters on this scan.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {clusters.map((c, i) => <Cluster key={c.tradeGroupIds?.[0] || c.positionIds?.[0] || i} c={c} index={i} />)}
          </div>
        )}
      </div>
    </div>
  )
}
