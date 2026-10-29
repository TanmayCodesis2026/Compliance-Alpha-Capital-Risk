// Button styles shared by the review components. Kept out of ReviewBits.jsx
// so that file exports components only and Fast Refresh keeps working.

export const smallBtn = {
  font: 'inherit', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', padding: '4px 10px', borderRadius: 7,
  border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', whiteSpace: 'nowrap',
}

export const primaryBtn = {
  font: 'inherit', fontWeight: 600, fontSize: 12.5, color: 'var(--accent-fg)', background: 'var(--accent)',
  border: 'none', borderRadius: 8, padding: '7px 15px', cursor: 'pointer', whiteSpace: 'nowrap',
}
