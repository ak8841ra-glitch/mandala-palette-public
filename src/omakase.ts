import { COLORS } from './palette'

// おまかせ: builds a finished-looking mandala from the colors someone picked.
// The picked colors (weighted by how large their cards were) decide the color roles;
// which parts fill each role is random, so every press gives a different design.

export type PartKey = 'dot' | 'spiral' | 'spiral_tail' | 'petal' | 'lotus' | 'spark'
  | 'ring_center' | 'ring_petal' | 'ring_lotus' | 'ring_outer' | 'dot_ring' | 'ring_plain'
export type Zone = 'center' | 'inner' | 'outer' | 'fill'
export interface Layer { id: number; zone: Zone; part: PartKey; count: number; scale: number; radius: number; rotation: number; color: string }
export interface Maker { bg: string; layers: Layer[]; nextId: number; auto?: boolean }
export interface Preset { color: string; weight: number }

export const IVORY = '#FFFDF8'
export const CHARCOAL = '#3A3639'

export function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
  return .2126 * r! + .7152 * g! + .0722 * b!
}

// The four tones of the palette color a hex belongs to, if it is one of ours.
function tonesOf(hex: string) {
  return COLORS.find(color => color.tiers.some(tier => tier.bg.toLowerCase() === hex.toLowerCase()))?.tiers.map(tier => tier.bg) ?? [hex]
}

// Keep the family, but move to the tone that stands out most against the background:
// lighter than a dark background, darker than a light one.
function readable(hex: string, bg: string) {
  const target = luminance(bg)
  const contrast = (color: string) => target < .5 ? luminance(color) - target : target - luminance(color)
  if (contrast(hex) >= .16) return hex
  const best = [...tonesOf(hex)].sort((a, b) => contrast(b) - contrast(a))[0]!
  if (contrast(best) >= .16) return best
  // Even the family's best tone disappears (black on charcoal): lift it toward the opposite end, so it reads as gray.
  return mix(best, target < .5 ? IVORY : CHARCOAL, .45)
}

function mix(hex: string, other: string, amount: number) {
  const channel = (value: string, i: number) => parseInt(value.slice(i, i + 2), 16)
  return '#' + [1, 3, 5].map(i => Math.round(channel(hex, i) * (1 - amount) + channel(other, i) * amount).toString(16).padStart(2, '0')).join('')
}

const pick = <T,>(items: readonly T[], random: () => number) => items[Math.floor(random() * items.length)]!

export function omakase(presets: Preset[], random = Math.random): Maker {
  let colors = [...presets].sort((a, b) => b.weight - a.weight).map(preset => preset.color)
  if (!colors.length) {
    // No picked colors: choose two palette colors at random.
    const families = [...COLORS].sort(() => random() - .5).slice(0, 2)
    colors = families.map(color => color.tiers[1]!.bg)
  }
  // Fewer than three colors: borrow other tones of the main colors, so the design still has depth.
  for (const tone of colors.flatMap(tonesOf)) if (colors.length < 3 && !colors.includes(tone)) colors.push(tone)

  const bg = luminance(colors[0]!) < .22 ? IVORY : CHARCOAL
  const palette = colors.map(color => readable(color, bg))
  // Every picked color gets a part. Roles are filled in order of importance (the biggest card's color
  // takes the wide band); with fewer colors, a role falls back to a color already in use.
  const color = (role: number, fallback: number) => palette[role] ?? palette[fallback % palette.length]!

  const layers: Omit<Layer, 'id'>[] = []
  const add = (zone: Zone, part: PartKey, color: string, scale: number, extra: Partial<Layer> = {}) =>
    layers.push({ zone, part, color, scale, count: 1, radius: 0, rotation: 0, ...extra })

  add('fill', 'ring_plain', color(3, 1), 1)
  add('fill', pick(['ring_lotus', 'ring_outer'] as const, random), color(0, 0), .86, { rotation: pick([0, 15, 22.5], random) })
  const rim = pick(['dot', 'spark', 'petal'] as const, random)
  if (rim === 'dot') add('outer', 'dot', color(2, 2), .28, { count: 28, radius: 44 })
  if (rim === 'spark') add('outer', 'spark', color(2, 2), .42, { count: 16, radius: 44 })
  if (rim === 'petal') add('outer', 'petal', color(2, 2), .4, { count: 24, radius: 44, rotation: 180 })
  // A seventh color and beyond: a ring of dots just inside the band, then one more ring further in.
  if (palette[6]) add('fill', 'dot_ring', palette[6], .7)
  add('fill', 'ring_plain', color(4, 2), .5)
  const middle = pick(['ring_petal', 'petals', 'ring_center'] as const, random)
  if (middle === 'petals') add('inner', 'petal', color(1, 1), .6, { count: 8, radius: 14 })
  else add('fill', middle, color(1, 1), middle === 'ring_petal' ? .44 : .46)
  if (palette[7]) add('fill', 'ring_plain', palette[7], .36)
  if (palette[8]) add('inner', 'dot', palette[8], .22, { count: 12, radius: 10 })
  const center = pick(['ring_center', 'lotus', 'spark', 'dot'] as const, random)
  if (center === 'ring_center') add('fill', 'ring_center', color(5, 0), .22)
  else add('center', center, color(5, 0), center === 'dot' ? .22 : center === 'lotus' ? .6 : .5)

  return { bg, layers: layers.map((layer, index) => ({ ...layer, id: index + 1 })), nextId: layers.length + 1, auto: true }
}
