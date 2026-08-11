// Dashboard for GET /api/overview/, which returns one flat count per detection
// model: { two_minute: 21, order_book_spam: 382, news_trading: 460, … }.
// Everything here is a rollup of those counts (see decorateOverview in data.js)
// — there is no severity split, time series or account total in the payload, so
// none is displayed.
export default function Overview({ navGo, ov, error, loading }) {
  const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 18px 17px', boxShadow: 'var(--shadow)' }
  const kpiLabel = { fontSize: 10, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1.4, marginBottom: 9 }
  const kpiNum = { fontSize: 33, fontWeight: 600, letterSpacing: '-0.035em', fontFamily: "'Geist Mono',monospace" }
  const num = (n) => Number(n || 0).toLocaleString()

  const firing = ov?.firing || []
  const quiet = ov?.quiet || []
  const openScreen = (m) => { if (m.screen && navGo[m.screen]) navGo[m.screen]() }

  // The headline rules, in the order compliance reviews them. Read straight off
  // the raw count map so a rule shows its number even if it's absent from the
  // derived model list for any reason.
  const HEADLINE = [
    { key: 'news_trading', label: 'News Trading' },
    { key: 'order_book_spam', label: 'Order Book Spam' },
    { key: 'max_lot', label: 'Max Lot' },
    { key: 'gambling', label: 'Gambling' },
    { key: 'one_percent', label: 'One Percent' },
    { key: 'minimum_trading_days', label: 'Min Trading Days' },
  ]
  const counts = ov?.counts || {}
  const headline = HEADLINE.map((h) => ({
    ...h,
    count: counts[h.key] ?? 0,
    model: (ov?.models || []).find((m) => m.key === h.key) || null,
  }))

  const kpis = ov ? [
    { label: 'Total flags', value: num(ov.totalFlags), sub: 'across every rule' },
    { label: 'Rules firing', value: `${firing.length}`, sub: `of ${ov.models.length} configured`, color: firing.length ? 'var(--high)' : 'var(--text)' },
    { label: 'Busiest rule', value: ov.top ? num(ov.top.count) : '0', sub: ov.top ? ov.top.label : 'nothing flagged', color: ov.top ? ov.top.color : 'var(--text)' },
    { label: 'Clean rules', value: `${quiet.length}`, sub: 'no flags raised', color: 'var(--ok)' },
  ] : []

  return (
    <section style={{ padding: '24px 30px 46px', maxWidth: 1380, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Detection Overview</h1>
          <div style={{ color: 'var(--text-2)', fontSize: 13 }}>Open flag counts per detection model across Evaluation and Qualified accounts.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: 12, color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', background: 'var(--surface)' }}>{loading ? 'Loading…' : 'Live'}</div>
          {/* the busiest rule is the one a reviewer opens first */}
          {ov?.top?.screen && navGo[ov.top.screen] && (
            <button className="accent-btn" onClick={() => navGo[ov.top.screen]()} style={{ font: 'inherit', fontWeight: 600, fontSize: 12.5, color: 'var(--accent-fg)', background: 'var(--accent)', border: 'none', borderRadius: 8, padding: '7px 15px', cursor: 'pointer' }}>
              Open {ov.top.label} →
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: '12px 14px', background: 'var(--crit-soft)', border: '1px solid color-mix(in srgb,var(--crit) 25%,transparent)', borderRadius: 9, fontSize: 12.5, color: 'var(--text)' }}>
          <b>Couldn’t load overview.</b> <span style={{ color: 'var(--text-2)' }}>{error}</span>
        </div>
      )}

      {loading && <OverviewSkeleton card={card} />}

      {/* A 200 with a shape we don't recognise would otherwise render as a
          silent empty grid — say so, and show what actually arrived. */}
      {!loading && ov?.empty && (
        <div style={{ marginBottom: 16, padding: '12px 14px', background: 'var(--high-soft)', border: '1px solid color-mix(in srgb,var(--high) 25%,transparent)', borderRadius: 9, fontSize: 12.5 }}>
          <b>No rule counts in the overview response.</b>{' '}
          <span style={{ color: 'var(--text-2)' }}>
            The request succeeded but held no numeric counts. Keys received:{' '}
            <span style={{ fontFamily: "'Geist Mono',monospace" }}>{(ov.receivedKeys || []).join(', ') || '(none)'}</span>
          </span>
        </div>
      )}

      {!loading && ov && (<>
        

        {/* ---- KPI row ---- */}
        <div className="grid-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
          {kpis.map((c) => (
            <div key={c.label} style={card}>
              <div style={kpiLabel}>{c.label}</div>
              <div style={{ ...kpiNum, color: c.color || 'var(--text)' }}>{c.value}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 6 }}>{c.sub}</div>
            </div>
          ))}
        </div>

        {/* ---- headline rule counts ---- */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: 12, marginBottom: 18 }}>
          {headline.map((h) => {
            const clickable = !!(h.model?.screen && navGo[h.model.screen])
            return (
              <div
                key={h.key}
                className={clickable ? 'row-hover' : undefined}
                onClick={clickable ? () => navGo[h.model.screen]() : undefined}
                style={{ ...card, padding: '15px 16px 14px', cursor: clickable ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', gap: 4 }}
              >
                <div style={{ ...kpiLabel, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {h.label}
                  <span style={{ marginLeft: 'auto', color: clickable ? 'var(--accent)' : 'transparent', fontSize: 13 }}>›</span>
                </div>
                <div style={{ ...kpiNum, fontSize: 30, color: h.count ? 'var(--crit)' : 'var(--text-3)' }}>{num(h.count)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{h.count ? 'open flags' : 'no flags'}</div>
              </div>
            )
          })}
        </div>

        {/* ---- one stat tile per model, busiest first ---- */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Flags by rule</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>
              Bars are scaled to the busiest rule, so a small count stays visible. Rules with a screen open on click.
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
            total <span style={{ fontFamily: "'Geist Mono',monospace", color: 'var(--text)', fontWeight: 600 }}>{num(ov.totalFlags)}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(215px, 1fr))', gap: 12 }}>
          {ov.models.map((m) => <ModelTile key={m.key} m={m} num={num} onOpen={openScreen} />)}
        </div>

        {firing.length === 0 && (
          <div style={{ ...card, marginTop: 14, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
            No flags raised by any rule.
          </div>
        )}
      </>)}
    </section>
  )
}

// One rule's count. A zero-count tile is deliberately muted rather than hidden:
// "this rule ran and found nothing" is a different statement from "this rule
// isn't here", and a reviewer needs to tell them apart.
function ModelTile({ m, num, onOpen }) {
  const clickable = !!m.screen
  const quiet = m.count === 0
  return (
    <div
      className={clickable ? 'row-hover' : undefined}
      onClick={clickable ? () => onOpen(m) : undefined}
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
        boxShadow: 'var(--shadow)', padding: '14px 15px 13px', cursor: clickable ? 'pointer' : 'default',
        display: 'flex', flexDirection: 'column', gap: 9, opacity: quiet ? 0.72 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: quiet ? 'var(--text-3)' : m.color, flex: 'none' }} />
        <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '0.02em', color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.label}</span>
        <span style={{ marginLeft: 'auto', color: clickable ? 'var(--accent)' : 'transparent', fontSize: 13, flex: 'none' }}>›</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 26, fontWeight: 600, letterSpacing: '-0.03em', color: quiet ? 'var(--text-3)' : 'var(--text)' }}>
          {num(m.count)}
        </span>
        {!quiet && (
          <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 11, color: 'var(--text-3)' }}>{m.share.toFixed(1)}%</span>
        )}
      </div>

      <div style={{ height: 6, background: 'var(--inset)', borderRadius: 20, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: m.barPct + '%', background: m.color, borderRadius: 20, transition: 'width .4s ease' }} />
      </div>
    </div>
  )
}

function OverviewSkeleton({ card }) {
  const bar = (w, h = 12) => <div className="skeleton" style={{ width: w, height: h }} />
  return (
    <>
      <div className="grid-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={card}>
            {bar('55%', 10)}
            <div style={{ marginTop: 12 }}>{bar('45%', 28)}</div>
            <div style={{ marginTop: 10 }}>{bar('80%', 10)}</div>
          </div>
        ))}
      </div>
      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {bar('40%', 14)}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ flex: '0 0 190px' }}>{bar('70%', 12)}</div>
            <div style={{ flex: 1 }}>{bar('100%', 8)}</div>
            <div style={{ flex: '0 0 86px' }}>{bar('100%', 12)}</div>
          </div>
        ))}
      </div>
    </>
  )
}
