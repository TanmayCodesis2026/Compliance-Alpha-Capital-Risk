import TradeFlags from './TradeFlags.jsx'
import { fetchNewsEvents, fetchNewsEventDetail } from '../api.js'
import { fmtDate, fmtDay } from '../data.js'
import { Field, FieldGrid, Mono, Pill } from '../components/ScanFields.jsx'

// GET /api/news-events/ — the economic calendar the news-trading and gambling
// scanners time their restricted windows against. One row per release or
// speech:
//   { id, type, event_date, event_name, speaker, currency, gmt_offset,
//     start_time, live_start_time, end_time, source, source_url, notes,
//     created_at, synced_at }
//
// Times arrive as plain "HH:MM:SS" strings alongside a separate `gmt_offset`
// label, so they are shown as given rather than converted — reinterpreting a
// calendar time in the viewer's timezone would misstate when the window opened.

// "release" reads differently from "speech": a speech has a speaker and can run
// long, which is why live_start_time / end_time exist.
const typeTone = (t) => (/speech|speak|testimon/i.test(t || '') ? 'info' : 'high')

const time = (t) => (t ? String(t).slice(0, 8) : null)

const columns = [
  { key: 'event_name', label: 'Event', width: 260, render: (r) => (
      <span style={{ fontWeight: 600 }}>{r.event_name || '—'}</span>
    ) },
  { key: 'type', label: 'Type', width: 100, render: (r) => (
      r.type ? <Pill tone={typeTone(r.type)}>{String(r.type).toUpperCase()}</Pill> : <span style={{ color: 'var(--text-3)' }}>—</span>
    ) },
  { key: 'currency', label: 'Currency', width: 90, render: (r) => (
      r.currency ? <Pill tone="info">{r.currency}</Pill> : <span style={{ color: 'var(--text-3)' }}>—</span>
    ) },
  { key: 'event_date', label: 'Date', width: 130, muted: true, render: (r) => fmtDay(r.event_date) },
  { key: 'start_time', label: 'Start', width: 130, mono: true, render: (r) => {
      const t = time(r.start_time)
      return t ? `${t}${r.gmt_offset ? ' ' + r.gmt_offset : ''}` : '—'
    } },
  { key: 'speaker', label: 'Speaker', width: 150, muted: true, render: (r) => r.speaker || '—' },
  { key: 'source', label: 'Source', width: 130, muted: true, render: (r) => (
      r.source_url
        ? <a href={r.source_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: 'var(--accent)' }}>{r.source || 'Source'}</a>
        : (r.source || '—')
    ) },
  { key: 'synced_at', label: 'Synced', width: 130, mono: true, muted: true, render: (r) => fmtDate(r.synced_at) },
]

// Expanding a row fetches GET /api/news-events/{id}/ and renders that payload.
// It is the same shape as the list row, so this reads the detail response
// rather than the row it was opened from — a value corrected server-side since
// the page loaded shows through instead of being masked by the stale row.
const renderDetail = (d) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
      {d.type && <Pill tone={typeTone(d.type)}>{String(d.type).toUpperCase()}</Pill>}
      {d.currency && <Pill tone="info">{d.currency}</Pill>}
      <span style={{ fontWeight: 600, fontSize: 13 }}>{d.event_name || 'Unnamed event'}</span>
      <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--text-3)', fontFamily: "'Geist Mono',monospace" }}>
        {fmtDay(d.event_date)} · {time(d.start_time) || '—'}{d.gmt_offset ? ' ' + d.gmt_offset : ''}
      </span>
    </div>

    <FieldGrid>
      <Field label="Event ID"><Mono>{d.id}</Mono></Field>
      <div style={{ height: "12px" }} />
      <Field label="Date"><Mono>{fmtDay(d.event_date)}</Mono></Field>
      <Field label="Start"><Mono>{time(d.start_time)}</Mono></Field>
      {/* live start / end are populated for speeches, null for releases */}
      <Field label="Live start"><Mono>{time(d.live_start_time)}</Mono></Field>
      <Field label="End"><Mono>{time(d.end_time)}</Mono></Field>
      <Field label="GMT offset"><Mono>{d.gmt_offset}</Mono></Field>
      <Field label="Speaker">{d.speaker || '—'}</Field>
      <Field label="Source">
        {d.source_url
          ? <a href={d.source_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>{d.source || 'Source'}</a>
          : (d.source || '—')}
      </Field>
      <Field label="Added"><Mono>{fmtDate(d.created_at)}</Mono></Field>
      <Field label="Last synced"><Mono>{fmtDate(d.synced_at)}</Mono></Field>
    </FieldGrid>

    {d.notes && (
      <div style={{ fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.45, borderLeft: '2px solid var(--border)', paddingLeft: 10 }}>
        {d.notes}
      </div>
    )}
  </div>
)

export default function NewsEvents() {
  return (
    <TradeFlags
      title="News Events"
      subtitle="The economic calendar the news-trading and gambling scanners time their restricted windows against."
      searchPlaceholder="Search events (CPI, FOMC…)"
      fetcher={fetchNewsEvents}
      columns={columns}
      detailFetcher={fetchNewsEventDetail}
      // the row's `id` is the UUID the detail route takes, which is also what
      // TradeFlags keys its cache on — so the default detailIdOf is correct
      detailIdOf={(r) => r.id}
      renderDetail={renderDetail}
      filters={[
        { param: 'type', label: 'Type', options: [
          { value: 'release', label: 'Release', color: 'var(--high)', soft: 'var(--high-soft)' },
          { value: 'speech', label: 'Speech', color: 'var(--info)', soft: 'var(--info-soft)' },
        ] },
        { param: 'currency', label: 'Currency', type: 'text', placeholder: 'EUR', upper: true, width: 90 },
        { param: 'event_date', label: 'Date', type: 'text', placeholder: 'YYYY-MM-DD', width: 120 },
      ]}
    />
  )
}
