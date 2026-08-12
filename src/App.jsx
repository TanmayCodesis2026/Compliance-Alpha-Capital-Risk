import { Fragment, useState, useEffect, useMemo, useCallback } from 'react'
import { decorateOverview } from './data.js'
import { fetchOverview } from './api.js'
import { useIsMobile } from './useMediaQuery.js'
import { useSession } from './useSession.js'
import Overview from './screens/Overview.jsx'
import AccountSummary from './screens/AccountSummary.jsx'
import TwoMinute from './screens/TwoMinute.jsx'
import WeekendHolding from './screens/WeekendHolding.jsx'
import OnePercent from './screens/OnePercent.jsx'
import MaxLot from './screens/MaxLot.jsx'
import MinimumTradingDays from './screens/MinimumTradingDays.jsx'
import NewsTrading from './screens/NewsTrading.jsx'
import Gambling from './screens/Gambling.jsx'
import OrderBookSpam from './screens/OrderBookSpam.jsx'
import ReverseTrading from './screens/ReverseTrading.jsx'
import GroupTrading from './screens/GroupTrading.jsx'
import GroupOccasions from './screens/GroupOccasions.jsx'
import FlagSignals from './screens/FlagSignals.jsx'
import FlagAccounts from './screens/FlagAccounts.jsx'
import MatchOccurrences from './screens/MatchOccurrences.jsx'
import UserTodProfile from './screens/UserTodProfile.jsx'
import UserDurationProfile from './screens/UserDurationProfile.jsx'
import NewsEvents from './screens/NewsEvents.jsx'
import Logs from './screens/Logs.jsx'
import ComingSoon from './screens/ComingSoon.jsx'
import Compliance1 from './screens/Compliance1.jsx'
import Compliance from './screens/Compliance.jsx'
import Login from './components/Login.jsx'
// import RunHistory from './screens/RunHistory.jsx' // parked until the runs API exists

// The sidebar is two independent products behind one shell: the Risk tool
// (surveillance flags) and Compliance (duplicate-account matching). The toggle
// under the logo swaps which nav this renders.
//
// Each mode owns its screen keys, and the sidebar is rendered from this list
// rather than hand-written buttons, so a nav entry can't point at a screen key
// that has no active style and no route. `badge`/`tag` mark entries with a pill.
const MODES = {
  risk: {
    label: 'Risk tool',
    home: 'overview',
    sections: [
      {
        title: 'Overview',
        items: [
          { key: 'overview', label: 'Dashboard', badge: true },
          { key: 'account', label: 'Account Search' },
          { key: 'matchOccurrences', label: 'Analysis' },
        ],
      },
      {
        // Every item below is a daily scan for one trading rule, so the section
        // is named for what it lists rather than for the machinery behind it.
        title: 'Rule Violations',
        items: [
          { key: 'twoMinute', label: 'Two Minute' },
          { key: 'weekend', label: 'Weekend Holding' },
          { key: 'onePercent', label: 'One Percent' },
          { key: 'maxLot', label: 'Max Lot' },
          { key: 'minDays', label: 'Minimum Trading Days' },
          { key: 'news', label: 'News Trading' },
          { key: 'gambling', label: 'Gambling' },
          { key: 'obs', label: 'Order Book Spam' },
        ],
      },
      {
        // These match one account's activity against another's, rather than
        // checking a single login against a rule — hence the separate section.
        title: 'Cross-Account Detectors (RT / GT)',
        items: [
          { key: 'reverse', label: 'Reverse Trading' },
          { key: 'group', label: 'Group Trading' },
          // { key: 'groupOccasions', label: 'Group Occasions' },
          // { key: 'flagSignals', label: 'Flag Signals' },
          // { key: 'flagAccounts', label: 'Flag Accounts' },
          // { key: 'matchOccurrences', label: 'Match Occurrences' },
        ],
      },
      {
        // Behavioural fingerprints that corroborate a cross-account match.
        // They are evidence, not violations, so they list without a detail view.
        title: 'Trading Profiles',
        items: [
          { key: 'todProfile', label: 'User Time of Day Profile' },
          { key: 'durationProfile', label: 'User Duration Profile' },
        ],
      },
      {
        title: 'Reference',
        items: [{ key: 'events', label: 'News Events' }],
      },
    ],
    // Routable but not linked from the sidebar.
    //
    // Investigation is not routed at all: it is the detail view of an Analysis
    // row, and with no flag list to select from, nothing could ever populate
    // it. screens/Investigation.jsx is left in place for when a list returns.
    extras: ['logs'],
    showRules: true, // the RT/GT legend below the nav is risk-only
  },
  compliance: {
    label: 'Compliance',
    home: 'compliance',
    sections: [
      {
        title: 'Duplicates',
        items: [
          { key: 'compliance', label: 'Compliance' },
          // { key: 'compliance1', label: 'Cross-account Matching' },
        ],
      },
    ],
    extras: [],
  },
}

