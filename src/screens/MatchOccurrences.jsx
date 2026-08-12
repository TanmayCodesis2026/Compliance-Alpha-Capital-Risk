import TradeFlags from './TradeFlags.jsx'
import { fetchMatchOccurrences } from '../api.js'
import { fmtAgo, fmtDate, fmtDay, sigFull } from '../data.js'
import { DirectionPill, Field, FieldGrid, Mono, Pill } from '../components/ScanFields.jsx'

// GET /api/match-occurrences/ — one row per day a group of accounts matched on
// one instrument. This is the cross-account view the old Analysis table showed,
// so the columns follow that layout: when it happened, which flag, who was in
// it, on what, which signals fired, and how many trades matched.
//
//   { id, occurrence_id, flag_type, group_key, pair, instrument, day,
//     occurred_on, direction, users[], matches[{ trade_id, user_id, account,
//     platform, direction }], match_count, signals{ CODE: { num_users } },
//     created_at }

const typeTone = (t) => (/^RT/i.test(t || '') ? 'crit' : 'high')

// occurrence_id is flag_type + a 64-char group hash + instrument + day, which
// is far too wide for a cell. The hash prefix is what a reviewer actually
// matches against, so show that and keep the whole string in the title and in
// the expanded panel.
const shortId = (r) => {
  const key = r.group_key ? String(r.group_key).slice(0, 10) : null
  if (key) return `${r.flag_type || '—'}-${key}`
  return String(r.occurrence_id || r.id || '—').slice(0, 22)
}

const signalCodes = (r) => (r.signals && typeof r.signals === 'object' ? Object.keys(r.signals) : [])

const columns = [
  { key: 'occurred_on', label: 'Occurred', width: 120, muted: true, render: (r) => fmtDay(r.occurred_on || r.day) },
  { key: 'occurrence_id', label: 'Flag ID', width: 190, mono: true, render: (r) => (
      <span title={r.occurrence_id || r.id} style={{ fontWeight: 600, color: 'var(--accent)' }}>{shortId(r)}</span>
    ) },
  { key: 'flag_type', label: 'Type', width: 72, render: (r) => (
      r.flag_type ? <Pill tone={typeTone(r.flag_type)} mono>{r.flag_type}</Pill> : <span style={{ color: 'var(--text-3)' }}>—</span>
    ) },
  { key: 'direction', label: 'Direction', width: 95, render: (r) => <DirectionPill direction={r.direction} /> },
  { key: 'users', label: 'Users', width: 190, mono: true, muted: true, render: (r) => {
      const u = r.users || []
      return u.length ? u.join(' · ') : '—'
    } },
  { key: 'num_users', label: '# Usr', width: 62, align: 'right', mono: true, render: (r) => (r.users || []).length || '—' },
  { key: 'instrument', label: 'Instrument', width: 100, mono: true },
  { key: 'signals', label: 'Signals', width: 170, render: (r) => {
      const codes = signalCodes(r)
      if (!codes.length) return <span style={{ color: 'var(--text-3)' }}>—</span>
      return (
        <span style={{ display: 'flex', gap: 5, flexWrap: 'nowrap' }}>
          {codes.map((c) => (
            <span
              key={c}
              title={`${sigFull[c] || c}${r.signals[c]?.num_users != null ? ` · ${r.signals[c].num_users} users` : ''}`}
              style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '0.03em', fontFamily: "'Geist Mono',monospace", color: 'var(--text-2)', background: 'var(--inset)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: 5 }}
            >
              {c}
            </span>
          ))}
        </span>
      )
    } },
  { key: 'match_count', label: 'Matches', width: 80, align: 'right', mono: true, render: (r) => Number(r.match_count ?? (r.matches || []).length).toLocaleString() },
  { key: 'created_at', label: 'Detected', width: 110, muted: true, render: (r) => (
      <span title={fmtDate(r.created_at)}>{fmtAgo(r.created_at)}</span>
    ) },
]

