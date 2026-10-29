import { useEffect, useState } from 'react'
import { ApiError, createNewsEvent, fetchNewsEventDefaults, fetchNewsEventHistory, updateNewsEvent } from '../api.js'
import { fmtDate } from '../data.js'
import {
  CURRENCIES, EMPTY_EVENT, EXCLUDED_SPEECH_WARNING, GMT_OFFSETS,
  fromNewsEvent, isExcludedSpeech, newsEventChanges, toNewsEventBody, validateNewsEvent,
} from '../newsEventForm.js'
import { Pill } from './ScanFields.jsx'
import { Modal, Notice } from './ReviewBits.jsx'
import { primaryBtn, smallBtn } from './buttonStyles.js'

// Add / edit a news event (§3.8). Rules and body building live in
// newsEventForm.js; this is the form around them.
//
// Client checks run first so a typo never costs a round-trip; the server's
// 400 { field: [msg] } is then shown under the same fields, and a 403 (no
// editor rights) is handed back to the screen so it can hide the write actions.

const input = {
  font: 'inherit', fontSize: 12.5, color: 'var(--text)', background: 'var(--inset)', border: '1px solid var(--border)',
  borderRadius: 7, padding: '7px 10px', outline: 'none', width: '100%', boxSizing: 'border-box',
}

function Row({ label, required, error, hint, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)' }}>
        {label}{required && <span style={{ color: 'var(--crit)' }}> *</span>}
      </span>
      {children}
      {hint && !error && <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{hint}</span>}
      {(error || []).map((m) => <span key={m} style={{ fontSize: 11, color: 'var(--crit)' }}>{m}</span>)}
    </label>
  )
}