const MODE_KEYS = Object.keys(MODES)
const screensOf = (m) => [...MODES[m].sections.flatMap((s) => s.items.map((i) => i.key)), ...MODES[m].extras]
const SCREEN_KEYS = MODE_KEYS.flatMap(screensOf)

// Which mode a screen belongs to. Deriving the active mode from the current
// screen (rather than tracking it separately) means the toggle and the rendered
// screen cannot drift apart — a deep-link into a screen selects its mode too.
const MODE_OF_SCREEN = Object.fromEntries(
  MODE_KEYS.flatMap((m) => screensOf(m).map((k) => [k, m])),
)

const navSectionLabel = { fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-3)', padding: '16px 10px 6px', textTransform: 'uppercase' }

function NavButton({ item, active, onClick, badge }) {
  const pill = item.badge || item.tag
  return (
    <button
      className="nav-btn"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', padding: '9px 11px', border: 'none', borderRadius: 8,
        cursor: 'pointer', font: 'inherit', fontWeight: 500, textAlign: 'left',
        ...(pill ? { justifyContent: 'space-between' } : { gap: 11 }),
        background: active ? 'var(--accent-soft)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-2)',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 11 }}>{item.label}</span>
      {item.badge && (
        <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 11, fontWeight: 600, background: 'var(--crit-soft)', color: 'var(--crit)', padding: '1px 6px', borderRadius: 20 }}>{badge}</span>
      )}
      {item.tag && (
        <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-3)', background: 'var(--inset)', border: '1px solid var(--border)', padding: '1px 6px', borderRadius: 20 }}>{item.tag}</span>
      )}
    </button>
  )
}

// Segmented control under the logo — the Risk tool / Compliance switch.
function ModeToggle({ mode, onChange }) {
  return (
    <div role="tablist" aria-label="Product" style={{ display: 'flex', gap: 2, padding: 3, margin: '0 14px 12px', background: 'var(--inset)', border: '1px solid var(--border)', borderRadius: 9 }}>
      {MODE_KEYS.map((k) => {
        const on = mode === k
        return (
          <button
            key={k}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(k)}
            style={{
              flex: 1, padding: '6px 10px', border: 'none', borderRadius: 7, cursor: 'pointer',
              font: 'inherit', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
              background: on ? 'var(--surface)' : 'transparent',
              color: on ? 'var(--text)' : 'var(--text-3)',
              boxShadow: on ? 'var(--shadow)' : 'none',
              transition: 'background .15s ease, color .15s ease',
            }}
          >
            {MODES[k].label}
          </button>
        )
      })}
    </div>
  )
}

// The signed-in identity lives in the JWT, not in a separate profile call.
// Anything unexpected in the token is not worth crashing the shell over.
function userFromToken(token) {
  try {
    const claims = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return { email: claims.email || claims.name || claims.sub || '' }
  } catch {
    return { email: '' }
  }
}

