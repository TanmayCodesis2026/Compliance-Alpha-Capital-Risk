import { useState, useEffect, useCallback } from 'react'
import { fetchAccountSummary } from '../api.js'
import { fmtDate } from '../data.js'
import AccountPicker from '../components/AccountPicker.jsx'
import { Field, FieldGrid, Mono, Pill } from '../components/ScanFields.jsx'

// GET /api/account-summary/?login_id=… returns the resolved account record(s)
// plus a rollup — it no longer carries per-model result rows, so this screen is
// the identity card and the counts, and each non-zero count links out to the
// model screen that lists them.
//
//   { login_id, resolved_logins[], status, validation_note, generated_at,
//     as_of_note,
//     account: [{ login_id, user_id, trading_platform, status, plan_name, phase }],
//     summary: { total_flags, by_type: {model: n}, by_severity: {} } }

// Labels + the screen each by_type key drills into (via onViewModel).
const MODEL_LABELS = {
  two_minute: 'Two Minute',
  weekend_holding: 'Weekend Holding',
  order_book_spam: 'Order Book Spam',
  one_percent: 'One Percent',
  max_lot: 'Max Lot',
  minimum_trading_days: 'Minimum Trading Days',
  news_trading: 'News Trading',
  gambling: 'Gambling',
  reverse_trading: 'Reverse Trading',
  group_trading: 'Group Trading',
}
const labelOf = (k) => MODEL_LABELS[k] || String(k).replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

// `status` is the lookup outcome, not a severity — "found" is the good case.
const statusTone = (s) => (s === 'found' ? 'ok' : s === 'not_found' ? 'crit' : 'high')

// Phase/status on the account record ("Evaluation", "qualified", …).
const phaseTone = (v) => (/qualif/i.test(v || '') ? 'ok' : /eval/i.test(v || '') ? 'info' : 'neutral')

function AccountCard({ a }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow)', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={{ fontFamily: "'Geist Mono',monospace", fontWeight: 700, fontSize: 16 }}>{a.login_id}</span>
        {a.status && <Pill tone={phaseTone(a.status)}>{a.status}</Pill>}
        {a.plan_name && <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{a.plan_name}</span>}
      </div>
      <FieldGrid min={120}>
        <Field label="User ID"><Mono>{a.user_id}</Mono></Field>
        <Field label="Platform"><Mono>{a.trading_platform}</Mono></Field>
        <Field label="Phase">{a.phase || '—'}</Field>
      </FieldGrid>
    </div>
  )
}

