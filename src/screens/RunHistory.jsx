export default function RunHistory({ navGo, histCells, histDetail, histStages, histFailed }) {
  const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, boxShadow: 'var(--shadow)' }
  const kpiLabel = { fontSize: 10, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 11 }
  const dows = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <section style={{ padding: '24px 30px 46px', maxWidth: 1380, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Run History</h1>
          <div style={{ color: 'var(--text-2)', fontSize: 13 }}>Detection job <span style={{ fontFamily: "'Geist Mono',monospace", color: 'var(--text)' }}>AF-DETECT-RTGT</span> · scheduled daily at <span style={{ fontFamily: "'Geist Mono',monospace" }}>02:00 UTC</span>. The script flags — it never acts.</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', overflow: 'hidden' }}>
            <span style={{ padding: '7px 10px', color: 'var(--text-3)', cursor: 'default', borderRight: '1px solid var(--border)' }}>‹</span>
            <span style={{ padding: '7px 14px', fontFamily: "'Geist Mono',monospace", fontSize: 12.5, fontWeight: 500 }}>June 2026</span>
            <span style={{ padding: '7px 10px', color: 'var(--text-3)', cursor: 'default', borderLeft: '1px solid var(--border)' }}>›</span>
          </div>
          <button className="run-btn" style={{ font: 'inherit', fontWeight: 600, fontSize: 12.5, color: 'var(--accent-fg)', background: 'var(--accent)', border: 'none', borderRadius: 8, padding: '8px 15px', cursor: 'pointer' }}>Run now</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 18 }}>
        <div style={card}>
          <div style={kpiLabel}>Last run</div>
          <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 9 }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--ok)' }} />Success</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 7 }}>Jun 18 · 02:00 · 14m 12s</div>
        </div>
        <div style={card}>
          <div style={kpiLabel}>Success rate · 30d</div>
          <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.035em', fontFamily: "'Geist Mono',monospace" }}>96.7<span style={{ fontSize: 16, color: 'var(--text-3)' }}>%</span></div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 7 }}>29 of 30 runs clean</div>
        </div>
        <div style={card}>
          <div style={kpiLabel}>Avg runtime</div>
          <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.035em', fontFamily: "'Geist Mono',monospace" }}>13:48</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 7 }}>02:00 → ~02:14 UTC</div>
        </div>
        <div style={card}>
          <div style={kpiLabel}>Flags raised · June</div>
          <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.035em', fontFamily: "'Geist Mono',monospace" }}>312</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 7 }}>routed to compliance</div>
        </div>
        <div style={card}>
          <div style={kpiLabel}>Next run</div>
          <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: '-0.02em', fontFamily: "'Geist Mono',monospace" }}>Jun 19 · 02:00</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 7 }}>scheduled · in ~7h</div>
        </div>
      </div>

      {/* calendar + detail */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 376px', gap: 16, alignItems: 'start' }}>

        {/* calendar */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Daily run calendar</div>
            <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--text-2)' }}>
              {[['Success', 'var(--ok)'], ['Partial', 'var(--high)'], ['Failed', 'var(--crit)'], ['Scheduled', 'var(--border-strong)']].map(([l, c]) => (
                <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />{l}</span>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6, marginBottom: 6 }}>
            {dows.map((d) => (
              <div key={d} style={{ textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--text-3)', textTransform: 'uppercase', paddingLeft: 2 }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
            {histCells.map((c, i) => (
              <button key={i} className="cal-cell" onClick={c.onClick} style={{ textAlign: 'left', font: 'inherit', cursor: c.cursor, pointerEvents: c.pe, border: '1px ' + c.borderStyle + ' ' + c.borderColor, background: c.bg, borderRadius: 10, padding: '8px 9px', minHeight: 82, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'auto' }}>
                  <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 11, fontWeight: 600, color: c.dayColor }}>{c.day}</span>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.dotColor }} />
                </div>
                <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: 19, fontWeight: 600, color: c.flagsColor, lineHeight: 1 }}>{c.flags}</div>
                <div style={{ fontSize: 9.5, color: c.subColor, marginTop: 3 }}>{c.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* run detail */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--hair)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "'Geist Mono',monospace", fontWeight: 600, fontSize: 14 }}>{histDetail.id}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 3 }}>{histDetail.date} · {histDetail.window}</div>
            </div>
            <span style={{ flex: 'none', fontSize: 10, fontWeight: 700, letterSpacing: '0.03em', color: histDetail.statusColor, background: histDetail.statusSoft, padding: '3px 9px', borderRadius: 6, textTransform: 'uppercase' }}>{histDetail.statusLabel}</span>
          </div>
          <div style={{ padding: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              {[
                ['Accounts scanned', histDetail.accounts],
                ['Trades processed', histDetail.trades],
                ['Candidate pairs', histDetail.clusters],
                ['Flags raised', histDetail.flags],
              ].map(([label, val]) => (
                <div key={label} style={{ border: '1px solid var(--border)', borderRadius: 9, padding: '10px 12px' }}><div style={{ fontSize: 9.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</div><div style={{ fontFamily: "'Geist Mono',monospace", fontSize: 16, fontWeight: 600, marginTop: 4 }}>{val}</div></div>
              ))}
            </div>

            {histDetail.showSev && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <div style={{ flex: 1, textAlign: 'center', background: 'var(--crit-soft)', borderRadius: 8, padding: 8 }}><div style={{ fontFamily: "'Geist Mono',monospace", fontSize: 15, fontWeight: 600, color: 'var(--crit)' }}>{histDetail.sevC}</div><div style={{ fontSize: 9.5, color: 'var(--text-2)', marginTop: 1 }}>Critical</div></div>
                <div style={{ flex: 1, textAlign: 'center', background: 'var(--high-soft)', borderRadius: 8, padding: 8 }}><div style={{ fontFamily: "'Geist Mono',monospace", fontSize: 15, fontWeight: 600, color: 'var(--high)' }}>{histDetail.sevH}</div><div style={{ fontSize: 9.5, color: 'var(--text-2)', marginTop: 1 }}>High</div></div>
                <div style={{ flex: 1, textAlign: 'center', background: 'var(--med-soft)', borderRadius: 8, padding: 8 }}><div style={{ fontFamily: "'Geist Mono',monospace", fontSize: 15, fontWeight: 600, color: 'var(--med)' }}>{histDetail.sevM}</div><div style={{ fontSize: 9.5, color: 'var(--text-2)', marginTop: 1 }}>Medium</div></div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginTop: 12, color: 'var(--text-2)' }}><span>Suppressed (false positives)</span><span style={{ fontFamily: "'Geist Mono',monospace" }}>{histDetail.suppressed}</span></div>

            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)', margin: '18px 0 2px' }}>Pipeline</div>
            <div>
              {histStages.map((st, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 0', borderTop: '1px solid var(--hair)' }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: st.dot, color: '#fff', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{st.mark}</span>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 500 }}>{st.name}</div><div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 1 }}>{st.meta}</div></div>
                  <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: 11, color: st.durColor, whiteSpace: 'nowrap' }}>{st.dur}</div>
                </div>
              ))}
            </div>

            {histFailed && (
              <div style={{ marginTop: 13, padding: '11px 12px', background: 'var(--crit-soft)', border: '1px solid color-mix(in srgb,var(--crit) 22%,transparent)', borderRadius: 9, fontSize: 11.5, color: 'var(--text-2)' }}><b style={{ color: 'var(--text)' }}>Run aborted.</b> Market-data feed timeout on the NQ shard during ingest. Auto-retried at 02:30 UTC and succeeded; no flags were lost — trades re-processed in the retry.</div>
            )}

            <button className="ghost-btn" onClick={navGo.queue} style={{ width: '100%', marginTop: 14, font: 'inherit', fontWeight: 600, fontSize: 12.5, color: 'var(--text)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 9, cursor: 'pointer' }}>View flags from this run →</button>
          </div>
        </div>
      </div>
    </section>
  )
}
