import { useCallback, useEffect, useState } from 'react'
import { ApiError, fetchAccountSummary, fetchTwoMinuteVerdict, searchAccountWithReview } from '../api.js'
import { fmtDate } from '../data.js'
import { DEFAULT_SCOPE, scopeId } from '../scope.js'
import { isFunded } from '../reviewModel.js'
import { useAccountReview } from '../useAccountReview.js'
import AccountPicker from '../components/AccountPicker.jsx'
import { Field, FieldGrid, Money, Mono, Pill } from '../components/ScanFields.jsx'
import { InlineLoading } from '../components/Loaders.jsx'
import { Notice, Toast } from '../components/ReviewBits.jsx'
import { primaryBtn, smallBtn } from '../components/buttonStyles.js'
import ScopeSwitch, { PeriodProfit } from '../components/ScopeSwitch.jsx'
import TierSummary from '../components/TierSummary.jsx'
import RuleDrillDown from '../components/RuleDrillDown.jsx'
import RuleScoreboard from '../components/RuleScoreboard.jsx'
import TwoMinuteVerdict, { TwoMinuteAllPeriods } from '../components/TwoMinuteVerdict.jsx'

// The account page (T21–T31). One login, one payout-period scope:
//
//   search-submit ──► GET /account-search/?search=<login>   exact match → `review` attached
//   deep link / pick ► GET /account-review/?login_id=        the same payload
//   scope switch ───► GET /account-review/?…&refresh=false   read only
//   alongside ──────► GET /account-summary/?…                per-rule scoreboard + Two Minute
//   chip / rule ────► GET /<rule>/account/?…                 drill-down
//
// The stored review shows at once. When the server queues a re-check
// (`refreshing` + `recheck.task_id`) useAccountReview polls it and swaps the
// new review in; on a build without the queue the payload simply carries no
// `recheck` and the page is a read.

const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow)', padding: 16 }
const phaseTone = (v) => (/funded|qualif/i.test(v || '') ? 'ok' : /eval/i.test(v || '') ? 'info' : 'neutral')
const loginOf = (c) => (typeof c === 'string' ? c : c?.login_id || c?.account_name || '')

function AccountHeader({ account, loading }) {
  if (!account) return null
  const a = account
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: "'Geist Mono',monospace", fontWeight: 700, fontSize: 17 }}>{a.login_id}</span>
        {a.phase ? <Pill tone={phaseTone(a.phase)}>{a.phase}</Pill> : <Pill tone="neutral">PHASE UNKNOWN</Pill>}
        {a.plan && <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{a.plan}</span>}
        {a.plan_name && a.plan_name !== a.plan && <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>({a.plan_name})</span>}
        {loading && <span style={{ marginLeft: 'auto' }}><InlineLoading>Loading scope…</InlineLoading></span>}
      </div>
      <FieldGrid min={130}>
        <Field label="Platform"><Mono>{a.trading_platform}</Mono></Field>
        <Field label="Status"><Mono>{a.status}</Mono></Field>
        <Field label="User ID"><Mono>{a.user_id}</Mono></Field>
        <Field label="Email">{a.email || '—'}</Field>
        <Field label="Balance"><Money value={a.account_balance} dp={2} /></Field>
        <Field label="Initial balance">{a.initial_balance != null ? <Money value={a.initial_balance} /> : '—'}</Field>
        {a.target_percent != null && <Field label="Target"><Mono>{a.target_percent}%</Mono></Field>}
        <Field label="Purchased (server)"><Mono>{a.purchase_date_server || fmtDate(a.purchase_date)}</Mono></Field>
        <Field label="Payout type">{a.payout_type || '—'}</Field>
      </FieldGrid>
      {!a.phase && <Notice tone="neutral">The account status is unknown, so the rules refuse to run (shown as “cannot run”).</Notice>}
      {a.initial_balance_note && <Notice tone="high">{a.initial_balance_note}</Notice>}
      {(a.duplicate_platforms || []).length > 0 && (
        <Notice tone="high" title="Same login on more than one platform:">{a.duplicate_platforms.join(', ')}</Notice>
      )}
    </div>
  )
}

// 300 (several accounts), 404 (none), 503 (down) and the rest, each worded for
// what the reviewer can do about it.
function LookupError({ error, onPick }) {
  if (!error) return null
  if (error instanceof ApiError && error.isAmbiguous) {
    const candidates = error.candidates.length ? error.candidates : (error.body?.matched_logins || [])
    return (
      <Notice tone="high" title="That matches several accounts — pick one:">
        <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6, marginLeft: 4 }}>
          {candidates.map((c) => (
            <button key={loginOf(c)} onClick={() => onPick(loginOf(c))} className="ghost-btn" style={{ ...smallBtn, fontFamily: "'Geist Mono',monospace" }}>{loginOf(c)}</button>
          ))}
        </span>
      </Notice>
    )
  }
  if (error.status === 404) return <Notice tone="crit" title="Account not found.">{error.message}</Notice>
  if (error.isUnavailable) return <Notice tone="high" title="Temporarily unavailable.">{error.message} What is on screen is kept.</Notice>
  return <Notice tone="crit" title="Couldn’t load the account.">{error.message}</Notice>
}

