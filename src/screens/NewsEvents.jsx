import { useCallback, useState } from 'react'
import TradeFlags from './TradeFlags.jsx'
import { ApiError, deleteNewsEvent, fetchNewsEvents, fetchNewsEventDetail, restoreNewsEvent } from '../api.js'
import { fmtDate, fmtDay } from '../data.js'
import { Field, FieldGrid, Mono, Pill } from '../components/ScanFields.jsx'
import { Notice } from '../components/ReviewBits.jsx'
import { primaryBtn, smallBtn } from '../components/buttonStyles.js'
import NewsEventForm, { NewsEventHistory } from '../components/NewsEventForm.jsx'
import { writeBlockedReason } from '../newsEventForm.js'

// GET /api/news-events/ — the economic calendar the news-trading and gambling
// scanners time their restricted windows against. One row per release or
// speech:
//   { id, type, event_date, event_name, speaker, currency, gmt_offset,
//     start_time, live_start_time, end_time, source, source_url, notes,
//     created_at, synced_at, created_by, updated_by, updated_at, deleted_at,
//     deleted_by, is_deleted, excluded_from_news_check }
//
// Times arrive as plain "HH:MM:SS" strings alongside a separate `gmt_offset`
// label, so they are shown as given rather than converted — reinterpreting a
// calendar time in the viewer's timezone would misstate when the window opened.
//
// The speech form (§3.8): manual speeches — and releases the Forex Factory
// import lacks — are added, edited, soft-deleted and restored here. Writes need
// staff or a news-editor group. The API exposes no "can edit" flag, so the
// actions are offered until the first 403 and hidden from then on.

// "release" reads differently from "speech": a speech has a speaker and can run
// long, which is why live_start_time / end_time exist.
const typeTone = (t) => (/speech|speak|testimon/i.test(t || '') ? 'info' : 'high')

const time = (t) => (t ? String(t).slice(0, 8) : null)

const columns = [
  { key: 'event_name', label: 'Event', width: 260, render: (r) => (
      <span style={{ fontWeight: 600, textDecoration: r.is_deleted ? 'line-through' : 'none', color: r.is_deleted ? 'var(--text-3)' : 'inherit' }}>{r.event_name || '—'}</span>
    ) },
  { key: 'type', label: 'Type', width: 100, render: (r) => (
      r.type ? <Pill tone={typeTone(r.type)}>{String(r.type).toUpperCase()}</Pill> : <span style={{ color: 'var(--text-3)' }}>—</span>
    ) },
  { key: 'state', label: 'State', width: 120, render: (r) => (
      r.is_deleted ? <Pill tone="crit">DELETED</Pill>
        : r.excluded_from_news_check ? <Pill tone="high">EXCLUDED</Pill>
          : <span style={{ color: 'var(--text-3)' }}>—</span>
    ) },
  { key: 'currency', label: 'Currency', width: 100, render: (r) => (
      r.currency ? <Pill tone="info">{r.currency}</Pill> : <span style={{ color: 'var(--text-3)' }}>—</span>
    ) },
  { key: 'event_date', label: 'Date', width: 120, muted: true, render: (r) => fmtDay(r.event_date) },
  { key: 'start_time', label: 'Start', width: 130, mono: true, render: (r) => {
      const t = time(r.start_time)
      return t ? `${t}${r.gmt_offset ? ' ' + r.gmt_offset : ''}` : '—'
    } },
  { key: 'speaker', label: 'Speaker', width: 150, muted: true, render: (r) => r.speaker || '—' },
  { key: 'source', label: 'Source', width: 120, muted: true, render: (r) => (
      r.source_url
        ? <a href={r.source_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: 'var(--accent)' }}>{r.source || 'Source'}</a>
        : (r.source || '—')
    ) },
  { key: 'created_by', label: 'Added by', width: 170, muted: true, render: (r) => r.created_by || '—' },
  { key: 'synced_at', label: 'Synced', width: 130, mono: true, muted: true, render: (r) => fmtDate(r.synced_at) },
]

