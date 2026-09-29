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

// Keep the family, but move to the tone that stands out most against the background.
function readable(hex: string, bg: string) {
  const target = luminance(bg)
  if (Math.abs(luminance(hex) - target) >= .16) return hex
  return [...tonesOf(hex)].sort((a, b) => Math.abs(luminance(b) - target) - Math.abs(luminance(a) - target))[0]!
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
  const [main, second, third] = colors.map(color => readable(color, bg))

  const layers: Omit<Layer, 'id'>[] = []
  const add = (zone: Zone, part: PartKey, color: string, scale: number, extra: Partial<Layer> = {}) =>
    layers.push({ zone, part, color, scale, count: 1, radius: 0, rotation: 0, ...extra })

  add('fill', 'ring_plain', second!, 1)
  add('fill', pick(['ring_lotus', 'ring_outer'] as const, random), main!, .86, { rotation: pick([0, 15, 22.5], random) })
  const rim = pick(['dot', 'spark', 'petal'] as const, random)
  if (rim === 'dot') add('outer', 'dot', third!, .28, { count: 28, radius: 44 })
  if (rim === 'spark') add('outer', 'spark', third!, .42, { count: 16, radius: 44 })
  if (rim === 'petal') add('outer', 'petal', third!, .4, { count: 24, radius: 44, rotation: 180 })
  add('fill', 'ring_plain', third!, .5)
  const middle = pick(['ring_petal', 'petals', 'ring_center'] as const, random)
  if (middle === 'petals') add('inner', 'petal', second!, .6, { count: 8, radius: 14 })
  else add('fill', middle, second!, middle === 'ring_petal' ? .44 : .46)
  const center = pick(['ring_center', 'lotus', 'spark', 'dot'] as const, random)
  if (center === 'ring_center') add('fill', 'ring_center', main!, .22)
  else add('center', center, main!, center === 'dot' ? .22 : center === 'lotus' ? .6 : .5)

  return { bg, layers: layers.map((layer, index) => ({ ...layer, id: index + 1 })), nextId: layers.length + 1, auto: true }
}