// The matched trades and the full identifiers, rendered from the row — this
// endpoint is list-only, so expanding issues no request.
const inlineDetail = (r) => {
  const matches = Array.isArray(r.matches) ? r.matches : []
  const codes = signalCodes(r)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* the occurrence id and group hash are 64+ chars — they get their own
          wide tracks so they wrap over two lines rather than twelve */}
      <FieldGrid min={320}>
        <Field label="Occurrence ID"><Mono>{r.occurrence_id || r.id}</Mono></Field>
        <Field label="Group key"><Mono>{r.group_key}</Mono></Field>
      </FieldGrid>

      <FieldGrid>
        <Field label="Pair"><Mono>{r.pair}</Mono></Field>
        <Field label="Instrument"><Mono>{r.instrument}</Mono></Field>
        <Field label="Direction"><DirectionPill direction={r.direction} /></Field>
        <Field label="Day"><Mono>{fmtDay(r.day)}</Mono></Field>
        <Field label="Detected"><Mono>{fmtDate(r.created_at)}</Mono></Field>
      </FieldGrid>

      {codes.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)', marginBottom: 6 }}>
            Signals · {codes.length}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {codes.map((c) => (
              <div key={c} style={{ background: 'var(--inset)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 11px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{c}</span>
                  {r.signals[c]?.num_users != null && (
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{r.signals[c].num_users} users</span>
                  )}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 2 }}>{sigFull[c] || c}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)', marginBottom: 6 }}>
          Matched trades · {matches.length}
        </div>
        {matches.length === 0 ? (
          <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>No constituent trades on this occurrence.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {matches.map((m, i) => (
              <div key={m.trade_id || i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 11px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ flex: 'none', fontSize: 10, fontWeight: 700, color: 'var(--text-3)', fontFamily: "'Geist Mono',monospace", paddingTop: 2 }}>#{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <FieldGrid min={120}>
                    <Field label="Trade ID"><Mono>{m.trade_id}</Mono></Field>
                    <Field label="User"><Mono>{m.user_id}</Mono></Field>
                    <Field label="Account"><Mono>{m.account}</Mono></Field>
                    <Field label="Platform"><Mono>{m.platform}</Mono></Field>
                    <Field label="Direction"><DirectionPill direction={m.direction} /></Field>
                  </FieldGrid>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MatchOccurrences({ onAccountClick, initialAccount }) {
  return (
    <TradeFlags
      title="Match Occurrences"
      subtitle="Every recorded occasion a group of accounts matched on one instrument. Recurrence across days is what gates RT and GT severity. Expand a row for its constituent trades."
      searchPlaceholder="Search flag IDs…"
      fetcher={fetchMatchOccurrences}
      columns={columns}
      inlineDetail={inlineDetail}
      onAccountClick={onAccountClick}
      initialAccount={initialAccount}
      filters={[
        { param: 'flag_type', label: 'Type', options: [
          { value: 'RT-1', label: 'RT-1', mono: true, color: 'var(--crit)', soft: 'var(--crit-soft)' },
          { value: 'RT-2', label: 'RT-2', mono: true, color: 'var(--crit)', soft: 'var(--crit-soft)' },
          { value: 'GT-1', label: 'GT-1', mono: true, color: 'var(--high)', soft: 'var(--high-soft)' },
          { value: 'GT-2', label: 'GT-2', mono: true, color: 'var(--high)', soft: 'var(--high-soft)' },
        ] },
        { param: 'direction', label: 'Direction', options: [
          { value: 'LONG', label: 'Long', color: 'var(--ok)', soft: 'var(--ok-soft)' },
          { value: 'SHORT', label: 'Short', color: 'var(--crit)', soft: 'var(--crit-soft)' },
        ] },
        { param: 'instrument', label: 'Instrument', type: 'text', placeholder: 'CHFJPY', upper: true, width: 110 },
        { param: 'day', label: 'Day', type: 'text', placeholder: 'YYYY-MM-DD', width: 120 },
      ]}
    />
  )
}
