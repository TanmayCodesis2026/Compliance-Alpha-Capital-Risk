import { useState, useEffect } from 'react'
import Pagination from '../components/Pagination.jsx'
import ReviewPanel from '../components/ReviewPanel.jsx'
import { fetchTradesByIds, ApiError } from '../api.js'

// Generic paginated table for the flat trade-flag models (Tick-Scalping,
// Short-Duration, HFT). Self-contained: owns its fetch, paging, and search.
//
// props:
//   title, subtitle
//   fetcher(opts)            -> { count, results }
//   columns: [{ key, label, width, render?(row), mono?, align? }]
//   searchPlaceholder        (optional; maps to `search` param)
//   detailFetcher(id)        (optional) -> detail payload; enables row expansion
//   detailIdOf(row)          (optional) -> the id to pass to detailFetcher.
//                            Defaults to `row.id`; short-duration keys its
//                            detail route off `flag_id` instead.
//   renderDetail(detail)     (optional) -> JSX shown in the expanded panel
//   filters: [{ param, label, options:[{value,label}] }]  (optional) single-select chip groups
//   inlineDetail(row)        (optional) -> JSX shown on expand, rendered from the
//                            row itself (no fetch). Mutually exclusive w/ detailFetcher.
//
//   ---- second level: the trade behind the flag ----
//   tradeFields: [{ key, label, render?(trade, { row, detail }), mono? }]
//                          `render` gets the flag row and detail payload too,
//                          so a field can fall back to the flag's own value
//                          when the trade record leaves it null.
//                          (optional) enables a nested "View trade" expander
//                          inside the detail panel. Each screen picks its own
//                          fields — a scalp cares about entry/exit price, an
//                          HFT burst cares about contracts, so this is config
//                          rather than a fixed layout.
//   tradeIdOf(row, detail) (optional) -> trade id; default reads `trade_id`
//                          off the detail payload, falling back to the row.
//                          Return falsy to hide the expander for that row.
//   tradeFetcher(ids)      (optional) -> { results, missing }; defaults to
//                          GET /api/trades?ids=…
//   flagSource             (optional) -> one of the 8 flag_source values;
//                          when set, renders the shared compliance
//                          ReviewPanel (source + row.flag_id) inside the
//                          expanded panel, below any trade-level detail.
//   onData(data)           (optional) -> fired with the raw fetch response
//                          whenever a page loads, so a wrapping screen can
//                          surface top-level fields (e.g. Daily Report's
//                          report_date/outstanding_unreviewed) that this
//                          component doesn't otherwise expose.
export default function TradeFlags({ title, subtitle, fetcher, columns, searchPlaceholder = 'Search flag IDs…', detailFetcher, detailIdOf, renderDetail, inlineDetail, filters = [], onAccountClick, initialAccount = '', tradeFields, tradeIdOf, tradeFetcher = fetchTradesByIds, flagSource, onData }) {
  // cache/React key for a row — most flag models have a numeric `id`, but
  // aggregate rows (e.g. Daily Report, which merges all 8 flag types and
  // only carries flag_source/flag_id) don't. Falling back to row.id alone
  // there would make every row resolve to the same `undefined` key, so one
  // row's expand/detail/trade state would end up shared by the whole table.
  const rowKey = (row) => row.id ?? (row.flag_source ? `${row.flag_source}:${row.flag_id}` : row.flag_id)

  const expandable = !!((detailFetcher && renderDetail) || inlineDetail || flagSource)
  const [expanded, setExpanded] = useState({})   // id -> bool
  const [details, setDetails] = useState({})     // id -> { loading?, data?, error? }
  const [tradeOpen, setTradeOpen] = useState({}) // id -> bool   (second level)
  const [trades, setTrades] = useState({})       // id -> { loading?, data?, error? }
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [filterVals, setFilterVals] = useState(initialAccount ? { account_name: initialAccount } : {}) // param -> value ('' = all)
  const [debFilters, setDebFilters] = useState(initialAccount ? { account_name: initialAccount } : {}) // debounced copy for fetching

  // when deep-linked from the account dossier, seed/replace the account filter
  useEffect(() => {
    if (initialAccount) {
      setFilterVals((m) => ({ ...m, account_name: initialAccount }))
      setDebFilters((m) => ({ ...m, account_name: initialAccount }))
    }
  }, [initialAccount])

  // debounce search + filter values so typing doesn't fire a request per keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const filterKey = JSON.stringify(filterVals)
  useEffect(() => {
    const t = setTimeout(() => setDebFilters(filterVals), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey])

  const debFilterKey = JSON.stringify(debFilters)
  useEffect(() => { setPage(1) }, [debounced, debFilterKey])

  useEffect(() => {
    let alive = true
    setLoading(true)
    const params = { page, page_size: pageSize, search: debounced || undefined }
    for (const [k, v] of Object.entries(debFilters)) if (v) params[k] = (typeof v === 'string' ? v.trim() : v)
    fetcher(params)
      .then((d) => { if (alive) { setData(d); setError(null); onData && onData(d) } })
      .catch((e) => { if (alive) { setError(e.message); setData(null) } })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher, page, pageSize, debounced, debFilterKey])

  // a new page of rows makes the cached detail/trade payloads unreachable anyway
  useEffect(() => {
    setExpanded({}); setDetails({}); setTradeOpen({}); setTrades({})
  }, [page, pageSize, debounced, debFilterKey])

  const setFilter = (param, value) =>
    setFilterVals((m) => ({ ...m, [param]: m[param] === value ? '' : value }))

  const rows = data?.results || []
  const total = data?.count ?? 0
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const pageStart = (page - 1) * pageSize
  const pageInfo = {
    page, pageCount, pageSize, total,
    from: total === 0 ? 0 : pageStart + 1,
    to: Math.min(pageStart + pageSize, total),
    setPage,
    setPageSize: (n) => { setPageSize(n); setPage(1) },
    prev: () => setPage((p) => Math.max(1, p - 1)),
    next: () => setPage((p) => Math.min(pageCount, p + 1)),
  }
  const minWidth = columns.reduce((a, c) => a + (c.width || 120), 0) + (expandable ? 46 : 0)

  const toggleRow = (row) => {
    const id = rowKey(row)                              // cache key: unique per row
    const detailId = detailIdOf ? detailIdOf(row) : id  // route param: may be flag_id
    const willOpen = !expanded[id]
    setExpanded((m) => ({ ...m, [id]: willOpen }))
    if (willOpen && detailFetcher && !details[id]) {
      setDetails((m) => ({ ...m, [id]: { loading: true } }))
      detailFetcher(detailId)
        .then((d) => setDetails((m) => ({ ...m, [id]: { data: d } })))
        .catch((e) => setDetails((m) => ({ ...m, [id]: { error: e.message } })))
    }
  }

  // second level: resolve the trade id off the detail payload (or the row) and
  // fetch it on first open. Cached per flag id — re-collapsing doesn't refetch.
  const resolveTradeId = (row, detail) =>
    tradeIdOf ? tradeIdOf(row, detail) : (detail?.trade_id ?? row?.trade_id)

  const toggleTrade = (row, tradeId) => {
    const id = rowKey(row)
    const willOpen = !tradeOpen[id]
    setTradeOpen((m) => ({ ...m, [id]: willOpen }))
    if (willOpen && !trades[id]) {
      setTrades((m) => ({ ...m, [id]: { loading: true } }))
      tradeFetcher([tradeId])
        .then((d) => setTrades((m) => ({ ...m, [id]: { data: d } })))
        .catch((e) => setTrades((m) => ({
          ...m,
          [id]: {
            error: e instanceof ApiError && e.isUnavailable
              ? "Couldn't load the trade right now — this is not a confirmation it doesn't exist."
              : e.message,
          },
        })))
    }
  }

  const renderTradeLevel = (row, detail) => {
    if (!tradeFields || !tradeFields.length) return null
    const tradeId = resolveTradeId(row, detail)
    if (!tradeId) return null

    const isOpen = !!tradeOpen[rowKey(row)]
    const st = trades[rowKey(row)]
    const trade = st?.data?.results?.[0]
    const missing = st?.data?.missing || []

    return (
      <div style={{ borderTop: '1px solid var(--hair)', marginTop: 12, paddingTop: 10 }}>
        <button
          onClick={() => toggleTrade(row, tradeId)}
          style={{ font: 'inherit', fontSize: 11.5, fontWeight: 600, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <span style={{ fontSize: 14, lineHeight: 1, display: 'inline-block', transition: 'transform .15s ease', transform: 'rotate(' + (isOpen ? '90deg' : '0deg') + ')' }}>›</span>
          {isOpen ? 'Hide trade' : 'View trade'}
          <span style={{ fontFamily: "'Geist Mono',monospace", fontWeight: 400, color: 'var(--text-3)' }}>{tradeId}</span>
        </button>

        {isOpen && (
          <div style={{ paddingTop: 10 }}>
            {st?.loading && <div className="skeleton" style={{ height: 64, borderRadius: 8 }} />}
            {st?.error && <div style={{ fontSize: 11.5, color: 'var(--crit)' }}>{st.error}</div>}
            {trade && (
              <div style={{ background: 'var(--inset)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 14 }}>
                {tradeFields.map((f) => (
                  <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 90 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, whiteSpace: 'nowrap' }}>{f.label}</div>
                    <div style={{ fontSize: 12.5, whiteSpace: 'nowrap', fontFamily: f.mono ? "'Geist Mono',monospace" : 'inherit' }}>
                      {f.render ? f.render(trade, { row, detail }) : (trade[f.key] ?? '—')}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {st?.data && !trade && (
              <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                {missing.length > 0
                  ? <>Trade id didn’t resolve: <span style={{ fontFamily: "'Geist Mono',monospace" }}>{missing.join(', ')}</span></>
                  : 'No trade returned.'}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <section style={{ padding: '24px 30px 46px', maxWidth: 1380, margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{title}</h1>
        <div style={{ color: 'var(--text-2)', fontSize: 13 }}>{subtitle} <span style={{ fontFamily: "'Geist Mono',monospace", color: 'var(--text-3)' }}>{total.toLocaleString()}</span> total.</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 360, background: 'var(--inset)', border: '1px solid var(--border)', borderRadius: 9, padding: '7px 11px' }}>
          <svg width="14" height="14" viewBox="0 0 15 15" fill="none" style={{ flex: 'none' }}><circle cx="6.3" cy="6.3" r="4.6" stroke="var(--text-3)" strokeWidth="1.5" /><line x1="9.7" y1="9.7" x2="13.5" y2="13.5" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round" /></svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={searchPlaceholder} style={{ border: 'none', background: 'transparent', outline: 'none', font: 'inherit', color: 'var(--text)', width: '100%' }} />
        </div>

        {filters.map((f) => (
          <div key={f.param} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</span>
            {f.type === 'text' ? (
              <input
                value={filterVals[f.param] || ''}
                onChange={(e) => setFilterVals((m) => ({ ...m, [f.param]: e.target.value }))}
                placeholder={f.placeholder || ''}
                style={{ font: 'inherit', fontSize: 11.5, color: 'var(--text)', background: 'var(--inset)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 9px', width: f.width || 90, outline: 'none', fontFamily: "'Geist Mono',monospace", textTransform: f.upper ? 'uppercase' : 'none' }}
              />
            ) : f.options.map((o) => {
              const on = filterVals[f.param] === o.value
              return (
                <button key={o.value} onClick={() => setFilter(f.param, o.value)} style={{
                  font: 'inherit', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', padding: '4px 11px', borderRadius: 6,
                  border: '1px solid ' + (on ? (o.color || 'var(--accent)') : 'var(--border)'),
                  background: on ? (o.soft || 'var(--accent-soft)') : 'transparent',
                  color: on ? (o.color || 'var(--accent)') : 'var(--text-3)',
                  fontFamily: o.mono ? "'Geist Mono',monospace" : 'inherit',
                }}>{o.label}</button>
              )
            })}
          </div>
        ))}
      </div>

      {error && (
        <div style={{ marginBottom: 14, padding: '12px 14px', background: 'var(--crit-soft)', border: '1px solid color-mix(in srgb,var(--crit) 25%,transparent)', borderRadius: 9, fontSize: 12.5, color: 'var(--text)' }}>
          <b>Couldn’t load flags.</b> <span style={{ color: 'var(--text-2)' }}>{error}</span>
        </div>
      )}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth, fontSize: 12 }}>
            {/* header */}
            <div style={{ display: 'flex', alignItems: 'stretch', color: 'var(--text-3)', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, background: 'var(--surface-2)' }}>
              {expandable && <div style={{ flex: '0 0 46px' }} />}
              {columns.map((c) => (
                <div key={c.key} style={{ flex: '0 0 ' + (c.width || 120) + 'px', padding: '11px', textAlign: c.align || 'left' }}>{c.label}</div>
              ))}
            </div>
            {/* skeleton */}
            {loading && Array.from({ length: 10 }).map((_, i) => (
              <div key={'sk' + i} style={{ display: 'flex', borderTop: '1px solid var(--hair)' }}>
                {expandable && <div style={{ flex: '0 0 46px' }} />}
                {columns.map((c) => (
                  <div key={c.key} style={{ flex: '0 0 ' + (c.width || 120) + 'px', padding: '12px 11px' }}>
                    <div className="skeleton" style={{ height: 12, width: '70%' }} />
                  </div>
                ))}
              </div>
            ))}
            {/* rows */}
            {!loading && rows.map((row) => {
              const key = rowKey(row)
              const isOpen = expandable && expanded[key]
              const det = details[key]
              return (
                <div key={key} style={{ borderTop: '1px solid var(--hair)' }}>
                  <div className="row-hover" onClick={expandable ? () => toggleRow(row) : undefined} style={{ display: 'flex', alignItems: 'center', cursor: expandable ? 'pointer' : 'default' }}>
                    {expandable && (
                      <div style={{ flex: '0 0 46px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
                        <span style={{ fontSize: 15, lineHeight: 1, transition: 'transform .15s ease', transform: 'rotate(' + (isOpen ? '90deg' : '0deg') + ')', display: 'inline-block' }}>›</span>
                      </div>
                    )}
                    {columns.map((c) => (
                      <div key={c.key} style={{ flex: '0 0 ' + (c.width || 120) + 'px', padding: '12px 11px', textAlign: c.align || 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: c.mono ? "'Geist Mono',monospace" : 'inherit', color: c.muted ? 'var(--text-2)' : 'var(--text)' }}>
                        {c.render ? c.render(row, { onAccountClick }) : (row[c.key] ?? '—')}
                      </div>
                    ))}
                  </div>
                  {isOpen && (
                    <div style={{ background: 'var(--surface-2)', borderTop: '1px solid var(--hair)', padding: '14px 18px 16px 46px' }}>
                      {inlineDetail
                        ? inlineDetail(row)
                        : (<>
                            {det?.loading && <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Loading details…</div>}
                            {det?.error && <div style={{ fontSize: 11.5, color: 'var(--crit)' }}>{det.error}</div>}
                            {det?.data && renderDetail(det.data)}
                          </>)}
                      {/* second level — only once the detail (which carries
                          trade_id) has actually arrived */}
                      {(inlineDetail || det?.data) && renderTradeLevel(row, det?.data)}
                      {flagSource && (
                        <div style={{ borderTop: '1px solid var(--hair)', marginTop: 12, paddingTop: 12 }}>
                          <ReviewPanel source={flagSource} flagId={row.flag_id} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        {!loading && total === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No flags found.</div>
        )}
        {!loading && total > 0 && <Pagination pageInfo={pageInfo} />}
      </div>
    </section>
  )
}
