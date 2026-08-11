// Shared pagination footer driven by a pageInfo object:
// { page, pageCount, total, from, to, pageSize, setPage, setPageSize, prev, next }
export default function Pagination({ pageInfo }) {
  const { page, pageCount, total, from, to, setPage, pageSize, setPageSize, prev, next } = pageInfo

  // compact page list: 1 … p-1 p p+1 … N
  const pages = []
  if (pageCount <= 7) {
    for (let i = 1; i <= pageCount; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('…')
    for (let i = Math.max(2, page - 1); i <= Math.min(pageCount - 1, page + 1); i++) pages.push(i)
    if (page < pageCount - 2) pages.push('…')
    pages.push(pageCount)
  }

  const navBtn = (extra) => ({
    font: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer',
    minWidth: 30, height: 30, padding: '0 8px', borderRadius: 7,
    border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...extra,
  })
  const disabled = { opacity: 0.45, cursor: 'not-allowed' }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '12px 18px', borderTop: '1px solid var(--hair)', background: 'var(--surface-2)' }}>
      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
        Showing <span style={{ fontFamily: "'Geist Mono',monospace", color: 'var(--text-2)' }}>{from}–{to}</span> of <span style={{ fontFamily: "'Geist Mono',monospace", color: 'var(--text-2)' }}>{total.toLocaleString()}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={prev} disabled={page <= 1} style={navBtn(page <= 1 ? disabled : {})} aria-label="Previous page" className="ghost-btn">‹</button>
        {pages.map((p, i) => p === '…'
          ? <span key={'e' + i} style={{ minWidth: 18, textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>…</span>
          : (
            <button
              key={p}
              onClick={() => setPage(p)}
              aria-current={p === page ? 'page' : undefined}
              style={navBtn(p === page ? { background: 'var(--accent)', color: 'var(--accent-fg)', border: '1px solid var(--accent)' } : {})}
              className={p === page ? '' : 'ghost-btn'}
            >{p}</button>
          ))}
        <button onClick={next} disabled={page >= pageCount} style={navBtn(page >= pageCount ? disabled : {})} aria-label="Next page" className="ghost-btn">›</button>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text-3)' }}>
        Rows
        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          style={{ font: 'inherit', fontSize: 12, color: 'var(--text)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', colorScheme: 'light dark' }}
        >
          {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
    </div>
  )
}