// Expanding a row fetches GET /api/news-events/{id}/ and renders that payload.
// It is the same shape as the list row, so this reads the detail response
// rather than the row it was opened from — a value corrected server-side since
// the page loaded shows through instead of being masked by the stale row.
function EventDetail({ d, actions }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
        {d.type && <Pill tone={typeTone(d.type)}>{String(d.type).toUpperCase()}</Pill>}
        {d.currency && <Pill tone="info">{d.currency}</Pill>}
        {d.is_deleted && <Pill tone="crit">DELETED</Pill>}
        <span style={{ fontWeight: 600, fontSize: 13 }}>{d.event_name || 'Unnamed event'}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--text-3)', fontFamily: "'Geist Mono',monospace" }}>
          {fmtDay(d.event_date)} · {time(d.start_time) || '—'}{d.gmt_offset ? ' ' + d.gmt_offset : ''}
        </span>
      </div>

      {d.excluded_from_news_check && (
        <Notice tone="high">This speech has no live start or end time: News Trading does not check it and lists it as an excluded speech until both times are entered.</Notice>
      )}

      <FieldGrid>
        <Field label="Event ID"><Mono>{d.id}</Mono></Field>
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
        <Field label="Added by">{d.created_by || '—'}</Field>
        <Field label="Last edited"><Mono>{fmtDate(d.updated_at)}</Mono></Field>
        <Field label="Edited by">{d.updated_by || '—'}</Field>
        {d.is_deleted && <Field label="Deleted"><Mono>{fmtDate(d.deleted_at)}</Mono></Field>}
        {d.is_deleted && <Field label="Deleted by">{d.deleted_by || '—'}</Field>}
        <Field label="Last synced"><Mono>{fmtDate(d.synced_at)}</Mono></Field>
      </FieldGrid>

      {d.notes && (
        <div style={{ fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.45, borderLeft: '2px solid var(--border)', paddingLeft: 10 }}>
          {d.notes}
        </div>
      )}

      {actions}
    </div>
  )
}

