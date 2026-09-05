import { useState, useEffect, useMemo, useCallback } from 'react'
import { fetchDashCatalogue } from '../api.js'
import { readCatalogue, isStale, fmtStale, fmtBytes, STALE_HOURS } from '../dashModel.js'
import { fmtDay, fmtAgo } from '../data.js'
import { SkeletonBar } from '../components/Loaders.jsx'
import DashViewer from './DashViewer.jsx'

// The Custom Dash tab: a grid of published dashboards, each opening into an
// iframe. Unlike every other screen in the app, the content here is authored
// outside the codebase — this tab only lists what the dash API reports and
// frames the bundle it hands back.

// Two-line clamp on the description. Some are written long on purpose
// (evaluation-funnel), and an unclamped one would push the tile's footer out of
// line with its neighbours in the grid.
const clamp2 = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  fontSize: 12.5,
  color: 'var(--text-2)',
  lineHeight: 1.45,
  minHeight: '2.9em', // reserve both lines so short and long tiles align
}

function StaleBadge({ hours }) {
  return (
    <span
      title={`Published from an extract already ${fmtStale(hours)} old — past the ${STALE_HOURS}h threshold`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flex: 'none', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--med)', background: 'var(--med-soft)', border: '1px solid color-mix(in srgb,var(--med) 30%,transparent)', padding: '2px 7px', borderRadius: 20 }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--med)' }} />
      Stale · {fmtStale(hours)}
    </span>
  )
}

// One fact and its label, stacked. The tile footer is a row of these so the
// three numbers line up across tiles regardless of description length.
function Fact({ label, value, mono }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', ...(mono ? { fontFamily: "'Geist Mono',monospace" } : null) }}>{value}</div>
    </div>
  )
}

function Tile({ entry, onOpen }) {
  const cur = entry.current
  const stale = isStale(cur)
  return (
    <button
      onClick={() => onOpen(entry)}
      className="ghost-btn"
      style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', font: 'inherit', padding: 16, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow)', cursor: 'pointer', color: 'var(--text)' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          {/* A folder, because that is what a dashboard is here: a slug holding
              one or more published versions of the same report. */}
          <span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M2.5 5.5A1.5 1.5 0 0 1 4 4h3.4a1.5 1.5 0 0 1 1.06.44l.94.94H16a1.5 1.5 0 0 1 1.5 1.5v7.62A1.5 1.5 0 0 1 16 16H4a1.5 1.5 0 0 1-1.5-1.5V5.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.title}</div>
            <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: 11, color: 'var(--text-3)' }}>{entry.slug}</div>
          </div>
        </div>
        {stale && <StaleBadge hours={cur.staleHours} />}
      </div>

      <div style={clamp2}>{entry.description}</div>

      {/* What the latest publish was: a data refresh or a rebuild, and how many
          versions sit behind it. A single-version dashboard says nothing. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', padding: '1px 6px', borderRadius: 20, ...(cur?.kind === 'refresh' ? { color: 'var(--info)', background: 'var(--info-soft)' } : { color: 'var(--text-3)', background: 'var(--inset)' }) }}>
          {cur?.kind === 'refresh' ? 'Refresh' : 'Authored'}
        </span>
        {entry.versionsCount > 1 && (
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: "'Geist Mono',monospace" }}>{entry.versionsCount} versions</span>
        )}
      </div>

      {/* data_run_date is the date the numbers describe; published_at is when
          the build landed. They are not the same day on a stale publish, which
          is the whole point of showing both. */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, marginTop: 'auto', paddingTop: 9, borderTop: '1px solid var(--hair)' }}>
        <Fact label="Data run" value={fmtDay(cur?.dataRunDate)} />
        <Fact label="Published" value={fmtAgo(cur?.publishedAt)} />
        <Fact label="Size" value={fmtBytes(cur?.bytes) || '—'} mono />
      </div>
    </button>
  )
}

function TileSkeleton() {
  return (
    <div style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <SkeletonBar width={32} height={32} radius={9} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SkeletonBar width="55%" height={13} />
          <SkeletonBar width="35%" height={10} delay={0.1} />
        </div>
      </div>
      <SkeletonBar height={11} delay={0.15} />
      <SkeletonBar width="70%" height={11} delay={0.2} />
    </div>
  )
}

export default function CustomDash({ slug, version, onNavigate }) {
  const [entries, setEntries] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    let alive = true
    setError(null)
    fetchDashCatalogue()
      .then((d) => { if (alive) setEntries(readCatalogue(d)) })
      .catch((e) => { if (alive) { setError(e.message); setEntries([]) } })
    return () => { alive = false }
  }, [])

  // The catalogue backs both views: opening a dashboard deep-linked by URL
  // still needs its title and description, so it is fetched either way.
  useEffect(() => load(), [load])

  const open = useMemo(
    () => (slug ? (entries || []).find((e) => e.slug === slug) || { slug, title: slug } : null),
    [slug, entries],
  )

  if (open) {
    return (
      <DashViewer
        // Deep-linked straight to ?d=, the catalogue may not have landed yet;
        // `open` then carries the slug as a stand-in title until it does.
        entry={open}
        slug={open.slug}
        pinnedVersion={version}
        onPinVersion={(v) => onNavigate(open.slug, v)}
        onBack={() => onNavigate(null, null)}
      />
    )
  }

  const list = entries || []

  return (
    <section style={{ padding: '24px 30px 46px', maxWidth: 1380, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Custom Dash</h1>
          <div style={{ color: 'var(--text-2)', fontSize: 13 }}>
            Published dashboards, newest first.
            {entries && <> <span style={{ fontFamily: "'Geist Mono',monospace", color: 'var(--text-3)' }}>{list.length}</span> available.</>}
          </div>
        </div>
        <button
          className="ghost-btn"
          onClick={() => { setEntries(null); load() }}
          style={{ font: 'inherit', fontWeight: 600, fontSize: 12.5, color: 'var(--text)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}
        >
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 14, padding: '12px 14px', background: 'var(--crit-soft)', border: '1px solid color-mix(in srgb,var(--crit) 25%,transparent)', borderRadius: 9, fontSize: 12.5, color: 'var(--text)' }}>
          {/* The function's own "not configured" reply arrives here as its
              detail string, which already names the two vars to set — the
              likeliest failure on a fresh deploy explains itself. */}
          <b>Couldn’t load the catalogue.</b> <span style={{ color: 'var(--text-2)' }}>{error}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 14, alignItems: 'stretch' }}>
        {entries === null
          ? Array.from({ length: 4 }, (_, i) => <TileSkeleton key={i} />)
          : list.map((e) => <Tile key={e.slug} entry={e} onOpen={(x) => onNavigate(x.slug, null)} />)}
      </div>

      {entries !== null && list.length === 0 && !error && (
        <div style={{ padding: '46px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
          No dashboards published yet.
        </div>
      )}
    </section>
  )
}