export default function AccountSummary({ initialLogin = '', onViewModel }) {
  const [query, setQuery] = useState(initialLogin)  // what the picker shows
  const [login, setLogin] = useState('')            // the resolved account on screen
  const [scope, setScope] = useState(DEFAULT_SCOPE)
  const [activeRule, setActiveRule] = useState(null)
  const [search, setSearch] = useState({ loading: false, error: null, matches: null, note: null })
  // `req` = the login + scope the scoreboard was fetched for (see below)
  const [summaryRes, setSummaryRes] = useState({ req: null, login: null, data: null, error: null })
  const [allPeriods, setAllPeriods] = useState(null) // { loading, data, error } for Two Minute scope=all
  const r = useAccountReview()

  // Open an account straight from a login (picked row, candidate, deep link).
  const openLogin = useCallback((id, { refresh = true } = {}) => {
    const next = DEFAULT_SCOPE
    setQuery(id)
    setLogin(id)
    setScope(next)
    setActiveRule(null)
    setAllPeriods(null)
    setSearch({ loading: false, error: null, matches: null, note: null })
    r.load(id, next, { refresh })
  }, [r.load]) // eslint-disable-line react-hooks/exhaustive-deps

  // Search-submit: an exact login comes back with the page attached.
  const submitSearch = useCallback((q) => {
    setQuery(q)
    setActiveRule(null)
    setAllPeriods(null)
    setSearch({ loading: true, error: null, matches: null, note: null })
    searchAccountWithReview(q, DEFAULT_SCOPE)
      .then((res) => {
        if (res?.review) {
          setScope(DEFAULT_SCOPE)
          setLogin(res.review.login_id)
          r.adopt(res.review, DEFAULT_SCOPE)
          setSearch({ loading: false, error: null, matches: null, note: null })
          return
        }
        const results = res?.results || []
        if (results.length === 1) { openLogin(results[0].login_id); return }
        setLogin('')
        setSearch({ loading: false, error: null, matches: results, note: res?.review_note || null })
      })
      .catch((e) => setSearch({ loading: false, error: e, matches: null, note: null }))
  }, [openLogin, r.adopt]) // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => {
    setQuery(''); setLogin(''); setActiveRule(null); setAllPeriods(null)
    setSearch({ loading: false, error: null, matches: null, note: null })
  }

  // A deep link from a table cell or the dossier. The prop is navigation from
  // outside this screen, and opening an account is a fetch, so this is the
  // effect's job; the state it resets belongs to the account being replaced.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (initialLogin) openLogin(initialLogin) }, [initialLogin, openLogin])

  // The scoreboard follows the account and the scope. Loading is derived ("the
  // newest scoreboard is for another request") rather than set up front.
  const key = scopeId(scope)
  const summaryReq = `${login}|${key}`
  useEffect(() => {
    if (!login) return undefined
    let alive = true
    fetchAccountSummary(login, scope)
      .then((d) => { if (alive) setSummaryRes({ req: summaryReq, login, data: d, error: null }) })
      // keep the last scoreboard on a failure: §5 says keep what is on screen
      .catch((e) => { if (alive) setSummaryRes((s) => ({ ...s, req: summaryReq, error: e })) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryReq])
  const summary = {
    loading: !!login && summaryRes.req !== summaryReq,
    // never show one account's scoreboard under another's header
    data: summaryRes.login === login ? summaryRes.data : null,
    error: summaryRes.req === summaryReq ? summaryRes.error : null,
  }

  const changeScope = (next) => {
    const withProfit = { ...next, manualProfit: undefined }
    setScope(withProfit)
    setAllPeriods(null)
    if (login) r.load(login, withProfit, { refresh: false })
  }
  const changeManualProfit = (n) => {
    const next = { ...scope, manualProfit: n ?? undefined }
    setScope(next)
    setAllPeriods(null)
    if (login) r.load(login, next, { refresh: false })
  }

  const loadAllPeriods = () => {
    setAllPeriods({ loading: true })
    fetchTwoMinuteVerdict(login, { kind: 'all', manualProfit: scope.manualProfit })
      .then((d) => setAllPeriods({ data: d }))
      .catch((e) => setAllPeriods({ error: e }))
  }

  const data = r.data
  const account = data?.account
  // The queue is optional server-side: only offer a re-check where the payload
  // shows the server has one.
  const canRecheck = !!data && Object.prototype.hasOwnProperty.call(data, 'recheck')
  const twoMinute = summary.data?.two_minute

  return (
    <section style={{ padding: '24px 30px 46px', maxWidth: 1380, margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Account Search</h1>
        <div style={{ color: 'var(--text-2)', fontSize: 13 }}>The stored review of one account for a payout period, with every rule behind it.</div>
      </div>

      <AccountPicker
        value={query}
        onSelect={(picked, row) => { if (!picked) reset(); else if (row) openLogin(picked); else submitSearch(picked) }}
        selectKey="login_id"
        placeholder="Login ID (exact opens the account) or a fragment…"
        emptyTitle="Available accounts"
        emptySubtitle="Pick one to open its review, or search above."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {search.loading && <InlineLoading>Searching…</InlineLoading>}
        <LookupError error={search.error || r.error} onPick={openLogin} />
        {search.note && <Notice tone="high" title="The account page could not be built.">{search.note}</Notice>}

        {search.matches && (
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--hair)', fontWeight: 600, fontSize: 13 }}>
              {search.matches.length ? `${search.matches.length} accounts match “${query}”` : `No account matches “${query}”.`}
            </div>
            {search.matches.map((m) => (
              <div key={m.login_id} onClick={() => openLogin(m.login_id)} className="row-hover" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 16px', borderTop: '1px solid var(--hair)', cursor: 'pointer', fontSize: 12.5 }}>
                <span style={{ fontFamily: "'Geist Mono',monospace", fontWeight: 600, color: 'var(--accent)' }}>{m.login_id}</span>
                <span style={{ color: 'var(--text-3)', fontSize: 11.5 }}>{[m.phase, m.plan_name, m.email].filter(Boolean).join(' · ')}</span>
              </div>
            ))}
          </div>
        )}

        {r.loading && !data && (<>
          <div className="skeleton" style={{ height: 130, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
        </>)}

        {data && login && (<>
          <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <AccountHeader account={account} loading={r.loading} />
            <div style={{ borderTop: '1px solid var(--hair)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <ScopeSwitch key={login} scope={scope} periods={data.periods || []} applied={data.scope} onChange={changeScope} disabled={r.loading} />
                {canRecheck && (
                  <button onClick={r.recheckNow} disabled={r.rechecking || r.refreshing} className="accent-btn" style={{ ...primaryBtn, opacity: r.rechecking || r.refreshing ? 0.6 : 1 }}>
                    {r.refreshing ? 'Re-checking…' : 'Re-check now'}
                  </button>
                )}
              </div>
              <PeriodProfit key={`${login}:${key}`} periodProfit={data.period_profit} account={account} manualProfit={scope.manualProfit} onManualProfit={changeManualProfit} disabled={r.loading} />
              {r.recheckNote && <Notice tone="info">{r.recheckNote}</Notice>}
            </div>
          </div>

          <TierSummary
            review={r.review}
            notes={data.notes || []}
            refreshing={r.refreshing}
            stalled={r.stalled}
            activeRule={activeRule}
            onOpenRule={(k) => setActiveRule((cur) => (cur === k ? null : k))}
          />
          {r.review && (data.notes || []).map((n) => <Notice key={n} tone="info">{n}</Notice>)}

          {activeRule && (
            <RuleDrillDown
              rule={activeRule}
              loginId={login}
              scope={scope}
              onClose={() => setActiveRule(null)}
              onOpenList={onViewModel ? (k) => onViewModel(k, login) : undefined}
            />
          )}

          {summary.error && <LookupError error={summary.error} onPick={openLogin} />}
          {summary.loading && !summary.data && <div className="skeleton" style={{ height: 160, borderRadius: 12 }} />}
          <RuleScoreboard
            data={summary.data}
            activeRule={activeRule}
            onOpenRule={(k) => setActiveRule(k)}
            onCrossAccount={onViewModel ? (k) => onViewModel(k, login) : undefined}
          />

          {twoMinute && (
            <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>Two Minute verdict</div>
                {onViewModel && <button onClick={() => onViewModel('two_minute', login)} className="ghost-btn" style={smallBtn}>Trade list</button>}
                <button onClick={allPeriods ? () => setAllPeriods(null) : loadAllPeriods} className="ghost-btn" style={smallBtn}>
                  {allPeriods ? 'This scope only' : 'Every payout period'}
                </button>
              </div>
              {!allPeriods && <TwoMinuteVerdict verdict={twoMinute} onManualProfitHint={isFunded(account)} />}
              {allPeriods?.loading && <InlineLoading>Loading every period…</InlineLoading>}
              {allPeriods?.error && <Notice tone="crit">{allPeriods.error.message}</Notice>}
              {allPeriods?.data && <TwoMinuteAllPeriods data={allPeriods.data} />}
            </div>
          )}
        </>)}
      </div>

      <Toast message={r.recheckError} onClose={r.dismissRecheckError} />
    </section>
  )
}