export default function NewsEvents() {
  const [canEdit, setCanEdit] = useState(true)
  const [form, setForm] = useState(null)          // null | { event: null } (add) | { event } (edit)
  const [historyOf, setHistoryOf] = useState(null)
  const [latest, setLatest] = useState({})        // id -> event as the last write returned it
  const [busy, setBusy] = useState(null)          // id being deleted / restored
  const [message, setMessage] = useState(null)    // { tone, title, text }
  const [version, setVersion] = useState(0)       // bumping it refetches the list

  // A new fetcher identity is how TradeFlags is told to reload.
  const fetcher = useCallback((params) => fetchNewsEvents(params), [version]) // eslint-disable-line react-hooks/exhaustive-deps

  const forbidden = useCallback((detail) => {
    setCanEdit(false)
    setForm(null)
    setMessage({ tone: 'crit', title: 'No editor rights.', text: detail || 'Only staff or members of the news-events editor group can change events.' })
  }, [])

  const remember = (event) => {
    setLatest((m) => ({ ...m, [event.id]: event }))
    setVersion((v) => v + 1)
  }

  const saved = (event, warnings, how) => {
    setForm(null)
    remember(event)
    // The excluded-speech warning is a yellow banner, not an error.
    setMessage(warnings.length
      ? { tone: 'high', title: `Event ${how}, with a warning:`, text: warnings.join(' ') }
      : { tone: 'ok', title: `Event ${how}.`, text: event.event_name })
  }

  const softWrite = (event, write, verb) => {
    setBusy(event.id)
    write(event.id)
      .then((res) => {
        remember(res.event)
        setMessage({ tone: 'ok', title: `Event ${verb}.`, text: verb === 'deleted' ? 'Every check now ignores it; “Show deleted” lists it for a restore.' : res.event?.event_name })
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 403) forbidden(e.message)
        else setMessage({ tone: 'crit', title: `Couldn’t ${verb === 'deleted' ? 'delete' : 'restore'} the event.`, text: e.message })
      })
      .finally(() => setBusy(null))
  }

  const actionsFor = (d) => {
    const blocked = writeBlockedReason(d, { canEdit })
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', borderTop: '1px solid var(--hair)', paddingTop: 12 }}>
        <button onClick={() => setHistoryOf(d)} className="ghost-btn" style={smallBtn}>History</button>
        {canEdit && !d.is_deleted && <button onClick={() => setForm({ event: d })} className="ghost-btn" style={smallBtn}>Edit</button>}
        {canEdit && !d.is_deleted && (
          <button onClick={() => { if (window.confirm(`Delete “${d.event_name}”? It can be restored later.`)) softWrite(d, deleteNewsEvent, 'deleted') }} disabled={busy === d.id} className="ghost-btn" style={{ ...smallBtn, color: 'var(--crit)' }}>
            {busy === d.id ? 'Deleting…' : 'Delete'}
          </button>
        )}
        {canEdit && d.is_deleted && (
          <button onClick={() => softWrite(d, restoreNewsEvent, 'restored')} disabled={busy === d.id} className="ghost-btn" style={smallBtn}>
            {busy === d.id ? 'Restoring…' : 'Restore'}
          </button>
        )}
        {blocked && <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{blocked}</span>}
      </div>
    )
  }

  return (
    <>
      <TradeFlags
        title="News Events"
        subtitle="The economic calendar the news-trading and gambling scanners time their restricted windows against."
        searchPlaceholder="Search events (CPI, FOMC…)"
        fetcher={fetcher}
        columns={columns}
        detailFetcher={fetchNewsEventDetail}
        // the row's `id` is the UUID the detail route takes, which is also what
        // TradeFlags keys its cache on — so the default detailIdOf is correct
        detailIdOf={(r) => r.id}
        // a write since the detail was fetched wins over the cached copy
        renderDetail={(d) => <EventDetail d={latest[d.id] || d} actions={actionsFor(latest[d.id] || d)} />}
        emptyText="No events found."
        actions={canEdit && (
          <button onClick={() => setForm({ event: null })} className="accent-btn" style={primaryBtn}>+ Add event</button>
        )}
        banner={message && (
          <Notice tone={message.tone} title={message.title} onClose={() => setMessage(null)}>{message.text}</Notice>
        )}
        filters={[
          { param: 'type', label: 'Type', options: [
            { value: 'release', label: 'Release', color: 'var(--high)', soft: 'var(--high-soft)' },
            { value: 'speech', label: 'Speech', color: 'var(--info)', soft: 'var(--info-soft)' },
          ] },
          { param: 'source', label: 'Source', options: [
            { value: 'manual', label: 'Manual' },
            { value: 'forexfactory', label: 'Forex Factory' },
          ] },
          { param: 'include_deleted', label: 'Deleted', options: [{ value: 'true', label: 'Show deleted', color: 'var(--crit)', soft: 'var(--crit-soft)' }] },
          { param: 'ordering', label: 'Order', options: [{ value: 'event_date', label: 'Oldest first' }] },
          { param: 'currency', label: 'Currency', type: 'text', placeholder: 'EUR', upper: true, width: 80 },
          { param: 'speaker', label: 'Speaker', type: 'text', placeholder: 'Lagarde', width: 110 },
          { param: 'from', label: 'From', type: 'text', placeholder: 'YYYY-MM-DD', width: 105 },
          { param: 'to', label: 'To', type: 'text', placeholder: 'YYYY-MM-DD', width: 105 },
          { param: 'created_by', label: 'Added by', type: 'text', placeholder: 'email', width: 140 },
        ]}
      />
      {form && <NewsEventForm event={form.event} onClose={() => setForm(null)} onSaved={saved} onForbidden={forbidden} />}
      {historyOf && <NewsEventHistory event={historyOf} onClose={() => setHistoryOf(null)} />}
    </>
  )
}
