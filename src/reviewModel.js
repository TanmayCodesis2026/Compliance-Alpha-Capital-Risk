// Presentation rules for the account review (T21–T31): which tone a chip state
// takes, how a rule is labelled, which drill-down a chip opens. The account
// page, the dossier and the drill-downs all read these, so a "not met" chip
// and a "not met" drill-down headline cannot drift into different colours.
//
// Tones are the ScanFields <Pill> palette: crit · high · ok · info · neutral.

// Six result states (§3.3), plus two that only account-summary's
// summary.rules uses: `flagged` (RT/GT) and `no_row` (Max Risk on a non-Alpha
// Direct account — nothing was stored, so there is nothing to judge).
export const STATE_META = {
  breached:       { tone: 'crit',    label: 'Breached' },
  flagged:        { tone: 'crit',    label: 'Flagged' },
  no_row:         { tone: 'neutral', label: 'No data', muted: true },
  to_review:      { tone: 'high',    label: 'To review' },
  not_met:        { tone: 'high',    label: 'Not met' },
  cannot_run:     { tone: 'neutral', label: 'Cannot run' },
  clean:          { tone: 'ok',      label: 'Clean' },
  not_applicable: { tone: 'neutral', label: 'Not applicable', muted: true },
}
export const stateMeta = (state) => STATE_META[state] || { tone: 'neutral', label: String(state || 'Unknown').replace(/_/g, ' ') }

// summary.colour on the Global Tier Summary heading.
const COLOUR_TONE = { red: 'crit', amber: 'high', green: 'ok' }
export const colourTone = (colour) => COLOUR_TONE[colour] || 'neutral'

// The nine tiered/manual rules with an account drill-down. `key` matches
// api.js RULE_ACCOUNT_PATHS and account-summary's by_type/rules keys;
// `aliases` are the shorter keys the stored review's chips and the drill-down's
// `result.rule` use — the Postman examples show news, weekend, obs, min_days,
// max_risk, max_lot, one_percent, two_minute, gambling. `screen` is the
// App.jsx list screen.
export const RULES = [
  { key: 'news_trading',         label: 'News Trading',         screen: 'news',       aliases: ['news'] },
  { key: 'two_minute',           label: 'Two Minute',           screen: 'twoMinute',  aliases: ['two_min', '2min'] },
  { key: 'weekend_holding',      label: 'Weekend Holding',      screen: 'weekend',    aliases: ['weekend'] },
  { key: 'order_book_spam',      label: 'Order Book Spam',      screen: 'obs',        aliases: ['obs', 'order_book'] },
  { key: 'max_risk',             label: 'Max Risk',             screen: 'maxRisk',    aliases: [], note: 'Under review with the client' },
  { key: 'max_lot',              label: 'Max Lot',              screen: 'maxLot',     aliases: [] },
  { key: 'one_percent',          label: 'One Percent',          screen: 'onePercent', aliases: ['1pct', 'one_pct'] },
  { key: 'gambling',             label: 'Gambling',             screen: 'gambling',   aliases: [], note: 'Manual review — never a breach' },
  { key: 'minimum_trading_days', label: 'Minimum Trading Days', screen: 'minDays',    aliases: ['mtd', 'min_days'], note: 'Payout note — "not met" is not a breach' },
]

// data_warnings arrive as plain strings or as { type, message }.
export const warningText = (w) => (typeof w === 'string' ? w : w?.message || w?.type || JSON.stringify(w))

// Funded accounts measure the Two Minute reference from the period profit, so
// only they can be given a manual amount; Evaluation uses the profit target.
export const isFunded = (account) => /funded/i.test(account?.phase || '')
const RULE_BY_KEY = Object.fromEntries(RULES.flatMap((r) => [[r.key, r], ...r.aliases.map((a) => [a, r])]))

// Chip/section/by_type key -> the rule entry, or null for one the UI doesn't
// know (rendered as a plain chip without a drill-down rather than dropped).
export const ruleOf = (key) => RULE_BY_KEY[key] || null

// Cross-account detectors appear in account-summary but have no drill-down.
export const CROSS_ACCOUNT_LABELS = { reverse_trading: 'Reverse Trading', group_trading: 'Group Trading' }

export const ruleLabel = (key) =>
  ruleOf(key)?.label || CROSS_ACCOUNT_LABELS[key] || String(key).replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

// period_profit.source / verdict.reference_source -> the small label beside the figure.
const PROFIT_SOURCE_LABELS = {
  balance: 'from balance feed',
  daily_net_profit: 'from closed trades (balance history missing)',
  manual: 'manual',
  target: 'evaluation target',
}
export const profitSourceLabel = (source) => (source ? PROFIT_SOURCE_LABELS[source] || source : null)

// A funded account's period profit can't be measured: the Two Minute check has
// no reference until the reviewer enters one (manual_profit).
export const needsManualProfit = (periodProfit) => !!periodProfit && (periodProfit.profit === null || periodProfit.profit === undefined)

// Status-first rendering of a stored review (§3.3):
//   { kind: 'missing' }                       no stored review for this scope yet
//   { kind: 'status', status, reason }        not_applicable / blocked / refused
//   { kind: 'verdict', overall, tone, … }     checked — the Global Tier Summary
export function reviewView(review) {
  if (!review) return { kind: 'missing' }
  if (review.status && review.status !== 'checked') {
    return { kind: 'status', status: review.status, reason: review.statusReason || null }
  }
  const s = review.summary || {}
  return {
    kind: 'verdict',
    overall: s.overall || '—',
    tier: s.tier ?? null,
    tone: colourTone(s.colour),
    lines: s.lines || [],
    copyText: s.copyText || '',
    chips: s.chips || [],
    incomplete: review.complete === false,
    warnings: review.dataWarnings || [],
    lastChecked: review.storedCheckedAtServer || review.checkedAt || null,
  }
}
