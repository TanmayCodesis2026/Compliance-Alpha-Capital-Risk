// Filters shared by the per-account rule tables (One Percent, Max Lot,
// Minimum Trading Days, Max Risk). Since the October 2026 API these list one
// row per account (`1pct:<login>:full`, `mxl:<login>`, `mtd:<login>`,
// `mxr:<login>`), clean rows included, filtered by breached / status /
// trading_platform — not by instrument or trade date, which they never had.

export const loginFilter = { param: 'login_id', label: 'Login', type: 'text', placeholder: 'login id…', width: 120 }

// `labels` lets Minimum Trading Days say "Not met" — a payout note, not a breach.
export const breachedFilter = ({ yes = 'Breached', no = 'Clean' } = {}) => ({
  param: 'breached', label: 'Result', options: [
    { value: 'true', label: yes, color: 'var(--crit)', soft: 'var(--crit-soft)' },
    { value: 'false', label: no, color: 'var(--ok)', soft: 'var(--ok-soft)' },
  ],
})

export const statusFilter = {
  param: 'status', label: 'Status', options: [
    { value: 'checked', label: 'Checked' },
    { value: 'not_applicable', label: 'N/A' },
    { value: 'blocked', label: 'Blocked' },
    { value: 'refused', label: 'Refused' },
  ],
}

export const platformFilter = { param: 'trading_platform', label: 'Platform', type: 'text', placeholder: 'mt5', width: 80 }

// The old per-scan-day rows, hidden by default.
export const legacyFilter = { param: 'include_legacy', label: 'Legacy', options: [{ value: 'true', label: 'Include legacy rows' }] }