export default function AccountSummary({ initialLogin = '', onViewModel }) {
  const [query, setQuery] = useState(initialLogin)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // re-sync if a login is deep-linked from a table click
  useEffect(() => { setQuery(initialLogin) }, [initialLogin])

  const run = useCallback((login) => {
    const id = (login ?? '').trim()
    if (!id) { setData(null); setError(null); return undefined }
    let alive = true
    setLoading(true)
    fetchAccountSummary(id)
      .then((d) => { if (alive) { setData(d); setError(null) } })
      .catch((e) => { if (alive) { setError(e.message); setData(null) } })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  useEffect(() => run(query), [query, run])

  const summary = data?.summary
  const byType = summary?.by_type || {}
  const bySeverity = summary?.by_severity || {}
  const accounts = Array.isArray(data?.account) ? data.account : []
  const flagged = Object.entries(byType).filter(([, n]) => n > 0)
  const clean = Object.entries(byType).filter(([, n]) => !n)

  return (
    <section style={{ padding: '24px 30px 46px', maxWidth: 1380, margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Account Search</h1>
        <div style={{ color: 'var(--text-2)', fontSize: 13 }}>Flag rollup for one login, across every detection model.</div>
      </div>

      {/* Opening this screen hits /api/account-search/ for a browsable list and
          typeahead; picking one loads its rollup from /api/account-summary/. */}
      <AccountPicker
        value={query}
        onSelect={setQuery}
        selectKey="login_id"
        placeholder="Login ID, account name, or fragment…"
        emptyTitle="Available accounts"
        emptySubtitle="Pick one to see its flag rollup, or search above."
      />

      {error && (
        <div style={{ marginBottom: 16, padding: '12px 14px', background: 'var(--crit-soft)', border: '1px solid color-mix(in srgb,var(--crit) 25%,transparent)', borderRadius: 9, fontSize: 12.5, color: 'var(--text)' }}>
          <b>Couldn’t load account.</b> <span style={{ color: 'var(--text-2)' }}>{error}</span>
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="skeleton" style={{ height: 110, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
        </div>
      )}

      {!loading && data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* lookup outcome — a login can resolve to several accounts, or none */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 12 }}>
            <Pill tone={statusTone(data.status)}>{String(data.status || 'unknown').replace(/_/g, ' ')}</Pill>
            <span style={{ color: 'var(--text-2)' }}>
              Searched <span style={{ fontFamily: "'Geist Mono',monospace", color: 'var(--text)', fontWeight: 600 }}>{data.login_id}</span>
              {(data.resolved_logins || []).length > 1 && (
                <> · resolved to <span style={{ fontFamily: "'Geist Mono',monospace", color: 'var(--text)' }}>{data.resolved_logins.join(', ')}</span></>
              )}
            </span>
            <span style={{ marginLeft: 'auto', color: 'var(--text-3)', fontSize: 11.5 }}>
              {data.as_of_note} · generated {fmtDate(data.generated_at)}
            </span>
          </div>

          {data.validation_note && (
            <div style={{ padding: '10px 13px', background: 'var(--high-soft)', border: '1px solid color-mix(in srgb,var(--high) 25%,transparent)', borderRadius: 9, fontSize: 12.5 }}>
              {data.validation_note}
            </div>
          )}

          {accounts.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              {accounts.map((a) => <AccountCard key={a.login_id} a={a} />)}
            </div>
          )}

          {/* flag rollup */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', padding: '16px 18px', borderBottom: '1px solid var(--hair)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Flags by model</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>
                  {flagged.length ? 'Click a model to see the flags behind the count.' : 'No detection model has flagged this account.'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: 28, fontWeight: 600, letterSpacing: '-0.03em', color: summary?.total_flags ? 'var(--crit)' : 'var(--ok)' }}>
                  {(summary?.total_flags ?? 0).toLocaleString()}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>total flags</div>
              </div>
            </div>

            {flagged.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '16px 18px' }}>
                {flagged.map(([k, n]) => (
                  <button
                    key={k}
                    onClick={() => onViewModel && onViewModel(k, data.login_id)}
                    style={{ font: 'inherit', textAlign: 'left', border: '1px solid color-mix(in srgb,var(--crit) 25%,transparent)', background: 'var(--crit-soft)', borderRadius: 9, padding: '10px 14px', minWidth: 130, cursor: onViewModel ? 'pointer' : 'default' }}
                  >
                    <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: 19, fontWeight: 600, color: 'var(--crit)' }}>{n.toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>{labelOf(k)}</div>
                  </button>
                ))}
              </div>
            )}

            {clean.length > 0 && (
              <div style={{ borderTop: flagged.length ? '1px solid var(--hair)' : 'none', background: 'var(--surface-2)', padding: '12px 18px' }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>
                  Clean · {clean.length}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {clean.map(([k]) => (
                    <span key={k} style={{ fontSize: 11.5, color: 'var(--text-3)', background: 'var(--inset)', border: '1px solid var(--border)', borderRadius: 20, padding: '4px 11px' }}>
                      {labelOf(k)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {Object.keys(bySeverity).length > 0 && (
              <div style={{ borderTop: '1px solid var(--hair)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>By severity</span>
                {Object.entries(bySeverity).map(([k, n]) => (
                  <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
                    <Pill tone={/crit/i.test(k) ? 'crit' : /high|violation/i.test(k) ? 'high' : 'neutral'}>{k}</Pill>
                    <span style={{ fontFamily: "'Geist Mono',monospace", fontWeight: 600 }}>{n}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
