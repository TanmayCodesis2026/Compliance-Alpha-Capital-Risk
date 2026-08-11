import { fmtDate, fmtDay, fmtMt5 } from '../data.js'
import { DirectionPill, Money, Mono, Pill } from './ScanFields.jsx'
import { stripPositionId } from './scanFormat.js'
import {
  isClockTime, isDay, isDirectionKey, isIso, isMoneyKey, isMt5Stamp,
} from './fieldLabel.js'

// Renders one API field by what it *is* rather than by what it's called, so a
// screen can display a payload whose exact fields aren't pinned down yet:
// money keys format as money, MT5 dotted stamps and ISO/day strings each get
// their own formatter, booleans become yes/no pills, arrays collapse to a list.
//
// A field the API adds later shows up without a code change, and one that's
// renamed degrades to raw text instead of vanishing.
export default function AutoValue({ k, v, compact = false }) {
  if (v === null || v === undefined || v === '') return <span style={{ color: 'var(--text-3)' }}>—</span>

  if (isDirectionKey(k)) return <DirectionPill direction={v} />
  if (typeof v === 'boolean') return v ? <Pill tone="crit">YES</Pill> : <Pill>NO</Pill>
  if (isMoneyKey(k) && (typeof v === 'number' || !isNaN(Number(v)))) return <Money value={v} dp={2} />
  if (isMt5Stamp(v)) return <Mono>{fmtMt5(v, { withDate: true })}</Mono>
  if (isIso(v)) return <Mono>{fmtDate(v)}</Mono>
  if (isDay(v)) return <Mono>{fmtDay(v)}</Mono>
  if (isClockTime(v)) return <Mono>{v}</Mono>
  if (typeof v === 'number') return <Mono>{v.toLocaleString()}</Mono>

  if (Array.isArray(v)) {
    if (v.length === 0) return <span style={{ color: 'var(--text-3)' }}>—</span>
    // arrays of objects can't be squeezed into a cell; say how many there are
    if (typeof v[0] === 'object') return <Mono>{v.length} item{v.length === 1 ? '' : 's'}</Mono>
    const joined = v.map(stripPositionId).join(', ')
    // in a table cell a long list would blow the column width out
    return <Mono>{compact && v.length > 3 ? `${v.length} values` : joined}</Mono>
  }

  if (typeof v === 'object') return <Mono>{compact ? 'object' : JSON.stringify(v)}</Mono>
  return <Mono>{v}</Mono>
}