export default function NewsEventForm({ event, onClose, onSaved, onForbidden }) {
  const editing = !!event
  const [values, setValues] = useState(() => (editing ? fromNewsEvent(event) : { ...EMPTY_EVENT }))
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [saving, setSaving] = useState(false)
  // The offset is pre-filled from the date until the reviewer picks one.
  const [offsetTouched, setOffsetTouched] = useState(editing)

  const set = (k, v) => {
    setValues((s) => ({ ...s, [k]: v }))
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e))
  }

  // GET /news-events/defaults/?date= — the GMT offset of that date's season.
  useEffect(() => {
    if (offsetTouched || !/^\d{4}-\d{2}-\d{2}$/.test(values.event_date)) return undefined
    let alive = true
    fetchNewsEventDefaults(values.event_date)
      .then((d) => { if (alive && d?.gmt_offset) setValues((s) => ({ ...s, gmt_offset: d.gmt_offset })) })
      .catch(() => { /* leave it blank: the server fills it from the date on save */ })
    return () => { alive = false }
  }, [values.event_date, offsetTouched])

  const toggleCurrency = (c) => set('currency', values.currency.includes(c) ? values.currency.filter((x) => x !== c) : [...values.currency, c])

  const submit = async (e) => {
    e.preventDefault()
    setServerError(null)
    const errs = validateNewsEvent(values)
    setErrors(errs)
    if (Object.keys(errs).length) return

    let request
    if (editing) {
      const changes = newsEventChanges(event, values)
      if (!Object.keys(changes).length) { onClose(); return }
      request = updateNewsEvent(event.id, changes)
    } else {
      request = createNewsEvent(toNewsEventBody(values))
    }

    setSaving(true)
    try {
      const res = await request
      onSaved(res.event, res.warnings || [], editing ? 'updated' : 'created')
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) { onForbidden(err.message); return }
      const fieldErrors = err instanceof ApiError ? err.fieldErrors : {}
      if (Object.keys(fieldErrors).length) setErrors(fieldErrors)
      // A 400 with only `detail` (deleted event, refused write) or anything else.
      if (!Object.keys(fieldErrors).length || (err.body?.detail && !err.body?.field)) setServerError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const speech = values.type === 'speech'

  return (
    <Modal title={editing ? `Edit ${event.type}` : 'Add news event'} onClose={onClose}>
      <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {serverError && <Notice tone="crit" title="Not saved.">{serverError}</Notice>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <Row label="Type" error={errors.type} hint={editing ? 'The type cannot change — delete and add a new event.' : 'A release has no live start or end.'}>
            <div style={{ display: 'flex', gap: 6 }}>
              {['speech', 'release'].map((t) => (
                <button key={t} type="button" disabled={editing} onClick={() => set('type', t)} style={{ ...smallBtn, flex: 1, padding: '7px 10px', opacity: editing && values.type !== t ? 0.45 : 1, ...(values.type === t ? { borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--accent-soft)' } : null) }}>
                  {t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Event date" required error={errors.event_date}>
            <input type="date" value={values.event_date} onChange={(e) => set('event_date', e.target.value)} style={input} />
          </Row>
          <Row label="GMT offset" error={errors.gmt_offset} hint="Server time; pre-filled from the date.">
            <select value={values.gmt_offset} onChange={(e) => { setOffsetTouched(true); set('gmt_offset', e.target.value) }} style={input}>
              <option value="">From the date</option>
              {GMT_OFFSETS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Row>
        </div>

        <Row label="Event name" required error={errors.event_name}>
          <input value={values.event_name} maxLength={300} onChange={(e) => set('event_name', e.target.value)} placeholder="ECB President Lagarde Speaks" style={input} />
        </Row>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <Row label="Speaker" error={errors.speaker}>
            <input value={values.speaker || ''} maxLength={200} onChange={(e) => set('speaker', e.target.value)} style={input} />
          </Row>
          <Row label="Currency" required error={errors.currency}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {CURRENCIES.map((c) => {
                const on = values.currency.includes(c)
                return (
                  <button key={c} type="button" aria-pressed={on} onClick={() => toggleCurrency(c)} style={{ ...smallBtn, fontFamily: "'Geist Mono',monospace", ...(on ? { borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--accent-soft)' } : null) }}>{c}</button>
                )
              })}
            </div>
          </Row>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          <Row label="Scheduled start" required error={errors.start_time} hint="HH:MM or HH:MM:SS">
            <input value={values.start_time} onChange={(e) => set('start_time', e.target.value)} placeholder="15:30" style={{ ...input, fontFamily: "'Geist Mono',monospace" }} />
          </Row>
          {speech && (<>
            <Row label="Live start" error={errors.live_start_time} hint="When the speaker actually started">
              <input value={values.live_start_time} onChange={(e) => set('live_start_time', e.target.value)} placeholder="15:32" style={{ ...input, fontFamily: "'Geist Mono',monospace" }} />
            </Row>
            <Row label="End" error={errors.end_time} hint="After the live start, same date">
              <input value={values.end_time} onChange={(e) => set('end_time', e.target.value)} placeholder="16:10" style={{ ...input, fontFamily: "'Geist Mono',monospace" }} />
            </Row>
          </>)}
        </div>

        {speech && isExcludedSpeech(values) && <Notice tone="high">{EXCLUDED_SPEECH_WARNING}</Notice>}

        <Row label="Source URL" error={errors.source_url}>
          <input type="url" value={values.source_url || ''} onChange={(e) => set('source_url', e.target.value)} placeholder="https://…" style={input} />
        </Row>
        <Row label="Notes" error={errors.notes}>
          <textarea value={values.notes || ''} onChange={(e) => set('notes', e.target.value)} rows={3} style={{ ...input, resize: 'vertical' }} />
        </Row>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} className="ghost-btn" style={{ ...smallBtn, padding: '7px 14px' }}>Cancel</button>
          <button type="submit" disabled={saving} className="accent-btn" style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add event'}</button>
        </div>
      </form>
    </Modal>
  )
}

// Audit fields change on every write; the diff shows what the reviewer changed.
const NOISE = new Set(['updated_at', 'updated_by', 'synced_at', 'created_at', 'created_by', 'id'])
const show = (v) => (v === null || v === undefined || v === '' ? '—' : String(v))

// GET /news-events/<id>/history/ — oldest first; each entry diffs old_row → new_row.
export function NewsEventHistory({ event, onClose }) {
  const [state, setState] = useState({ loading: true })

  useEffect(() => {
    let alive = true
    fetchNewsEventHistory(event.id)
      .then((d) => { if (alive) setState({ data: d }) })
      .catch((e) => { if (alive) setState({ error: e }) })
    return () => { alive = false }
  }, [event.id])

  const history = state.data?.history || []

  return (
    <Modal title={`History · ${event.event_name || event.id}`} onClose={onClose} width={720}>
      {state.loading && <div className="skeleton" style={{ height: 120, borderRadius: 9 }} />}
      {state.error && <Notice tone="crit">{state.error.message}</Notice>}
      {state.data && history.length === 0 && <div style={{ color: 'var(--text-3)', fontSize: 12.5 }}>No history recorded.</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {history.map((h, i) => {
          const before = h.old_row || {}
          const after = h.new_row || {}
          const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])]
            .filter((k) => !NOISE.has(k) && show(before[k]) !== show(after[k]))
          return (
            <div key={h.id ?? i} style={{ border: '1px solid var(--border)', borderRadius: 9, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
                <Pill tone={h.action === 'delete' ? 'crit' : h.action === 'insert' ? 'ok' : 'info'}>{String(h.action).toUpperCase()}</Pill>
                <span style={{ color: 'var(--text-2)' }}>{h.changed_by || 'unknown'}</span>
                <span style={{ marginLeft: 'auto', color: 'var(--text-3)', fontFamily: "'Geist Mono',monospace" }}>{fmtDate(h.changed_at)}</span>
              </div>
              {h.action === 'insert' ? (
                <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Created.</div>
              ) : keys.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, auto) 1fr', gap: '4px 12px', fontSize: 12 }}>
                  {keys.map((k) => (
                    <div key={k} style={{ display: 'contents' }}>
                      <span style={{ color: 'var(--text-3)' }}>{k}</span>
                      <span style={{ fontFamily: "'Geist Mono',monospace", overflowWrap: 'anywhere' }}>
                        <span style={{ color: 'var(--crit)', textDecoration: 'line-through' }}>{show(before[k])}</span>
                        {' → '}
                        <span style={{ color: 'var(--ok)' }}>{show(after[k])}</span>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>No field changes.</div>
              )}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
