// Open space vivant : ce qui se débloque avec le niveau (décor, accessoires d'avatar).

export const DECOR_UNLOCKS = [
  { level: 2, label: 'Plantes dans tout l’étage' },
  { level: 3, label: 'Lampadaires (allumés le soir)' },
  { level: 4, label: 'Coin lounge' },
  { level: 6, label: 'Coin café et bibliothèque' },
  { level: 8, label: 'Aquarium' },
  { level: 10, label: 'Trophée doré et néon COCKPIT' },
]

export const AVATAR_ACCESSORIES = [
  { id: 'none', label: 'Aucun', level: 1 },
  { id: 'cap', label: 'Casquette', level: 1 },
  { id: 'headphones', label: 'Casque audio', level: 2 },
  { id: 'glasses', label: 'Lunettes', level: 4 },
  { id: 'crown', label: 'Couronne', level: 10 },
  { id: 'halo', label: 'Auréole', level: 15 },
  { id: 'beanie', label: 'Bonnet Winter Arc', level: 1, achievement: 'winter-arc' },
]

export const AVATAR_COLORS = ['#3B6FF0', '#0A1A3F', '#22A06B', '#E5484D', '#FF8C42', '#8B5CF6', '#EC4899', '#111827']

export function nextUnlock(level) {
  return [...DECOR_UNLOCKS, ...AVATAR_ACCESSORIES.filter(a => a.level > 1 && !a.achievement).map(a => ({ level: a.level, label: `Accessoire : ${a.label}` }))]
    .filter(u => u.level > level)
    .sort((a, b) => a.level - b.level)[0] || null
}
