import { useState, useEffect, useMemo, useRef } from 'react'
import { fetchDashVersions, fetchDashViewUrl } from '../api.js'
import { readVersions, isStale, fmtStale, fmtBytes, STALE_HOURS } from '../dashModel.js'
import { fmtDate, fmtDay, fmtAgo } from '../data.js'
import { Spinner } from '../components/Loaders.jsx'

// One published dashboard, rendered in an iframe.
//
// The bundle is a self-contained HTML page on the viewer host — this app never
// parses it, it only asks the dash API for a short-lived URL and frames it.
// Two things outside this file decide whether anything appears at all, and BOTH
// fail as a silently empty frame rather than an error:
//
//   1. APP_ORIGIN on the viewer Worker must name this app's origin. Until it
//      does, the viewer refuses to be framed here.
//   2. frame-src in the app's CSP (netlify.toml) must list the viewer host.
//
// Hence the "still blank?" hint below the frame: with no error event to catch,
// telling the operator where to look is the only diagnosis available.

// allow-scripts: the bundles run Plotly inline. allow-same-origin: they fetch
// their own companion data.json. Everything else — forms, popups, downloads,
// top-level navigation — stays denied, which is also what keeps the framed page
// from navigating this tab away.
const SANDBOX = 'allow-scripts allow-same-origin'

// Whatever the dash API hands back is about to become an iframe src, so
// anything that isn't an absolute https URL is refused rather than framed.
function httpsOnly(raw) {
  try { return new URL(raw).protocol === 'https:' ? raw : '' } catch { return '' }
}

const kindChip = (kind) =>
  kind === 'refresh'
    ? { label: 'Refresh', color: 'var(--info)', bg: 'var(--info-soft)' }
    : { label: 'Authored', color: 'var(--text-3)', bg: 'var(--inset)' }

function Banner({ tone, title, children }) {
  const color = `var(--${tone})`
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 13px', background: `var(--${tone}-soft)`, border: `1px solid color-mix(in srgb,${color} 25%,transparent)`, borderRadius: 9, fontSize: 12.5 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flex: 'none', marginTop: 6 }} />
      <div><b>{title}</b> <span style={{ color: 'var(--text-2)' }}>{children}</span></div>
    </div>
  )
}

