import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ApiError, fetchAccountReview, fetchAccountReviewStatus, postAccountRecheck,
} from './api.js'

// The account page's data and its re-check lifecycle (T22).
//
// The stored review is shown at once; when the response says a re-check was
// queued (`refreshing` + `recheck.task_id`) this polls
// /account-review/status/ until the worker finishes, then swaps the new review
// in. The page never blanks while that happens — a failed or unreachable
// re-check leaves the stored review on screen.
//
// Imperative on purpose: the payload arrives three ways — attached to a
// search-submit (adopt), from a deep link or scope switch (load), or from
// "Re-check now" (recheckNow) — and each must replace the one before it. A
// sequence number drops any response that lands after a newer request.
//
//   const r = useAccountReview()
//   r.adopt(searchBody.review)                       // search-submit
//   r.load('2493329', scope)                         // deep link (queues a re-check)
//   r.load('2493329', scope, { refresh: false })     // scope switch, read only
//   r.recheckNow()

const POLL_MS = 2500
const UNAVAILABLE_RETRY_MS = 10000 // 503 / network: the queue is down, back off
const GIVE_UP_MS = 30 * 60 * 1000  // §3.1: stop after ~30 min, say it's still running

export function useAccountReview() {
  const [data, setData] = useState(null)        // the /account-review/ payload
  const [loading, setLoading] = useState(false) // a load() in flight
  const [error, setError] = useState(null)      // ApiError from the last load()
  const [task, setTask] = useState(null)        // { id, loginId } being polled
  const [stalled, setStalled] = useState(false) // polled past GIVE_UP_MS
  const [recheckNote, setRecheckNote] = useState(null)
  const [recheckError, setRecheckError] = useState(null) // failed re-check, for a toast
  const [rechecking, setRechecking] = useState(false)    // POST /recheck/ in flight

  const seq = useRef(0)
  // The login + scope the page currently shows, so recheckNow() re-checks
  // exactly what is on screen.
  const current = useRef({ loginId: null, scope: null })

  const apply = useCallback((payload, loginId, scope) => {
    current.current = { loginId, scope }
    setData(payload)
    setError(null)
    setStalled(false)
    setRecheckError(null)
    setRecheckNote(payload?.recheck?.note || null)
    const taskId = payload?.refreshing ? payload?.recheck?.task_id : null
    setTask(taskId ? { id: taskId, loginId } : null)
  }, [])

  // A payload that is already in hand: account-search's `review`.
  const adopt = useCallback((payload, scope = null) => {
    seq.current += 1
    setLoading(false)
    apply(payload, payload?.login_id ?? null, scope)
  }, [apply])

  const load = useCallback((loginId, scope, { refresh = true } = {}) => {
    const mine = ++seq.current
    setLoading(true)
    // A different account must not keep showing the previous one's verdict; the
    // same account (a scope switch) keeps it until the new scope arrives.
    if (current.current.loginId !== loginId) { setData(null); setTask(null) }
    return fetchAccountReview(loginId, scope, { refresh })
      .then((payload) => { if (mine === seq.current) apply(payload, loginId, scope) })
      .catch((e) => { if (mine === seq.current) setError(e) })
      .finally(() => { if (mine === seq.current) setLoading(false) })
  }, [apply])

  const recheckNow = useCallback(() => {
    const { loginId, scope } = current.current
    if (!loginId) return Promise.resolve()
    const mine = seq.current
    setRechecking(true)
    setRecheckError(null)
    return postAccountRecheck(loginId, scope)
      .then((res) => {
        if (mine !== seq.current) return
        // Rate limits and de-duplication are not errors: 200 + sent:false +
        // a note. `reused` hands back the task already running — poll that.
        setRecheckNote(res?.recheck?.note || null)
        setData((d) => (d ? { ...d, refreshing: !!res?.refreshing, recheck: res?.recheck, period_profit: res?.period_profit ?? d.period_profit } : d))
        const taskId = res?.refreshing ? res?.recheck?.task_id : null
        if (taskId) { setStalled(false); setTask({ id: taskId, loginId }) }
      })
      .catch((e) => { if (mine === seq.current) setRecheckError(e.message) })
      .finally(() => setRechecking(false))
  }, [])

  // ---- polling ----
  useEffect(() => {
    if (!task) return undefined
    let cancelled = false
    let timer = null
    const deadline = Date.now() + GIVE_UP_MS
    const mine = seq.current

    const stop = (patch) => {
      if (cancelled || mine !== seq.current) return
      setTask(null)
      setData((d) => (d ? { ...d, refreshing: false, ...patch } : d))
    }

    const poll = async () => {
      if (cancelled) return
      if (Date.now() > deadline) { setStalled(true); stop(); return }
      let next = POLL_MS
      try {
        const s = await fetchAccountReviewStatus(task.id, task.loginId)
        if (cancelled || mine !== seq.current) return
        if (s?.state === 'done') {
          if (s.review) { stop({ review: s.review }); return }
          // `done` without the review attached: read the stored one instead.
          const fresh = await fetchAccountReview(task.loginId, current.current.scope, { refresh: false })
          if (!cancelled && mine === seq.current) stop({ review: fresh?.review ?? null })
          return
        }
        if (s?.state === 'failed') {
          setRecheckError(s.error || 'The re-check failed. The stored review is still shown.')
          stop()
          return
        }
        if (s?.note) setRecheckNote(s.note)
      } catch (e) {
        if (cancelled) return
        if (e?.name === 'SessionExpiredError') return
        // 503: the queue is unreachable — keep the stored review, keep trying.
        if (e instanceof ApiError && e.isUnavailable) next = UNAVAILABLE_RETRY_MS
        else { setRecheckError(e.message); stop(); return }
      }
      timer = setTimeout(poll, next)
    }

    timer = setTimeout(poll, POLL_MS)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [task])

  // Stable, so a Toast keyed on it doesn't restart its timer every render.
  const dismissRecheckError = useCallback(() => setRecheckError(null), [])

  return {
    data,
    review: data?.review ?? null,
    loading,
    error,
    refreshing: !!task,
    stalled,
    rechecking,
    recheckNote,
    recheckError,
    dismissRecheckError,
    adopt,
    load,
    recheckNow,
  }
}
