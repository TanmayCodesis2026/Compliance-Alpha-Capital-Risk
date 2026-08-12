// Adapters mapping the Risk Tracker API shapes onto the render-ready props the
// screen components expect, plus static helpers for the (API-less) Run History
// screen. The original mock data set has been replaced by live API calls.

export const sevMeta = {
  critical: { label: 'CRITICAL', color: 'var(--crit)', soft: 'var(--crit-soft)' },
  high:     { label: 'HIGH',     color: 'var(--high)', soft: 'var(--high-soft)' },
  medium:   { label: 'MEDIUM',   color: 'var(--med)',  soft: 'var(--med-soft)' },
};

// API severities are upper-case (CRITICAL/HIGH/MEDIUM); normalise to our keys.
export const sevKey = (s) => (s || '').toLowerCase();

// The API double-encodes UTF-8 in some label strings: the original UTF-8 bytes
// were decoded as Windows-1252, so "·" arrives as "Â·" and "≥" as "â‰¥".
// Repair = reverse the CP1252 decode (char -> original byte) then decode UTF-8.
// CP1252 differs from Latin1 only in 0x80–0x9F; map those codepoints back.
const CP1252_REV = {
  0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A,
  0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92,
  0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C,
  0x017E: 0x9E, 0x0178: 0x9F,
};
export function fixMojibake(s) {
  if (typeof s !== 'string' || !/[Â-ßâãàá]/.test(s)) return s;
  try {
    const bytes = [];
    for (const ch of s) {
      const cp = ch.codePointAt(0);
      if (cp <= 0xff) bytes.push(cp);
      else if (CP1252_REV[cp] !== undefined) bytes.push(CP1252_REV[cp]);
      else return s; // contains a genuine multibyte char — not mojibake, leave as-is
    }
    const decoded = new TextDecoder('utf-8', { fatal: false }).decode(Uint8Array.from(bytes));
    // Only accept the repair if it produced no replacement chars.
    return decoded.includes('�') ? s : decoded;
  } catch {
    return s;
  }
}

export const sigFull = {
  OM: 'Opening match', CM: 'Closing match', PS: 'Profit symmetry',
  CS: 'Contract size mirroring', DP: 'Duration pattern',
  TOD: 'Time-of-day fingerprint', IR: 'Instrument rotation', LK: 'Linkage signal',
  HEDGE: 'Correlated hedge', CLUSTER: 'Cluster',
};

const pad = (n) => (n < 10 ? '0' + n : '' + n);

