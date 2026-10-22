// Keep a project's identity while giving its text enough weight on either surface.
export function accentText(color) {
  return color ? `color-mix(in srgb, ${color} var(--accent-text-mix), var(--text-primary))` : 'var(--text-primary)'
}

export function tint(color, amount = 15) {
  return `color-mix(in srgb, ${color} ${amount}%, transparent)`
}
