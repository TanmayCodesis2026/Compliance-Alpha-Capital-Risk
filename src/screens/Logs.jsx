import { useState, useEffect, useCallback } from 'react'
import { fetchLogs } from '../api.js'
import { fmtDate } from '../data.js'

const levelStyle = (lvl) => {
  const up = (lvl || '').toUpperCase()
  if (up === 'ERROR' || up === 'CRITICAL') return { color: 'var(--crit)', bg: 'var(--crit-soft)' }
  if (up === 'WARNING' || up === 'WARN') return { color: 'var(--high)', bg: 'var(--high-soft)' }
  if (up === 'INFO') return { color: 'var(--info)', bg: 'var(--info-soft)' }
  return { color: 'var(--text-3)', bg: 'var(--inset)' }
}

const statusColor = (code) => {
  if (code >= 500) return 'var(--crit)'
  if (code >= 400) return 'var(--high)'
  if (code >= 200 && code < 300) return 'var(--ok)'
  return 'var(--text-2)'
}

export default function Logs() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    let alive = true
    setLoading(true)
    fetchLogs()
      .then((d) => { if (alive) { setData(d); setError(null) } })
      .catch((e) => { if (alive) { setError(e.message); setData(null) } })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  useEffect(() => load(), [load])

  const logs = data?.logs || []

  return (
    <section style={{ padding: '24px 30px 46px', maxWidth: 1380, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>System &amp; Logs</h1>
          <div style={{ color: 'var(--text-2)', fontSize: 13 }}>Most recent request log records from the risk engine. <span style={{ fontFamily: "'Geist Mono',monospace", color: 'var(--text-3)' }}>{data?.count ?? 0}</span> shown.</div>
        </div>
        <button className="ghost-btn" onClick={load} style={{ font: 'inherit', fontWeight: 600, fontSize: 12.5, color: 'var(--text)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}>↻ Refresh</button>
      </div>

      {error && (
        <div style={{ marginBottom: 14, padding: '12px 14px', background: 'var(--crit-soft)', border: '1px solid color-mix(in srgb,var(--crit) 25%,transparent)', borderRadius: 9, fontSize: 12.5, color: 'var(--text)' }}>
          <b>Couldn’t load logs.</b> <span style={{ color: 'var(--text-2)' }}>{error}</span>
        </div>
      )}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 1000, fontSize: 12 }}>
            <div style={{ display: 'flex', color: 'var(--text-3)', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, background: 'var(--surface-2)' }}>
              <div style={{ flex: '0 0 150px', padding: 11 }}>Time</div>
              <div style={{ flex: '0 0 90px', padding: 11 }}>Level</div>
              <div style={{ flex: '0 0 60px', padding: 11 }}>Method</div>
              <div style={{ flex: '1 1 280px', padding: 11 }}>Message</div>
              <div style={{ flex: '0 0 70px', padding: 11, textAlign: 'right' }}>Status</div>
              <div style={{ flex: '0 0 90px', padding: 11, textAlign: 'right' }}>Duration</div>
            </div>

            {loading && Array.from({ length: 12 }).map((_, i) => (
              <div key={'sk' + i} style={{ display: 'flex', borderTop: '1px solid var(--hair)' }}>
                {[150, 90, 60, 280, 70, 90].map((w, j) => (
                  <div key={j} style={{ flex: (j === 3 ? '1 1 ' : '0 0 ') + w + 'px', padding: '11px' }}><div className="skeleton" style={{ height: 12, width: '70%' }} /></div>
                ))}
              </div>
            ))}

            {!loading && logs.map((l, i) => {
              const ls = levelStyle(l.level)
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', borderTop: '1px solid var(--hair)' }}>
                  <div style={{ flex: '0 0 150px', padding: '11px', fontFamily: "'Geist Mono',monospace", color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{fmtDate(l.created_at)}</div>
                  <div style={{ flex: '0 0 90px', padding: '11px' }}><span style={{ fontSize: 10, fontWeight: 700, color: ls.color, background: ls.bg, padding: '2px 8px', borderRadius: 5 }}>{l.level}</span></div>
                  <div style={{ flex: '0 0 60px', padding: '11px', fontFamily: "'Geist Mono',monospace", color: 'var(--text-2)' }}>{l.method || '—'}</div>
                  <div style={{ flex: '1 1 280px', padding: '11px', fontFamily: "'Geist Mono',monospace", color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={l.message}>{l.message}</div>
                  <div style={{ flex: '0 0 70px', padding: '11px', textAlign: 'right', fontFamily: "'Geist Mono',monospace", fontWeight: 600, color: statusColor(l.status_code) }}>{l.status_code ?? '—'}</div>
                  <div style={{ flex: '0 0 90px', padding: '11px', textAlign: 'right', fontFamily: "'Geist Mono',monospace", color: 'var(--text-3)' }}>{l.duration_ms != null ? l.duration_ms + 'ms' : '—'}</div>
                </div>
              )
            })}
          </div>
        </div>
        {!loading && logs.length === 0 && !error && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No log records.</div>
        )}
      </div>
    </section>
  )
}