// "2026-06-20T13:22:42Z" -> "Jun 20 · 13:22"
export function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
  return `${mon} ${d.getDate()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// "2026-07-28" -> "Jul 28, 2026". Parsed by hand rather than via Date(): a
// bare date string is read as UTC midnight, which renders as the previous day
// for anyone west of Greenwich.
export function fmtDay(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd || ''));
  if (!m) return '—';
  return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

// MT5 stamps its timestamps "2026.07.28 20:29:04" — dotted, no timezone, and
// not a format Date() is required to parse, so pull the parts out directly.
//   withDate=false -> "20:29:04"   withDate=true -> "Jul 28 · 20:29:04"
export function fmtMt5(stamp, { withDate = false } = {}) {
  const s = String(stamp || '');
  const m = /^(\d{4})[.\-/](\d{2})[.\-/](\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(s);
  if (!m) return s || '—';
  const time = `${m[4]}:${m[5]}:${m[6] || '00'}`;
  return withDate ? `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])} · ${time}` : time;
}

// "2026-06-01T13:45:50Z" -> "13:45:50" (time only)
export function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// "35840.0000" / 2480 -> "+$35,840" / "−$2,480" with sign + color
export function fmtMoney(v) {
  const n = Number(v);
  if (isNaN(n)) return { text: '—', color: 'var(--text-2)' };
  const abs = Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
  return {
    text: (n < 0 ? '−$' : '$') + abs,
    color: n < 0 ? 'var(--crit)' : n > 0 ? 'var(--ok)' : 'var(--text-2)',
  };
}

// "1.396" -> "1.4m"
export function fmtDuration(min) {
  const n = Number(min);
  if (isNaN(n)) return '—';
  return n.toFixed(1) + 'm';
}

// "2026-06-20T13:22:42Z" -> "3h ago" / "2d ago"
export function fmtAgo(iso) {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (isNaN(then)) return '—';
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  return Math.round(hrs / 24) + 'd ago';
}

// Format a direction value (e.g. "OPPOSITE", "SAME") into a colored chip.
function dirChip(direction) {
  if (!direction) return null;
  const up = String(direction).toUpperCase();
  const isOpp = up.includes('OPP');
  return {
    label: up,
    color: isOpp ? 'var(--high)' : 'var(--info)',
    bg: isOpp ? 'var(--high-soft)' : 'var(--info-soft)',
  };
}

// A flag row from /api/flags/ or /api/overview/ recent list.
// `expanded` map + handlers are injected from React state.
export function decorateFlag(f, { expanded, toggleExpand, openFlag }) {
  const key = sevKey(f.severity);
  const m = sevMeta[key] || sevMeta.medium;
  const users = (f.user_ids || []).join(' · ');
  const sigs = f.signal_codes || [];
  const exp = !!expanded[f.flag_id];
  return {
    id: f.flag_id,
    source: f.source,
    pk: f.id,
    type: f.flag_type,
    instr: (f.instruments || []).join(' / '),
    instruments: f.instruments || [],
    usersText: users,
    userIds: f.user_ids || [],
    numUsers: f.num_users,
    direction: f.direction,
    dirChip: dirChip(f.direction),
    rec: f.recurrence,
    sigText: sigs.join(' · '),
    chips: sigs.map((c) => ({ code: c, full: sigFull[c] || c })),
    sevColor: m.color, sevSoft: m.soft, sevLabel: m.label,
    opened: fmtAgo(f.opened),
    openedFull: fmtDate(f.opened),
    dateText: fmtDate(f.opened),
    updated: fmtAgo(f.updated_at),
    updatedFull: fmtDate(f.updated_at),
    expanded: exp, chevDeg: exp ? '90deg' : '0deg',
    toggleExpand: (e) => { if (e && e.stopPropagation) e.stopPropagation(); toggleExpand(f.flag_id); },
    open: () => openFlag(f),
    // legs are loaded lazily on expand (constituent trades come from detail call)
    legs: null,
  };
}

// Build the account rows for the expanded queue row + investigation, from a
// flag-detail payload (accounts joined with user_ids).
export function detailLegs(detail) {
  const accts = detail.accounts || [];
  const users = detail.user_ids || [];
  const instr = (detail.instruments || []).join(' / ');
  const rows = accts.length ? accts : users.map((u, i) => ({ account_name: '—', trading_platform: '—', _u: u, _i: i }));
  return rows.map((a, i) => {
    const u = users[i] || a._u || '—';
    return {
      user: String(u),
      account: a.account_name || '—',
      platform: a.trading_platform || '—',
      acctId: a.id ?? '—',
      created: fmtDate(a.created_at),
      instr,
    };
  });
}

// Build a real users -> accounts graph from a flag-detail payload, laid out in a
// 320x230 viewBox. The API doesn't say which account belongs to which user, so
// accounts are split positionally across the users (same pairing detailLegs uses)
// and any leftover accounts are distributed round-robin.
export function detailGraph(detail) {
  const users = detail.user_ids || [];
  const accts = detail.accounts || [];
  const W = 320, userY = 56, acctY = 158, r = 20, ar = 13;
  // keep every node + its label fully inside [PAD, W-PAD]
  const PAD = 30;
  if (!users.length) return null;

  // assign each account to a user index
  const buckets = users.map(() => []);
  accts.forEach((a, i) => { buckets[i < users.length ? i : i % users.length].push(a); });

  const clampX = (x) => Math.max(PAD, Math.min(W - PAD, x));

  // user node x positions, evenly spread within the padded width
  const ux = (i) => users.length === 1 ? W / 2 : PAD + (i * (W - 2 * PAD)) / (users.length - 1);

  const userNodes = users.map((u, i) => ({ id: 'u' + i, label: String(u), x: ux(i), y: userY }));

  // account node x positions: spread within each user's column, clamped to bounds
  const acctNodes = [];
  const edges = [];
  users.forEach((_, i) => {
    const bucket = buckets[i];
    const cx = ux(i);
    const span = Math.min(86, 40 * Math.max(1, bucket.length - 1));
    bucket.forEach((a, j) => {
      const raw = bucket.length === 1 ? cx : cx - span / 2 + (j * span) / (bucket.length - 1);
      const x = clampX(raw);
      const id = 'a' + i + '_' + j;
      acctNodes.push({ id, label: a.account_name || '—', sub: a.trading_platform || '', x, y: acctY });
      edges.push({ x1: cx, y1: userY + r, x2: x, y2: acctY - ar });
    });
  });

  // edge between the two primary users (the flagged pair), if exactly a pair
  const pairEdge = users.length === 2
    ? { x1: ux(0) + r, y1: userY, x2: ux(1) - r, y2: userY }
    : null;

  return { W, H: 200, r, ar, userNodes, acctNodes, edges, pairEdge };
}

// Map a detail payload's signals onto investigation checklist rows. Surfaces the
// raw signal_data key/value pairs so nothing from the API is dropped.
export function detailSignals(detail) {
  const present = detail.signals || [];
  const order = ['OM','CM','PS','CS','DP','TOD','HEDGE','CLUSTER','IR','LK'];
  const byCode = {};
  present.forEach((s) => { byCode[s.signal_code] = s; });
  const codes = order.filter((c) => byCode[c]).concat(
    present.map((s) => s.signal_code).filter((c) => !order.includes(c))
  );
  return codes.map((code, i) => {
    const s = byCode[code] || {};
    const data = s.signal_data || {};
    const pairs = Object.entries(data).map(([k, v]) => ({ k, v: typeof v === 'boolean' ? (v ? 'yes' : 'no') : String(v) }));
    return {
      n: String(i + 1),
      code,
      signalId: s.id,
      name: s.signal_name || sigFull[code] || code,
      created: fmtDate(s.created_at),
      pairs,                                  // raw signal_data, fully shown
      note: pairs.map((p) => `${p.k}: ${p.v}`).join(' · '),
      value: code,
      mark: '✓', dot: 'var(--ok)', valColor: 'var(--text)',
    };
  });
}

// ---- /api/overview/ ----
// The endpoint returns one flat count per detection model:
//   { "two_minute": 21, "order_book_spam": 382, "news_trading": 460, ... }
// so everything derived here is a rollup of those counts. Models the UI has a
// dedicated screen for carry `screen`; the rest render as read-only counters.
const MODEL_META = {
  reverse_trading:      { label: 'Reverse Trading',      screen: 'reverse',    color: 'var(--crit)' },
  group_trading:        { label: 'Group Trading',        screen: 'group',      color: 'var(--high)' },
  order_book_spam:      { label: 'Order Book Spam',      screen: 'obs',        color: 'var(--accent)' },
  news_trading:         { label: 'News Trading',         screen: 'news',       color: 'var(--accent)' },
  gambling:             { label: 'Gambling',             screen: 'gambling',   color: 'var(--accent)' },
  two_minute:           { label: 'Two Minute',           screen: 'twoMinute',  color: 'var(--accent)' },
  weekend_holding:      { label: 'Weekend Holding',      screen: 'weekend',    color: 'var(--accent)' },
  one_percent:          { label: 'One Percent',          screen: 'onePercent', color: 'var(--accent)' },
  max_lot:              { label: 'Max Lot',              screen: 'maxLot',     color: 'var(--accent)' },
  minimum_trading_days: { label: 'Minimum Trading Days', screen: 'minDays',    color: 'var(--accent)' },
};

// "some_new_rule" -> "Some New Rule", so a model added server-side still shows
// up with a readable name instead of being dropped from the dashboard.
const titleCase = (key) => String(key).split('_').filter(Boolean)
  .map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

// The counts arrive either flat at the top level or wrapped — `by_type` on its
// own, or under `summary`/`data`/`counts`. Rather than assume one, try known
// locations in order of how specific they are. Getting this wrong renders an
// empty dashboard with no error, so it is worth being liberal here.
//
// Order matters: an explicit `by_type` beats a flat scan, because a wrapper
// like { summary: { total_flags: 893, by_type: {…} } } has a numeric field
// sitting beside the map that would otherwise be mistaken for the counts.

// Aggregates and paging fields that are numeric but are not a model count.
const NOT_A_COUNT = new Set(['total_flags', 'total', 'count', 'page', 'page_size', 'limit', 'offset']);

const numericEntries = (o) =>
  (o && typeof o === 'object' && !Array.isArray(o))
    ? Object.entries(o).filter(([k, v]) => typeof v === 'number' && isFinite(v) && !NOT_A_COUNT.has(k))
    : [];

export function resolveCounts(payload) {
  if (!payload || typeof payload !== 'object') return [];

  const candidates = [
    payload.by_type,
    payload.summary?.by_type,
    payload.data?.by_type,
    payload.overview?.by_type,
    payload.counts,
    payload.summary?.counts,
    payload,           // the documented flat shape
    payload.summary,
    payload.data,
    payload.results,
    payload.overview,
  ];

  for (const c of candidates) {
    const entries = numericEntries(c);
    if (entries.length) return entries;
  }
  return [];
}

export function decorateOverview(ov) {
  if (!ov) return null;

  // Only numeric fields count: a nested object or timestamp alongside them is
  // ignored rather than added into the total as NaN.
  const counts = resolveCounts(ov);
  const totalFlags = counts.reduce((a, [, v]) => a + v, 0);
  const busiest = Math.max(1, ...counts.map(([, v]) => v));

  const models = counts
    .map(([key, count]) => {
      const meta = MODEL_META[key] || {};
      return {
        key,
        count,
        label: meta.label || titleCase(key),
        screen: meta.screen || null,
        color: meta.color || 'var(--accent)',
        // bar width is relative to the busiest model, so a 3 next to a 460 is
        // still visible; `share` is the honest proportion of the total.
        barPct: Math.round((count / busiest) * 100),
        share: totalFlags ? (count / totalFlags) * 100 : 0,
      };
    })
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const firing = models.filter((m) => m.count > 0);

  return {
    totalFlags,
    models,
    firing,
    quiet: models.filter((m) => m.count === 0),
    top: firing[0] || null,
    // raw map, so a caller can read one model directly: ov.counts.two_minute
    counts: Object.fromEntries(counts),
    // true when a response arrived but held no counts we could find — the
    // dashboard says so instead of rendering an empty grid.
    empty: counts.length === 0,
    // the keys we did receive, so an unexpected shape is diagnosable on screen
    receivedKeys: Object.keys(ov),
    // the sidebar badge reads totals.flags
    totals: { flags: totalFlags },
  };
}


export const typeHeadings = {
  'RT-1': 'Behaviour-based reverse trading — two unique users, opposite sides, same instrument.',
  'RT-2': 'Same account holding opposing positions in correlated instruments above a 0.50 hedge ratio.',
  'GT-1': 'Multiple users entering the same instrument in the same direction within 5 minutes.',
  'GT-2': 'Multiple users deliberately taking opposite sides of the same instrument within 5 minutes.',
};

// ---- Overview derived bits from /api/overview/ ----

// Build the trend bars from the live 14-day series (flags_raised_14d), scaled to
// a 138px max. Falls back to a derived view from the severity mix if the series
// is absent.
export function overviewTrendBars(overview) {
  const series = overview && Array.isArray(overview.flags_raised_14d) ? overview.flags_raised_14d : null;
  if (series && series.length) {
    const totals = series.map((d) => (d.critical || 0) + (d.high || 0) + (d.medium || 0));
    const max = Math.max(1, ...totals);
    const scale = 138 / max;
    return series.map((d) => {
      const c = d.critical || 0, h = d.high || 0, m = d.medium || 0;
      // "2026-06-20" -> "Jun 20" for the first/last, day-of-month otherwise
      const dt = new Date(d.date);
      const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getMonth()];
      return {
        label: String(dt.getDate()),
        labelFull: `${mon} ${dt.getDate()}`,
        cH: Math.round(c * scale), hH: Math.round(h * scale), mH: Math.round(m * scale),
        title: `${mon} ${dt.getDate()} — ${c + h + m} flags`,
      };
    });
  }
  // fallback (no series)
  const bs = (overview && overview.by_severity) || {};
  const crit = bs.CRITICAL || 0, high = bs.HIGH || 0, med = bs.MEDIUM || 0;
  const total = Math.max(1, crit + high + med);
  return Array.from({ length: 14 }, (_, i) => {
    const f = 0.4 + (i / 13) * 0.6;
    return {
      label: String(i + 1),
      cH: Math.round((crit / total) * 138 * f),
      hH: Math.round((high / total) * 138 * f),
      mH: Math.round((med / total) * 138 * f),
      title: `~${Math.round((total * f) / 13)} flags`,
    };
  });
}

// ---- Run History (no API) : static/derived, unchanged from the mock ----

export function historyVals(histSel) {
  const today = 18;
  const sel = histSel || today;
  const special = { 6:'partial', 11:'failed' };
  const flagsByDay = { 1:18,2:22,3:15,4:27,5:19,6:31,7:12,8:24,9:29,10:17,11:0,12:33,13:21,14:26,15:23,16:30,17:28,18:34 };
  const meta = {
    success:   { label:'Success',   color:'var(--ok)',     soft:'var(--ok-soft)' },
    partial:   { label:'Partial',   color:'var(--high)',   soft:'var(--high-soft)' },
    failed:    { label:'Failed',    color:'var(--crit)',   soft:'var(--crit-soft)' },
    scheduled: { label:'Scheduled', color:'var(--text-3)', soft:'var(--inset)' },
  };
  const statusOf = (d) => (d > today ? 'scheduled' : (special[d] || 'success'));
  return { today, sel, special, flagsByDay, meta, statusOf };
}
