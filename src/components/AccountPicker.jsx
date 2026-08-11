import { useState, useEffect } from 'react'
import { fetchAccountSearch, ApiError } from '../api.js'

// Shared "pick an account" UI for the account-scoped dossier screens
// (AccountSummary, PayoutReview, AccountTrades): a search box with a
// debounced fragment-typeahead, plus — before any account is chosen — an
// inline list of accounts fetched once via `fetchAccountSearch('', ...)`
// (no `search` param), so there's something to click before the reviewer
// types anything.
//
// `value` is the parent's current resolved account name (e.g. `query` /
// `account` state) — this component re-syncs its input to it, so a parent
// that resolves the account another way (an ambiguous-candidate pick, a
// deep link) just needs to update `value` via the same `onSelect` path.
export default function AccountPicker({
  value = '',
  onSelect,
  // Which field of a result row is the parent's identifier. Account-scoped
  // screens key on `account_name`; the summary dossier keys on `login_id`.
  // Falls back to account_name when a row doesn't carry the chosen field.
  selectKey = 'account_name',
  placeholder = 'Account name, fragment, or login ID…',
  showAvailableList = true,
  emptyTitle = 'Available accounts',
  emptySubtitle = 'Pick one below, or search above.',
}) {
  const [input, setInput] = useState(value)
  const [suggestions, setSuggestions] = useState([])
  const [suggLoading, setSuggLoading] = useState(false)
  const [suggError, setSuggError] = useState(null)
  const [suggOpen, setSuggOpen] = useState(false)
  const [debouncedInput, setDebouncedInput] = useState('')

  const [defaultAccounts, setDefaultAccounts] = useState([])
  const [defaultLoading, setDefaultLoading] = useState(showAvailableList)
  const [defaultError, setDefaultError] = useState(null)
  // account-search returns { has_next, has_previous } rather than a total
  // count (see api.js), so this is prev/next paging, not numbered pages.
  const [defaultPage, setDefaultPage] = useState(1)
  const [defaultHasNext, setDefaultHasNext] = useState(false)
  const DEFAULT_PAGE_SIZE = 25

  // re-sync if the parent resolves the account some other way (ambiguous
  // candidate pick, deep link from a table click, etc.)
  useEffect(() => { setInput(value) }, [value])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedInput(input.trim()), 300)
    return () => clearTimeout(t)
  }, [input])

  useEffect(() => {
    let alive = true
    if (debouncedInput.length < 2) { setSuggestions([]); setSuggError(null); setSuggLoading(false); return undefined }
    setSuggLoading(true)
    fetchAccountSearch(debouncedInput, { page: 1, page_size: 20 })
      .then((d) => { if (alive) { setSuggestions(d?.results || []); setSuggError(null) } })
      .catch((e) => {
        if (!alive) return
        setSuggestions([])
        setSuggError(e instanceof ApiError && e.isUnavailable ? (e.message || "Couldn't check right now.") : e.message)
      })
      .finally(() => { if (alive) setSuggLoading(false) })
    return () => { alive = false }
  }, [debouncedInput])

  // the default (no-search-param) account list — fetched on mount and on
  // every page change, used to seed the "available accounts" panel below.
  useEffect(() => {
    if (!showAvailableList) return undefined
    let alive = true
    setDefaultLoading(true)
    fetchAccountSearch('', { phase: "qualified",page: defaultPage, page_size: DEFAULT_PAGE_SIZE })
      .then((d) => {
        if (!alive) return
        setDefaultAccounts(d?.results || [])
        setDefaultHasNext(!!d?.has_next)
        setDefaultError(null)
      })
      .catch((e) => {
        if (!alive) return
        setDefaultAccounts([])
        setDefaultHasNext(false)
        setDefaultError(e instanceof ApiError && e.isUnavailable ? (e.message || "Couldn't check right now.") : e.message)
      })
      .finally(() => { if (alive) setDefaultLoading(false) })
    return () => { alive = false }
  }, [showAvailableList, defaultPage])

  const select = (row) => {
    const picked = (typeof row === 'string' ? row : (row?.[selectKey] ?? row?.account_name)) || ''
    setInput(picked)
    setSuggOpen(false)
    setSuggestions([])
    onSelect && onSelect(picked, row)
  }

  const submit = (e) => { e.preventDefault(); setSuggOpen(false); onSelect && onSelect(input) }

  return (
    <div>
      <form onSubmit={submit} style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 420 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--inset)', border: '1px solid var(--border)', borderRadius: 9, padding: '8px 12px' }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flex: 'none' }}><circle cx="6.3" cy="6.3" r="4.6" stroke="var(--text-3)" strokeWidth="1.5" /><line x1="9.7" y1="9.7" x2="13.5" y2="13.5" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round" /></svg>
            <input
              value={input}
              onChange={(e) => { setInput(e.target.value); setSuggOpen(true) }}
              onFocus={() => setSuggOpen(true)}
              onBlur={() => setTimeout(() => setSuggOpen(false), 120)}
              placeholder={placeholder}
              style={{ border: 'none', background: 'transparent', outline: 'none', font: 'inherit', color: 'var(--text)', width: '100%', fontFamily: "'Geist Mono',monospace" }}
            />
          </div>
          {suggOpen && debouncedInput.length >= 2 && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 30, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9, boxShadow: 'var(--shadow-lg, var(--shadow))', overflow: 'hidden', maxHeight: 280, overflowY: 'auto' }}>
              {suggLoading && <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-3)' }}>Searching…</div>}
              {!suggLoading && suggError && (
                <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-2)' }}><b style={{ color: 'var(--text)' }}>Couldn’t check right now.</b> {suggError}</div>
              )}
              {!suggLoading && !suggError && suggestions.length === 0 && (
                <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-3)' }}>No accounts match “{debouncedInput}”.</div>
              )}
              {!suggLoading && !suggError && suggestions.map((s) => (
                <div
                  key={(s[selectKey] ?? s.account_name) || s.user_id}
                  onMouseDown={(e) => e.preventDefault()} // keep focus so onBlur doesn't close before onClick fires
                  onClick={() => select(s)}
                  className="row-hover"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '9px 14px', cursor: 'pointer', borderTop: '1px solid var(--hair)', fontSize: 12.5 }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: "'Geist Mono',monospace", fontWeight: 600, color: 'var(--accent)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s[selectKey] ?? s.account_name}</div>
                    {s.email && <div style={{ color: 'var(--text-3)', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.email}</div>}
                  </div>
                  <div style={{ color: 'var(--text-3)', fontSize: 11, flex: 'none' }}>{s.phase}{s.user_id ? ` · user ${s.user_id}` : ''}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <button type="submit" className="accent-btn" style={{ font: 'inherit', fontWeight: 600, fontSize: 12.5, color: 'var(--accent-fg)', background: 'var(--accent)', border: 'none', borderRadius: 9, padding: '8px 18px', cursor: 'pointer' }}>Search</button>
      </form>

      {showAvailableList && !value && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--hair)' }}>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>{emptyTitle}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>{emptySubtitle}</div>
          </div>
          {defaultLoading && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>Loading accounts…</div>
          )}
          {!defaultLoading && defaultError && (
            <div style={{ padding: '14px 16px', fontSize: 12.5, color: 'var(--text-2)' }}>
              <b style={{ color: 'var(--text)' }}>Couldn’t check right now.</b> {defaultError}
            </div>
          )}
          {!defaultLoading && !defaultError && defaultAccounts.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No accounts found.</div>
          )}
          {!defaultLoading && !defaultError && defaultAccounts.map((s) => (
            <div
              key={(s[selectKey] ?? s.account_name) || s.user_id}
              onClick={() => select(s)}
              className="row-hover"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '11px 16px', cursor: 'pointer', borderTop: '1px solid var(--hair)', fontSize: 12.5 }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "'Geist Mono',monospace", fontWeight: 600, color: 'var(--accent)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s[selectKey] ?? s.account_name}</div>
                {s.email && <div style={{ color: 'var(--text-3)', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.email}</div>}
              </div>
              <div style={{ color: 'var(--text-3)', fontSize: 11, flex: 'none' }}>{s.phase}{s.user_id ? ` · user ${s.user_id}` : ''}</div>
            </div>
          ))}
          {!defaultLoading && !defaultError && (defaultPage > 1 || defaultHasNext) && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 16px', borderTop: '1px solid var(--hair)', background: 'var(--surface-2)' }}>
              <button
                onClick={() => setDefaultPage((p) => Math.max(1, p - 1))}
                disabled={defaultPage <= 1}
                className="ghost-btn"
                style={{ font: 'inherit', fontSize: 12, fontWeight: 600, cursor: defaultPage <= 1 ? 'not-allowed' : 'pointer', padding: '5px 12px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', opacity: defaultPage <= 1 ? 0.45 : 1 }}
              >‹ Prev</button>
              <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Page <span style={{ fontFamily: "'Geist Mono',monospace", color: 'var(--text-2)' }}>{defaultPage}</span></span>
              <button
                onClick={() => setDefaultPage((p) => p + 1)}
                disabled={!defaultHasNext}
                className="ghost-btn"
                style={{ font: 'inherit', fontSize: 12, fontWeight: 600, cursor: defaultHasNext ? 'pointer' : 'not-allowed', padding: '5px 12px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', opacity: defaultHasNext ? 1 : 0.45 }}
              >Next ›</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
