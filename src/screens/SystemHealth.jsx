import { useEffect, useState } from 'react'
import TradeFlags from './TradeFlags.jsx'
import { fetchHealth, fetchRunLog } from '../api.js'
import { fmtDate, fmtDay } from '../data.js'
import { Pill } from '../components/ScanFields.jsx'
import { Notice } from '../components/ReviewBits.jsx'

// GET /api/health/ + GET /api/run-log/ (§3.9): are the databases and the
// re-check queue up, did the calendar import keep running, did last night's
// detectors finish.
//
// Two staleness calls are judgement, not API fields: a `running` run that
// started over HUNG_HOURS ago is shown as probably hung, and a latest release
// older than STALE_RELEASE_DAYS as the Forex Factory load having stopped.

const HUNG_HOURS = 6
const STALE_RELEASE_DAYS = 4

const hoursSince = (iso) => (iso ? (Date.now() - new Date(iso).getTime()) / 36e5 : null)
const daysSinceDay = (ymd) => (ymd ? (Date.now() - new Date(`${ymd}T00:00:00Z`).getTime()) / 864e5 : null)

const isHung = (r) => r.status === 'running' && hoursSince(r.started_at) > HUNG_HOURS

function RunStatus({ run }) {
  if (isHung(run)) return <Pill tone="crit">RUNNING · HUNG?</Pill>
  const tone = run.status === 'success' ? 'ok' : run.status === 'running' ? 'info' : run.status === 'failed' || run.status === 'error' ? 'crit' : 'neutral'
  return <Pill tone={tone}>{String(run.status || '—').toUpperCase()}</Pill>
}

// { configured?, connected } -> a pill; a store that isn't configured isn't down.
function Connection({ label, value }) {
  if (!value) return null
  const tone = value.configured === false ? 'neutral' : value.connected ? 'ok' : 'crit'
  const text = value.configured === false ? 'NOT CONFIGURED' : value.connected ? 'CONNECTED' : 'DOWN'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
      <span style={{ color: 'var(--text-2)' }}>{label}</span><Pill tone={tone}>{text}</Pill>
    </span>
  )
}

function HealthPanel() {
  const [state, setState] = useState({ loading: true })
  useEffect(() => {
    let alive = true
    fetchHealth()
      .then((d) => { if (alive) setState({ data: d }) })
      .catch((e) => { if (alive) setState({ error: e }) })
    return () => { alive = false }
  }, [])

  if (state.loading) return <div className="skeleton" style={{ height: 120, borderRadius: 12 }} />
  if (state.error) return <Notice tone="crit" title="Couldn’t read the health check.">{state.error.message}</Notice>

  const h = state.data
  const ev = h.news_events || {}
  const releaseAge = daysSinceDay(ev.latest_release_date)
  const detectors = h.nightly_runs?.detectors || []

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow)', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Health</span>
        <Pill tone={h.status === 'ok' ? 'ok' : 'crit'}>{String(h.status || 'unknown').toUpperCase()}</Pill>
        <Connection label="Risk DB" value={h.risk_db} />
        <Connection label="Prod DB" value={h.prod_db} />
        <Connection label="Mongo" value={h.mongo} />
        <Connection label="Re-check queue" value={h.review_queue} />
      </div>

      <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-2)' }}>
        <span>Latest release <b style={{ fontFamily: "'Geist Mono',monospace", color: 'var(--text)' }}>{fmtDay(ev.latest_release_date)}</b></span>
        <span>Latest speech <b style={{ fontFamily: "'Geist Mono',monospace", color: 'var(--text)' }}>{fmtDay(ev.latest_speech_date)}</b></span>
        {Object.entries(ev.by_type || {}).map(([t, v]) => (
          <span key={t}>{t}: <b style={{ fontFamily: "'Geist Mono',monospace", color: 'var(--text)' }}>{v?.count ?? '—'}</b></span>
        ))}
        {h.nightly_runs?.latest_started_at && <span>Last nightly run <b style={{ fontFamily: "'Geist Mono',monospace", color: 'var(--text)' }}>{fmtDate(h.nightly_runs.latest_started_at)}</b></span>}
      </div>
      {releaseAge != null && releaseAge > STALE_RELEASE_DAYS && (
        <Notice tone="high" title="The calendar import may have stopped.">The latest release is {Math.floor(releaseAge)} days old — the Forex Factory load has not added newer events.</Notice>
      )}

      {detectors.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
          {detectors.map((d) => (
            <div key={d.detector} style={{ border: '1px solid var(--border)', borderRadius: 9, padding: '8px 11px', display: 'flex', flexDirection: 'column', gap: 4, background: 'var(--surface-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: "'Geist Mono',monospace", fontWeight: 600, fontSize: 12, flex: 1 }}>{d.detector}</span>
                <RunStatus run={d} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                {fmtDay(d.run_date)} · {d.flags_written ?? '—'} flags{d.has_error ? ' · error logged' : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const columns = [
  { key: 'detector', label: 'Detector', width: 120, mono: true },
  { key: 'run_date', label: 'Run date', width: 120, muted: true, render: (r) => fmtDay(r.run_date) },
  { key: 'status', label: 'Status', width: 140, render: (r) => <RunStatus run={r} /> },
  { key: 'started_at', label: 'Started', width: 130, mono: true, muted: true, render: (r) => fmtDate(r.started_at) },
  { key: 'finished_at', label: 'Finished', width: 130, mono: true, muted: true, render: (r) => fmtDate(r.finished_at) },
  { key: 'duration_sec', label: 'Took', width: 80, mono: true, align: 'right', render: (r) => (r.duration_sec != null ? `${Math.round(r.duration_sec)}s` : '—') },
  { key: 'rows_scanned', label: 'Scanned', width: 90, mono: true, align: 'right', render: (r) => r.rows_scanned ?? '—' },
  { key: 'flags_written', label: 'Flags', width: 80, mono: true, align: 'right', render: (r) => r.flags_written ?? '—' },
  { key: 'sink', label: 'Sink', width: 90, muted: true },
  { key: 'error', label: 'Error', width: 280, muted: true, render: (r) => (r.error ? <span title={r.error} style={{ color: 'var(--crit)' }}>{r.error}</span> : '—') },
]

export default function SystemHealth() {
  return (
    <TradeFlags
      title="System Health"
      subtitle="Database and queue status, the news calendar import, and the nightly detector runs."
      searchPlaceholder="Search runs…"
      fetcher={fetchRunLog}
      columns={columns}
      inlineDetail={(r) => (
        <pre style={{ margin: 0, fontSize: 11.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', color: 'var(--text-2)' }}>{r.error || 'No error recorded.'}</pre>
      )}
      emptyText="No runs logged."
      banner={<HealthPanel />}
      filters={[
        { param: 'detector', label: 'Detector', type: 'text', placeholder: 'RT-1', width: 90 },
        { param: 'status', label: 'Status', options: [
          { value: 'success', label: 'Success', color: 'var(--ok)', soft: 'var(--ok-soft)' },
          { value: 'running', label: 'Running', color: 'var(--info)', soft: 'var(--info-soft)' },
          { value: 'failed', label: 'Failed', color: 'var(--crit)', soft: 'var(--crit-soft)' },
        ] },
        { param: 'run_date', label: 'Run date', type: 'text', placeholder: 'YYYY-MM-DD', width: 110 },
        { param: 'sink', label: 'Sink', type: 'text', placeholder: 'mongo', width: 80 },
      ]}
    />
  )
}
