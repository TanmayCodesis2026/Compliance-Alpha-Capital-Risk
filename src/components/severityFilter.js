import { sevMeta } from '../data.js'

// The severity chip group, shared by the cross-account detectors so both read
// the same way. Values are sent as the API spells them — upper-case CRITICAL /
// HIGH / MEDIUM (see sevKey in data.js) — and the colours come from sevMeta so
// a chip can't drift from the badge it filters for.
//
// Ordered most severe first, matching how severity is listed everywhere else in
// the app, so the eye lands on Critical rather than scanning for it.
export const SEVERITY_FILTER = {
  param: 'severity',
  label: 'Severity',
  options: [
    { value: 'CRITICAL', label: 'Critical', color: sevMeta.critical.color, soft: sevMeta.critical.soft },
    { value: 'HIGH', label: 'High', color: sevMeta.high.color, soft: sevMeta.high.soft },
    { value: 'MEDIUM', label: 'Medium', color: sevMeta.medium.color, soft: sevMeta.medium.soft },
  ],
}