// Versions newest-first, refreshes marked. Collapsed to a button until opened
// so a single-version dashboard costs no vertical space.
function VersionPicker({ versions, activeId, currentId, onPick }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const away = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc) }
  }, [open])

  const active = versions.find((v) => v.versionId === activeId)
  const activeIdx = versions.findIndex((v) => v.versionId === activeId)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={versions.length === 0}
        style={{ display: 'flex', alignItems: 'center', gap: 8, font: 'inherit', fontSize: 12.5, fontWeight: 600, color: 'var(--text)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', cursor: versions.length ? 'pointer' : 'default' }}
      >
        <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 11.5, color: 'var(--text-2)' }}>
          {activeIdx >= 0 ? `v${versions.length - activeIdx}` : '—'}
        </span>
        {active ? fmtDate(active.publishedAt) || active.versionId : 'Versions'}
        <span style={{ color: 'var(--text-3)', fontSize: 10 }}>▾</span>
      </button>

      {open && (
        <div role="listbox" style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 30, minWidth: 320, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
          {versions.map((v, i) => {
            const on = v.versionId === activeId
            const chip = kindChip(v.kind)
            return (
              <button
                key={v.versionId}
                role="option"
                aria-selected={on}
                onClick={() => { setOpen(false); onPick(v, v.versionId === currentId) }}
                style={{ display: 'block', width: '100%', textAlign: 'left', font: 'inherit', border: 'none', borderBottom: i === versions.length - 1 ? 'none' : '1px solid var(--hair)', background: on ? 'var(--accent-soft)' : 'transparent', color: 'var(--text)', padding: '10px 13px', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 11, fontWeight: 600, color: on ? 'var(--accent)' : 'var(--text-3)' }}>v{versions.length - i}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>{fmtDate(v.publishedAt)}</span>
                  <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: chip.color, background: chip.bg, padding: '1px 6px', borderRadius: 20 }}>{chip.label}</span>
                  {/* "Current" comes from current_version_id, not position: a
                      rollback promotes an older version, and then the newest
                      publish is no longer the one being served. */}
                  {v.versionId === currentId && <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ok)', background: 'var(--ok-soft)', padding: '1px 6px', borderRadius: 20 }}>Current</span>}
                  {isStale(v) && <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--med)', background: 'var(--med-soft)', padding: '1px 6px', borderRadius: 20 }}>Stale</span>}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                  Data run {fmtDay(v.dataRunDate)} · {fmtStale(v.staleHours)} old at publish
                  {v.bytes ? ` · ${fmtBytes(v.bytes)}` : ''}
                </div>
                {/* Null on every refresh — the nightly job leaves no note. */}
                {v.notes && <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 3 }}>{v.notes}</div>}
                {v.publisherLabel && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>{v.publisherLabel}</div>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function DashViewer({ entry, slug, pinnedVersion, onPinVersion, onBack }) {
  // null until loaded; then { currentVersionId, versions, nextCursor }.
  const [vs, setVs] = useState(null)
  // null until issued; then { url, versionId, expiresAt } from view-url.
  const [view, setView] = useState(null)
  const [error, setError] = useState(null)
  const [framed, setFramed] = useState(false) // the iframe has fired onLoad
  // Bumped to re-request a view URL for the same version, which is the only way
  // to recover once the current one has expired.
  const [reissue, setReissue] = useState(0)
  const [expired, setExpired] = useState(false)

  const title = entry?.title || slug

  // Versions load once per dashboard; the view URL is refetched per version.
  useEffect(() => {
    let alive = true
    setVs(null)
    setError(null)
    fetchDashVersions(slug)
      .then((d) => { if (alive) setVs(readVersions(d)) })
      .catch((e) => { if (alive) { setError(e.message); setVs({ currentVersionId: '', versions: [], nextCursor: null }) } })
    return () => { alive = false }
  }, [slug])

  // Which version is on screen. An unknown ?v= is reported but not fatal — a
  // promoted-away version shouldn't leave the tab stuck on an error.
  const known = useMemo(() => vs?.versions || [], [vs])
  // The served version, per current_version_id — falling back to the newest
  // publish only when the API omits it.
  const current = useMemo(
    () => known.find((v) => v.versionId === vs?.currentVersionId) || known[0] || null,
    [known, vs],
  )
  const active = useMemo(
    () => known.find((v) => v.versionId === pinnedVersion) || current,
    [known, pinnedVersion, current],
  )
  const pinnedButUnknown = Boolean(pinnedVersion) && known.length > 0 && !known.some((v) => v.versionId === pinnedVersion)
  const notLatest = Boolean(active && current && active.versionId !== current.versionId)

  // A view URL is a signed, expiring capability, so it is requested for the
  // version actually on screen and never cached across the picker.
  useEffect(() => {
    if (!active) return undefined
    let alive = true
    setView(null)
    setFramed(false)
    setExpired(false)
    setError(null)
    // Send the id only when pinning an older version; asking for "current"
    // without one is what the API expects for the normal case.
    fetchDashViewUrl(slug, notLatest ? active.versionId : undefined)
      .then((d) => {
        if (!alive) return
        const url = httpsOnly(d?.url || '')
        if (url) setView({ url, versionId: d?.version_id || '', expiresAt: d?.expires_at || '' })
        else setError('The dash API did not return a usable https view URL.')
      })
      .catch((e) => { if (alive) setError(e.message) })
    return () => { alive = false }
  }, [slug, active, notLatest, reissue])

  // Say so the moment the token dies, rather than leaving the reader to
  // discover it as a panel that quietly stops loading. The frame stays in
  // place: what already rendered is still valid, it is further fetches by the
  // page that start failing.
  // Comparing against Date.now() belongs here rather than in the render body:
  // the clock moves on its own, so reading it while rendering makes the output
  // depend on when React happened to run.
  useEffect(() => {
    const at = Date.parse(view?.expiresAt || '')
    if (!Number.isFinite(at)) { setExpired(false); return undefined }
    const ms = at - Date.now()
    if (ms <= 0) { setExpired(true); return undefined }
    setExpired(false)
    // Past ~24.8 days setTimeout overflows and fires immediately; a token valid
    // that long is not one worth watching.
    if (ms > 2 ** 31 - 1) return undefined
    const t = setTimeout(() => setExpired(true), ms)
    return () => clearTimeout(t)
  }, [view])

  const viewUrl = view?.url || ''
  const loading = vs === null || (!viewUrl && !error)
  const bundle = fmtBytes(active?.bytes)

  return (
    <section style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '20px 30px 26px', maxWidth: 1380, margin: '0 auto', width: '100%' }}>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ minWidth: 0 }}>
          {/* A real button, not bare text: this is the only way out of the
              viewer, and the frame below fills the screen — so it has to read
              as an affordance at a glance rather than as a caption. */}
          <button
            className="ghost-btn"
            onClick={onBack}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, font: 'inherit', fontSize: 12.5, fontWeight: 600, color: 'var(--text)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 13px', marginBottom: 12, cursor: 'pointer' }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            All dashboards
          </button>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{title}</h1>
          <div style={{ color: 'var(--text-2)', fontSize: 12.5 }}>
            <span style={{ fontFamily: "'Geist Mono',monospace", color: 'var(--text-3)' }}>{slug}</span>
            {active?.dataRunDate ? ` · data run ${fmtDay(active.dataRunDate)}` : ''}
            {active?.publishedAt ? ` · published ${fmtAgo(active.publishedAt)}` : ''}
            {bundle ? ` · ${bundle}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Opening the signed URL as a top-level page, which frame-ancestors
              does not restrict — so this still works when the iframe is being
              refused, and is the quickest way to tell "the viewer won't embed"
              apart from "the bundle itself is broken".
              noopener/noreferrer: the target must not reach back through
              window.opener, and the signed URL must not travel as a Referer. */}
          {viewUrl && (
            <a
              className="ghost-btn"
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, font: 'inherit', fontSize: 12.5, fontWeight: 600, color: 'var(--text)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', textDecoration: 'none' }}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M9.5 2.5H13.5V6.5M13.5 2.5 7.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 9.8v2.7a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 2 12.5v-7A1.5 1.5 0 0 1 3.5 4h2.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Open in new tab
            </a>
          )}
          <VersionPicker
            versions={known}
            activeId={active?.versionId || ''}
            currentId={current?.versionId || ''}
            // Picking the newest clears ?v= entirely, so the URL only carries a
            // pin when one is actually in force.
            onPick={(v, isLatest) => onPinVersion(isLatest ? null : v.versionId)}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 14 }}>
        {notLatest && (
          <Banner tone="info" title="You’re viewing an older version.">
            Published {fmtDate(active.publishedAt)} from the {fmtDay(active.dataRunDate)} data run.{' '}
            <button onClick={() => onPinVersion(null)} style={{ font: 'inherit', fontSize: 12.5, fontWeight: 600, color: 'var(--info)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}>
              Go to the latest
            </button>
          </Banner>
        )}
        {pinnedButUnknown && (
          <Banner tone="high" title="That version no longer exists.">
            <span style={{ fontFamily: "'Geist Mono',monospace" }}>{pinnedVersion}</span> isn’t in this dashboard’s history — showing the latest instead.
          </Banner>
        )}
        {isStale(active) && (
          <Banner tone="med" title="Built from a stale extract.">
            The {fmtDay(active.dataRunDate)} data run was already {fmtStale(active.staleHours)} old when this was published — past the {STALE_HOURS}h threshold. Treat the numbers as indicative.
          </Banner>
        )}
        {expired && !error && (
          <Banner tone="high" title="This view link has expired.">
            The signed URL issued {fmtAgo(view?.expiresAt)} has lapsed. What is already drawn stays on screen, but anything the page loads from here on will fail.{' '}
            {/* The fetch effect clears `view`, so `expired` falls back to false
                on its own — no second piece of state to reset here. */}
            <button onClick={() => setReissue((n) => n + 1)} style={{ font: 'inherit', fontSize: 12.5, fontWeight: 600, color: 'var(--high)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}>
              Get a fresh link
            </button>
          </Banner>
        )}
        {error && <Banner tone="crit" title="Couldn’t open this dashboard.">{error}</Banner>}
      </div>

      {/* The frame fills the rest of the viewport; the dashboards scroll inside
          it, so the shell must not add a second scrollbar around them. */}
      <div style={{ position: 'relative', flex: 1, minHeight: 520, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
        {viewUrl && (
          <iframe
            key={viewUrl}
            src={viewUrl}
            title={title}
            sandbox={SANDBOX}
            referrerPolicy="no-referrer"
            onLoad={() => setFramed(true)}
            style={{ display: 'block', width: '100%', height: '100%', border: 'none', background: 'var(--surface)' }}
          />
        )}

        {/* Overlay rather than a replacement: the heavy fixtures take a while
            over the wire, and swapping the frame out would restart the load. */}
        {(loading || (viewUrl && !framed)) && !error && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'var(--surface)' }}>
            <Spinner size={22} stroke={2.5} color="var(--accent)" label="Loading dashboard" />
            <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
              {vs === null ? 'Loading versions…' : !viewUrl ? 'Requesting a view URL…' : 'Rendering the dashboard…'}
            </div>
            {bundle && viewUrl && <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{bundle} bundle — this can take a moment.</div>}
          </div>
        )}
      </div>

      {/* Neither of the two gates raises an event we can catch, so the only
          useful failure mode is telling the operator exactly where to look. */}
      <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--text-3)' }}>
        Frame blank or “refused to connect”? Check <span style={{ fontFamily: "'Geist Mono',monospace" }}>frame-src</span> in the app CSP (netlify.toml) and <span style={{ fontFamily: "'Geist Mono',monospace" }}>APP_ORIGIN</span> on the viewer Worker — both block silently. <b>Open in new tab</b> loads the same URL as a top-level page, which neither restricts: if it renders there but not here, the block is one of those two and not the dashboard.
      </div>
    </section>
  )
}