export default function App() {
  const isMobile = useIsMobile()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [theme, setTheme] = useState('dark')
  const [screen, setScreen] = useState(MODES.risk.home)
  // Login is the launch screen: no token -> nothing but <Login/> renders.
  // useSession keeps the token refreshed and clears it when the session dies.
  const { idToken, signIn, signOut } = useSession()
  const [accountQuery, setAccountQuery] = useState('') // account dossier deep-link
  const [modelAccount, setModelAccount] = useState('') // deep-link login → a model screen

  // ---- API state ----
  const [overview, setOverview] = useState(null)
  const [overviewErr, setOverviewErr] = useState(null)

  // sidebar nav: clear any dossier deep-link account so model screens open clean
  const go = (s) => { setModelAccount(''); setScreen(s); setDrawerOpen(false); window.scrollTo && window.scrollTo(0, 0) }

  // open the account dossier for a login (from a clickable cell)
  const openAccount = useCallback((login) => {
    if (!login) return
    setAccountQuery(login)
    setScreen('account')
    window.scrollTo && window.scrollTo(0, 0)
  }, [])

  // Clicking a by_type tile on the dossier opens that model's screen, filtered
  // to the login. Every one of the ten models now has a screen, so no tile is
  // inert.
  const openModelForAccount = useCallback((modelKey, login) => {
    const map = {
      two_minute: 'twoMinute', weekend_holding: 'weekend', one_percent: 'onePercent',
      max_lot: 'maxLot', minimum_trading_days: 'minDays', news_trading: 'news',
      gambling: 'gambling', order_book_spam: 'obs',
      reverse_trading: 'reverse', group_trading: 'group',
    }
    if (!login || !map[modelKey]) return
    setModelAccount(login)
    setScreen(map[modelKey])
    window.scrollTo && window.scrollTo(0, 0)
  }, [])

  // navGo.<screen>() for every routable screen. Screens receive this object and
  // call into it by key, so it has to cover the same set the router below does.
  // `go` is recreated each render but only closes over setters, so an empty dep
  // list is safe and keeps the handler identities stable across renders.
  const navGo = useMemo(() => Object.fromEntries(SCREEN_KEYS.map((k) => [k, () => go(k)])), [])

  // ---- product mode (Risk tool / Compliance) ----
  // Derived, never stored: whichever nav owns the current screen is the active
  // mode, so the toggle always reflects what's on screen. Switching lands on
  // that mode's home screen.
  const mode = MODE_OF_SCREEN[screen] || 'risk'
  const switchMode = (m) => { if (m !== mode) go(MODES[m].home) }
  const activeNav = MODES[mode]

  // ---- auth ----
  const user = useMemo(() => userFromToken(idToken), [idToken])

  const handleLogin = (data, remember) => {
    signIn(data, remember)
    go(MODES.risk.home)
  }

  const handleLogout = () => {
    signOut()
    setScreen(MODES.risk.home) // where we land on the next successful sign-in
  }

  // ---- overview ----
  // Keyed on idToken so it fires once the session exists rather than on mount;
  // `overview` stays null until then, which the derived values below tolerate.
  useEffect(() => {
    if (!idToken) return undefined
    let alive = true
    fetchOverview()
      .then((d) => { if (alive) { setOverview(d); setOverviewErr(null) } })
      .catch((e) => { if (alive) { setOverviewErr(e.message); setOverview(null) } })
    return () => { alive = false }
  }, [idToken])

  // ---- overview-derived render values ----
  // /api/overview/ returns per-model counts only, so there's no severity series
  // or account total to derive here (see decorateOverview).
  const ov = overview
  const ovd = useMemo(() => decorateOverview(ov), [ov])

  // ---- nav badge / topbar counters (active styling lives in NavButton) ----
  const openFlagsBadge = ovd ? ovd.totalFlags.toLocaleString() : '…'

  // Run History is parked ("coming soon") until a runs API exists. Its derived
  // logic lives in historyVals() (data.js) + RunHistory.jsx for when it returns.

  const themeLabel = theme === 'light' ? 'Dark' : 'Light'
  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))

  // ---- login gate: first thing rendered on launch, no app chrome around it ----
  // Placed after every hook above so hook order stays identical across renders.
  if (!idToken) {
    return (
      <div data-theme={theme} style={{ fontFamily: "'Geist',system-ui,-apple-system,sans-serif", fontSize: 13, lineHeight: 1.45, letterSpacing: '-0.005em', WebkitFontSmoothing: 'antialiased' }}>
        <Login onLogin={handleLogin} />
      </div>
    )
  }

  return (
    <div data-theme={theme} style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Geist',system-ui,-apple-system,sans-serif", fontSize: 13, lineHeight: 1.45, letterSpacing: '-0.005em', WebkitFontSmoothing: 'antialiased' }}>

      {/* backdrop behind the mobile drawer */}
      {isMobile && drawerOpen && (
        <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 40 }} />
      )}

      {/* ===================== SIDEBAR ===================== */}
      <aside style={isMobile
        ? { width: 264, flex: 'none', borderRight: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, height: '100vh', overflowY: 'auto', zIndex: 50, transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform .22s ease', boxShadow: drawerOpen ? 'var(--shadow-lg)' : 'none' }
        : { width: 248, flex: 'none', borderRight: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        <div style={{ padding: '20px 18px 16px', display: 'flex', alignItems: 'center', gap: 11, borderBottom: '1px solid var(--hair)' }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <div style={{ width: 13, height: 13, border: '2.5px solid var(--accent-fg)', borderRadius: '50%', borderRightColor: 'transparent', transform: 'rotate(-45deg)' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, letterSpacing: '-0.01em', lineHeight: 1.1 }}>Risk tool</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: "'Geist Mono',monospace", letterSpacing: 0 }}>Alpha Capital </div>
          </div>
        </div>

        <div style={{ paddingTop: 14 }}>
          <ModeToggle mode={mode} onChange={switchMode} />
        </div>

        <nav style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {activeNav.sections.map((section, i) => (
            <Fragment key={section.title}>
              <div style={{ ...navSectionLabel, ...(i === 0 ? { padding: '8px 10px 6px' } : null) }}>{section.title}</div>
              {section.items.map((item) => (
                <NavButton key={item.key} item={item} active={screen === item.key} onClick={navGo[item.key]} badge={openFlagsBadge} />
              ))}
            </Fragment>
          ))}

          {/* {activeNav.showRules && (
            <>
              <div style={navSectionLabel}>Configured rules</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '0 4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 8px', color: 'var(--text-2)', fontSize: 12 }}><span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 10, fontWeight: 600, color: 'var(--crit)', width: 34 }}>RT-1</span>Reverse · 2 users</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 8px', color: 'var(--text-2)', fontSize: 12 }}><span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 10, fontWeight: 600, color: 'var(--crit)', width: 34 }}>RT-2</span>Correlated hedge</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 8px', color: 'var(--text-2)', fontSize: 12 }}><span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 10, fontWeight: 600, color: 'var(--high)', width: 34 }}>GT-1</span>Same direction</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 8px', color: 'var(--text-2)', fontSize: 12 }}><span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 10, fontWeight: 600, color: 'var(--high)', width: 34 }}>GT-2</span>Opposite sides</div>
              </div>
            </>
          )} */}
        </nav>

        <div style={{ marginTop: 'auto', padding: 14, borderTop: '1px solid var(--hair)', display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 12, flex: 'none' }}>
            {(user?.email || '?').slice(0, 2).toUpperCase()}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={user?.email || ''}>{user?.email || 'Signed in'}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Compliance Team</div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
            style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 7, cursor: 'pointer', color: 'var(--text-2)' }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M6 2H3.5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1H6M10.5 11l3-3-3-3M13.2 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </aside>

      {/* ===================== MAIN ===================== */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'auto' }}>

        {/* topbar */}
        <div style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 14, padding: isMobile ? '10px 16px' : '18px 26px', background: 'color-mix(in srgb, var(--surface) 82%, transparent)', backdropFilter: 'saturate(1.4) blur(10px)', borderBottom: '1px solid var(--border)' }}>
          {isMobile && (
            <button onClick={() => setDrawerOpen(true)} aria-label="Open menu" style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-2)' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            </button>
          )}
          {/* <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 380, background: 'var(--inset)', border: '1px solid var(--border)', borderRadius: 9, padding: '7px 11px' }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flex: 'none' }}><circle cx="6.3" cy="6.3" r="4.6" stroke="var(--text-3)" strokeWidth="1.5" /><line x1="9.7" y1="9.7" x2="13.5" y2="13.5" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round" /></svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search flag IDs…" style={{ border: 'none', background: 'transparent', outline: 'none', font: 'inherit', color: 'var(--text)', width: '100%' }} />
          </div> */}
          <div style={{ flex: 1 }} />
          <div style={{ display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text-2)', padding: '4px 11px', border: '1px solid var(--border)', borderRadius: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ok)', animation: 'pulse 1.8s ease-in-out infinite', flex: 'none' }} />
            Live · <span style={{ fontFamily: "'Geist Mono',monospace" }}>{openFlagsBadge}</span> flags
          </div>
          <button className="theme-btn" onClick={toggleTheme} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 6, cursor: 'pointer', font: 'inherit', fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>
            <span style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid currentColor', background: 'linear-gradient(90deg, currentColor 50%, transparent 50%)', display: 'inline-block' }} />{themeLabel}
          </button>
        </div>

        {screen === 'overview' && (
          <Overview navGo={navGo} ov={ovd} error={overviewErr} loading={!ov && !overviewErr} />
        )}
        {screen === 'account' && <AccountSummary initialLogin={accountQuery} onViewModel={openModelForAccount} />}
        {screen === 'twoMinute' && <TwoMinute onAccountClick={openAccount} initialAccount={modelAccount} />}
        {screen === 'weekend' && <WeekendHolding onAccountClick={openAccount} initialAccount={modelAccount} />}
        {screen === 'onePercent' && <OnePercent onAccountClick={openAccount} initialAccount={modelAccount} />}
        {screen === 'maxLot' && <MaxLot onAccountClick={openAccount} initialAccount={modelAccount} />}
        {screen === 'minDays' && <MinimumTradingDays onAccountClick={openAccount} initialAccount={modelAccount} />}
        {screen === 'news' && <NewsTrading onAccountClick={openAccount} initialAccount={modelAccount} />}
        {screen === 'gambling' && <Gambling onAccountClick={openAccount} initialAccount={modelAccount} />}
        {screen === 'obs' && <OrderBookSpam onAccountClick={openAccount} initialAccount={modelAccount} />}
        {screen === 'reverse' && <ReverseTrading onAccountClick={openAccount} initialAccount={modelAccount} />}
        {screen === 'group' && <GroupTrading onAccountClick={openAccount} initialAccount={modelAccount} />}
        {screen === 'groupOccasions' && <GroupOccasions onAccountClick={openAccount} />}
        {screen === 'flagSignals' && <FlagSignals onAccountClick={openAccount} />}
        {screen === 'flagAccounts' && <FlagAccounts onAccountClick={openAccount} />}
        {screen === 'matchOccurrences' && <MatchOccurrences onAccountClick={openAccount} />}
        {screen === 'todProfile' && <UserTodProfile onAccountClick={openAccount} />}
        {screen === 'durationProfile' && <UserDurationProfile onAccountClick={openAccount} />}
        {screen === 'compliance1' && <Compliance1/>}
        {screen === 'compliance' && <Compliance/>}
        {screen === 'events' && <NewsEvents />}
        {screen === 'logs' && <Logs />}
        {screen === 'history' && (
          <ComingSoon title="Run History" />
        )}
      </main>
    </div>
  )
}
