import AccountLink from '../components/AccountLink.jsx'

export default function Investigation({ navGo, sel, signals, legs = [], graph, onAccountClick, loading, error, empty }) {
  const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, boxShadow: 'var(--shadow)' }

  if (empty) {
    return (
      <section style={{ padding: '24px 30px 46px', maxWidth: 1380, margin: '0 auto', width: '100%' }}>
        <button className="ghost-btn" onClick={navGo.overview} style={{ font: 'inherit', fontSize: 12, color: 'var(--text-2)', background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 11px', cursor: 'pointer' }}>← Dashboard</button>
        <div style={{ marginTop: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No flag selected. Return to <button onClick={navGo.overview} style={{ font: 'inherit', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>the dashboard</button> to start.</div>
      </section>
    )
  }
  if (error) {
    return (
      <section style={{ padding: '24px 30px 46px', maxWidth: 1380, margin: '0 auto', width: '100%' }}>
        <button className="ghost-btn" onClick={navGo.overview} style={{ font: 'inherit', fontSize: 12, color: 'var(--text-2)', background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 11px', cursor: 'pointer' }}>← Dashboard</button>
        <div style={{ marginTop: 20, padding: '12px 14px', background: 'var(--crit-soft)', border: '1px solid color-mix(in srgb,var(--crit) 25%,transparent)', borderRadius: 9, fontSize: 12.5, color: 'var(--text)' }}><b>Couldn’t load flag.</b> <span style={{ color: 'var(--text-2)' }}>{error}</span></div>
      </section>
    )
  }
  if (loading || !sel) {
    return (
      <section style={{ padding: '24px 30px 46px', maxWidth: 1380, margin: '0 auto', width: '100%' }}>
        <button className="ghost-btn" onClick={navGo.overview} style={{ font: 'inherit', fontSize: 12, color: 'var(--text-2)', background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 11px', cursor: 'pointer' }}>← Dashboard</button>
        <div style={{ marginTop: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>Loading flag…</div>
      </section>
    )
  }

  return (
    <section style={{ padding: '24px 30px 46px', maxWidth: 1380, margin: '0 auto', width: '100%' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 6 }}>
        <button className="ghost-btn" onClick={navGo.overview} style={{ font: 'inherit', fontSize: 12, color: 'var(--text-2)', background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 11px', cursor: 'pointer', whiteSpace: 'nowrap' }}>← Dashboard</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, letterSpacing: '-0.02em', fontFamily: "'Geist Mono',monospace" }}>{sel.id}</h1>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', color: '#fff', background: sel.sevColor, padding: '4px 10px', borderRadius: 20 }}>{sel.sevLabel}</span>
            <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 11, fontWeight: 600, color: sel.sevColor, background: sel.sevSoft, padding: '3px 9px', borderRadius: 6 }}>{sel.type}</span>
          </div>
          <div style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 6 }}>{sel.headline}</div>
        </div>
      </div>

      <div className="grid-main" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14, alignItems: 'start', marginTop: 18 }}>

        {/* LEFT: evidence */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>

          {/* flag summary */}
          <div style={card}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Flag summary</div>
            <div className="grid-4up" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
              <div style={{ background: 'var(--inset)', borderRadius: 8, padding: 11 }}><div style={{ fontSize: 9.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Instruments</div><div style={{ fontFamily: "'Geist Mono',monospace", fontWeight: 700, fontSize: 15, marginTop: 4 }}>{sel.instruments || '—'}</div></div>
              <div style={{ background: 'var(--inset)', borderRadius: 8, padding: 11 }}><div style={{ fontSize: 9.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}># Users</div><div style={{ fontFamily: "'Geist Mono',monospace", fontWeight: 700, fontSize: 15, marginTop: 4 }}>{sel.numUsers ?? '—'}</div></div>
              <div style={{ background: 'var(--inset)', borderRadius: 8, padding: 11 }}><div style={{ fontSize: 9.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Direction</div><div style={{ fontFamily: "'Geist Mono',monospace", fontWeight: 700, fontSize: 15, marginTop: 4 }}>{sel.direction || '—'}</div></div>
              <div style={{ background: 'var(--crit-soft)', border: '1px solid color-mix(in srgb,var(--crit) 25%,transparent)', borderRadius: 8, padding: 11 }}><div style={{ fontSize: 9.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Recurrence</div><div style={{ fontFamily: "'Geist Mono',monospace", fontWeight: 700, fontSize: 15, marginTop: 4, color: 'var(--crit)' }}>{sel.recurrence ?? '—'}</div></div>
            </div>
            <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--text-2)' }}>Users: <span style={{ fontFamily: "'Geist Mono',monospace" }}>{sel.users || '—'}</span></div>

            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)', margin: '18px 0 9px' }}>Constituent accounts</div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 9, overflow: 'hidden' }}>
              <div style={{ display: 'flex', color: 'var(--text-3)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, background: 'var(--inset)' }}>
                <div style={{ flex: '0 0 44px', padding: '8px 12px' }}>ID</div>
                <div style={{ flex: '0 0 90px', padding: '8px 12px' }}>User</div>
                <div style={{ flex: '1 1 160px', padding: '8px 12px' }}>Account</div>
                <div style={{ flex: '0 0 100px', padding: '8px 12px' }}>Platform</div>
                <div style={{ flex: '0 0 80px', padding: '8px 12px' }}>Instr.</div>
                <div style={{ flex: '0 0 96px', padding: '8px 12px', textAlign: 'right' }}>Created</div>
              </div>
              {legs.length === 0 && (
                <div style={{ padding: '12px', fontSize: 11.5, color: 'var(--text-3)', borderTop: '1px solid var(--hair)' }}>No constituent accounts returned.</div>
              )}
              {legs.map((leg, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', borderTop: '1px solid var(--hair)', fontSize: 11.5 }}>
                  <div style={{ flex: '0 0 44px', padding: '9px 12px', fontFamily: "'Geist Mono',monospace", color: 'var(--text-3)' }}>{leg.acctId}</div>
                  <div style={{ flex: '0 0 90px', padding: '9px 12px', fontFamily: "'Geist Mono',monospace", fontWeight: 600 }}>{leg.user}</div>
                  <div style={{ flex: '1 1 160px', padding: '9px 12px' }}>{leg.account && leg.account !== '—' ? <AccountLink name={leg.account} onAccountClick={onAccountClick} /> : <span style={{ fontFamily: "'Geist Mono',monospace", color: 'var(--text-2)' }}>{leg.account}</span>}</div>
                  <div style={{ flex: '0 0 100px', padding: '9px 12px', color: 'var(--text-2)' }}>{leg.platform}</div>
                  <div style={{ flex: '0 0 80px', padding: '9px 12px', fontFamily: "'Geist Mono',monospace" }}>{leg.instr}</div>
                  <div style={{ flex: '0 0 96px', padding: '9px 12px', textAlign: 'right', fontFamily: "'Geist Mono',monospace", color: 'var(--text-3)' }}>{leg.created}</div>
                </div>
              ))}
            </div>
          </div>

          {/* signals checklist */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 18px 12px' }}><div style={{ fontWeight: 600, fontSize: 14 }}>Detection signals · {signals.length}</div><div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>No single signal is conclusive — the case is built across signals and recurrence.</div></div>
            <div>
              {signals.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 13, padding: '11px 18px', borderTop: '1px solid var(--hair)' }}>
                  <span style={{ width: 20, height: 20, borderRadius: '50%', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', background: s.dot, marginTop: 1 }}>{s.mark}</span>
                  <div style={{ flex: 'none', width: 18, fontFamily: "'Geist Mono',monospace", fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginTop: 3 }}>{s.n}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontWeight: 500, fontSize: 12.5 }}>{s.name}</span><span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 10, color: 'var(--text-3)' }}>{s.code}</span></div>
                    {s.pairs.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
                        {s.pairs.map((p, j) => (
                          <span key={j} style={{ fontFamily: "'Geist Mono',monospace", fontSize: 10, color: 'var(--text-2)', background: 'var(--inset)', border: '1px solid var(--border)', padding: '1px 6px', borderRadius: 4 }}>{p.k}: <b style={{ color: 'var(--text)' }}>{p.v}</b></span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: 9.5, color: 'var(--text-3)', textAlign: 'right', whiteSpace: 'nowrap', marginTop: 3 }}>#{s.signalId}</div>
                </div>
              ))}
            </div>
          </div>

          {/* recurrence */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}><div style={{ fontWeight: 600, fontSize: 14 }}>Cross-instrument recurrence</div><div style={{ fontFamily: "'Geist Mono',monospace", fontWeight: 700, fontSize: 18, color: 'var(--crit)' }}>{sel.recurrence ?? '—'}</div></div>
            <div style={{ fontSize: 11.5, color: 'var(--text-2)' }}>Counted at the user-pair level across all instruments — rotation cannot dilute the count. This pair has been flagged <b style={{ color: 'var(--text)' }}>{sel.recurrence ?? '—'}</b> time{sel.recurrence === 1 ? '' : 's'} on {sel.instruments || 'these instruments'}.</div>
          </div>

          {/* flag metadata (trade_ids, timestamps, ids) */}
          <div style={card}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 13 }}>Metadata</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><span style={{ color: 'var(--text-2)' }}>Internal ID</span><span style={{ fontFamily: "'Geist Mono',monospace" }}>#{sel.pk} · {sel.typeDisplay || sel.type}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><span style={{ color: 'var(--text-2)' }}>Created</span><span style={{ fontFamily: "'Geist Mono',monospace", color: 'var(--text-2)' }}>{sel.created}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><span style={{ color: 'var(--text-2)' }}>Updated</span><span style={{ fontFamily: "'Geist Mono',monospace", color: 'var(--text-2)' }}>{sel.updated}</span></div>
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)', margin: '14px 0 7px' }}>Trade IDs · {sel.tradeIds.length}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {sel.tradeIds.length === 0 && <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>None.</span>}
              {sel.tradeIds.map((t) => (
                <span key={t} style={{ fontFamily: "'Geist Mono',monospace", fontSize: 10.5, color: 'var(--text-2)', background: 'var(--inset)', border: '1px solid var(--border)', padding: '4px 8px', borderRadius: 6, wordBreak: 'break-all' }}>{t}</span>
              ))}
            </div>
          </div>

          {/* linked emails (RT + GT) — only when present */}
          {sel.userEmails && sel.userEmails.length > 0 && (
            <div style={card}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 13 }}>Linked emails</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sel.userEmails.map((u, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
                    <span style={{ fontFamily: "'Geist Mono',monospace", color: 'var(--text-3)' }}>{u.user_id}</span>
                    <span style={{ fontFamily: "'Geist Mono',monospace", color: 'var(--text)' }}>{u.email}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* occurrences (RT) — only when present */}
          {sel.occurrences && sel.occurrences.length > 0 && (
            <div style={card}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>Prior occurrences · {sel.occurrences.length}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 12 }}>Same subject pair flagged on earlier sessions.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sel.occurrences.map((o, i) => (
                  <div key={o.id ?? i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '9px 11px', background: 'var(--inset)', borderRadius: 8, fontSize: 12 }}>
                    <span style={{ fontFamily: "'Geist Mono',monospace", fontWeight: 600 }}>{o.flag_type}</span>
                    <span style={{ color: 'var(--text-2)' }}>{o.occurred_on}</span>
                    {o.hedge_ratio != null && <span style={{ fontFamily: "'Geist Mono',monospace", color: 'var(--text-3)' }}>hedge {o.hedge_ratio}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* live trades (GT) — only when present */}
          {sel.trades && sel.trades.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 18px 12px' }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Constituent trades · {sel.trades.length}</div>
                {sel.tradesNote && <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>{sel.tradesNote}</div>}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <div style={{ minWidth: 720, fontSize: 11.5 }}>
                  <div style={{ display: 'flex', color: 'var(--text-3)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, background: 'var(--surface-2)' }}>
                    <div style={{ flex: '0 0 90px', padding: '8px 12px' }}>Account</div>
                    <div style={{ flex: '0 0 70px', padding: '8px 12px' }}>Instr.</div>
                    <div style={{ flex: '0 0 80px', padding: '8px 12px' }}>Direction</div>
                    <div style={{ flex: '0 0 64px', padding: '8px 12px' }}>Qty</div>
                    <div style={{ flex: '0 0 90px', padding: '8px 12px' }}>Entry</div>
                    <div style={{ flex: '0 0 90px', padding: '8px 12px' }}>Duration</div>
                    <div style={{ flex: '1 1 90px', padding: '8px 12px', textAlign: 'right' }}>P/L</div>
                  </div>
                  {sel.trades.map((t, i) => {
                    const pnl = Number(t.pnl)
                    const pnlColor = isNaN(pnl) ? 'var(--text-2)' : pnl < 0 ? 'var(--crit)' : 'var(--ok)'
                    const isLong = String(t.direction || '').toLowerCase().includes('long')
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', borderTop: '1px solid var(--hair)' }}>
                        <div style={{ flex: '0 0 90px', padding: '9px 12px', fontFamily: "'Geist Mono',monospace", color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.account_name}>{t.account_name}</div>
                        <div style={{ flex: '0 0 70px', padding: '9px 12px', fontFamily: "'Geist Mono',monospace" }}>{t.instrument}</div>
                        <div style={{ flex: '0 0 80px', padding: '9px 12px' }}><span style={{ fontSize: 10, fontWeight: 600, color: isLong ? 'var(--info)' : 'var(--high)', background: isLong ? 'var(--info-soft)' : 'var(--high-soft)', padding: '2px 7px', borderRadius: 5 }}>{t.direction}</span></div>
                        <div style={{ flex: '0 0 64px', padding: '9px 12px', fontFamily: "'Geist Mono',monospace" }}>{t.contracts}</div>
                        <div style={{ flex: '0 0 90px', padding: '9px 12px', fontFamily: "'Geist Mono',monospace", color: 'var(--text-2)' }}>{t.entry_price}</div>
                        <div style={{ flex: '0 0 90px', padding: '9px 12px', fontFamily: "'Geist Mono',monospace", color: 'var(--text-2)' }}>{t.duration_min != null ? Number(t.duration_min).toFixed(1) + 'm' : '—'}</div>
                        <div style={{ flex: '1 1 90px', padding: '9px 12px', textAlign: 'right', fontFamily: "'Geist Mono',monospace", fontWeight: 600, color: pnlColor }}>{isNaN(pnl) ? '—' : (pnl < 0 ? '−$' : '$') + Math.abs(pnl).toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: context */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>

          {/* network — real users → accounts graph from the flag detail */}
          <div style={card}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>Linked accounts</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 8 }}>Users in this flag and the accounts they traded through.</div>
            {graph ? (
              <svg viewBox={`0 0 ${graph.W} ${graph.H}`} style={{ width: '100%', height: 'auto', display: 'block', fontFamily: "'Geist Mono',monospace" }}>
                {/* user-to-account edges */}
                {graph.edges.map((e, i) => (
                  <line key={'e' + i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="var(--border-strong)" strokeWidth="1.5" />
                ))}
                {/* flagged-pair edge */}
                {graph.pairEdge && (
                  <>
                    <line x1={graph.pairEdge.x1} y1={graph.pairEdge.y1} x2={graph.pairEdge.x2} y2={graph.pairEdge.y2} stroke="var(--info)" strokeWidth="2" strokeDasharray="5 4" />
                    <text x={(graph.pairEdge.x1 + graph.pairEdge.x2) / 2} y={graph.pairEdge.y1 - 12} textAnchor="middle" fontSize="8" fontWeight="600" fill="var(--info)">flagged pair</text>
                  </>
                )}
                {/* account nodes — clickable to open the account dossier */}
                {graph.acctNodes.map((a) => {
                  const clickable = onAccountClick && a.label && a.label !== '—'
                  return (
                    <g key={a.id} onClick={clickable ? () => onAccountClick(a.label) : undefined} style={{ cursor: clickable ? 'pointer' : 'default' }}>
                      <title>{a.label}{a.sub ? ' · ' + a.sub : ''}{clickable ? ' — open dossier' : ''}</title>
                      <circle cx={a.x} cy={a.y} r={graph.ar} fill="var(--surface)" stroke={clickable ? 'var(--accent)' : 'var(--border-strong)'} strokeWidth="1.5" />
                      <text x={a.x} y={a.y + graph.ar + 10} textAnchor="middle" fontSize="6" fill={clickable ? 'var(--accent)' : 'var(--text-2)'}>{a.label.length > 11 ? a.label.slice(0, 10) + '…' : a.label}</text>
                    </g>
                  )
                })}
                {/* user nodes */}
                {graph.userNodes.map((u) => (
                  <g key={u.id}>
                    <circle cx={u.x} cy={u.y} r={graph.r} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="2" />
                    <text x={u.x} y={u.y - 1} textAnchor="middle" fontSize="8" fontWeight="700" fill="var(--accent)">{u.label}</text>
                    <text x={u.x} y={u.y + 8} textAnchor="middle" fontSize="6" fill="var(--accent)">user</text>
                  </g>
                ))}
              </svg>
            ) : (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>No linked-account data.</div>
            )}
            {onAccountClick && graph && graph.acctNodes.length > 0 && (
              <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 6, textAlign: 'center' }}>Click an account to open its dossier.</div>
            )}
          </div>

          {/* confirmed signals summary (derived from the flag's real signals) */}
          <div style={card}>
            <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 13 }}>Confirmed signals</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {signals.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>No signals recorded for this flag.</div>
              )}
              {signals.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, gap: 10 }}>
                  <span style={{ color: 'var(--text-2)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, fontFamily: "'Geist Mono',monospace", color: 'var(--ok)', background: 'var(--ok-soft)', padding: '2px 8px', borderRadius: 6, flex: 'none' }}>{s.code}</span>
                </div>
              ))}
            </div>
            <div style={{ height: 1, background: 'var(--hair)', margin: '14px 0' }} />
            <div style={{ display: 'flex', gap: 10, padding: '11px 12px', background: sel.sevSoft, border: '1px solid color-mix(in srgb,' + sel.sevColor + ' 22%,transparent)', borderRadius: 9 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: sel.sevColor, marginTop: 5, flex: 'none' }} />
              <div style={{ fontSize: 11.5, color: 'var(--text-2)' }}><b style={{ color: 'var(--text)' }}>{sel.sevLabel} rationale.</b> {signals.length} signal{signals.length === 1 ? '' : 's'} confirmed ({signals.map((s) => s.code).join(', ') || '—'}) with cross-instrument recurrence of {sel.recurrence ?? '—'}.</div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
