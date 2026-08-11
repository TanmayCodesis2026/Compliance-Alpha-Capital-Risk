import { useState, useEffect, useCallback } from 'react'
import { fetchReviewState, postReviewDecision } from '../api.js'
import { fmtDate } from '../data.js'

// R-4: compliance review/verdict widget, reusable everywhere a flag has a
// `source` + business `flag_id` — Investigation (RT/GT), each of the 6
// per-trade detection screens (via TradeFlags' `flagSource` prop), and Daily
// Report's inline expand.
const VERDICT_OPTIONS = [
  { value: '', label: 'No verdict' },
  { value: 'coincidence', label: 'Coincidence' },
  { value: 'flag', label: 'Flag' },
  { value: 'breach', label: 'Breach' },
]

const verdictStyle = (v) => {
  if (v === 'breach') return { color: 'var(--crit)', bg: 'var(--crit-soft)' }
  if (v === 'flag') return { color: 'var(--high)', bg: 'var(--high-soft)' }
  if (v === 'coincidence') return { color: 'var(--info)', bg: 'var(--info-soft)' }
  return { color: 'var(--text-3)', bg: 'var(--inset)' }
}

export default function ReviewPanel({ source, flagId }) {
  const [state, setState] = useState({ loading: true, error: null, data: null })
  const [reviewed, setReviewed] = useState(false)
  const [verdict, setVerdict] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saved, setSaved] = useState(false)

  const load = useCallback(() => {
    if (!source || !flagId) return undefined
    let alive = true
    setState({ loading: true, error: null, data: null })
    setSaved(false)
    fetchReviewState(source, flagId)
      .then((d) => {
        if (!alive) return
        setState({ loading: false, error: null, data: d })
        setReviewed(!!d?.reviewed)
        setVerdict(d?.verdict || '')
        setNotes(d?.notes || '')
      })
      .catch((e) => { if (alive) setState({ loading: false, error: e.message, data: null }) })
    return () => { alive = false }
  }, [source, flagId])

  useEffect(() => load(), [load])

  const save = () => {
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    // Never send reviewed_by — the server sets it from the logged-in user.
    postReviewDecision(source, flagId, { reviewed, verdict: verdict || null, notes })
      .then((d) => { setState((s) => ({ ...s, data: d })); setSaved(true) })
      .catch((e) => setSaveError(e.message))
      .finally(() => setSaving(false))
  }

  if (!source || !flagId) return null

  const data = state.data
  const vStyle = verdictStyle(verdict)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 600, fontSize: 12.5 }}>Compliance review</div>
        {data?.reviewed_by && (
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
            reviewed by <span style={{ color: 'var(--text-2)', fontFamily: "'Geist Mono',monospace" }}>{data.reviewed_by}</span>
            {data.reviewed_at && <> · {fmtDate(data.reviewed_at)}</>}
          </div>
        )}
      </div>

      {state.loading && <div className="skeleton" style={{ height: 60, borderRadius: 8 }} />}
      {!state.loading && state.error && (
        <div style={{ fontSize: 11.5, color: 'var(--crit)' }}>{state.error}</div>
      )}

      {!state.loading && !state.error && (
        <div style={{ background: 'var(--inset)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />
              Reviewed
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Verdict</span>
              <select
                value={verdict}
                onChange={(e) => setVerdict(e.target.value)}
                style={{ font: 'inherit', fontSize: 11.5, fontWeight: 600, color: vStyle.color, background: vStyle.bg, border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px' }}
              >
                {VERDICT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes…"
            rows={2}
            style={{ font: 'inherit', fontSize: 12, color: 'var(--text)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 10px', resize: 'vertical', width: '100%' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={save}
              disabled={saving}
              className="accent-btn"
              style={{ font: 'inherit', fontWeight: 600, fontSize: 11.5, color: 'var(--accent-fg)', background: 'var(--accent)', border: 'none', borderRadius: 7, padding: '6px 14px', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Saving…' : 'Save review'}
            </button>
            {saveError && <span style={{ fontSize: 11.5, color: 'var(--crit)' }}>{saveError}</span>}
            {!saveError && saved && <span style={{ fontSize: 11.5, color: 'var(--ok)' }}>Saved.</span>}
          </div>
        </div>
      )}
    </div>
  )
}
