// Gentle guides added after the live-event feedback: themes, placement axis, and reflection questions.
export interface Theme { id: string; label: string; prompt: string }

export const THEMES: readonly Theme[] = [
  { id: 'now', label: '今のわたし', prompt: '今のわたしを思い浮かべて' },
  { id: 'work', label: '仕事', prompt: '仕事を思い浮かべて' },
  { id: 'relationships', label: '人間関係', prompt: '人間関係を思い浮かべて' },
  { id: 'future', label: 'これから', prompt: 'これからを思い浮かべて' },
  { id: 'curious', label: '最近気になっていること', prompt: '気になることを思い浮かべて' },
  { id: 'free', label: 'テーマを決めず自由に', prompt: '' },
]

// One shared mandala field; the placement guide drawn over it is chosen separately.
// ①②③ comes first: it is the easiest guide to start with.
export const GUIDES = ['triangle', 'free', 'horizontal', 'none'] as const
export type Guide = typeof GUIDES[number]

// label names the guide on its button; lead is the one line shown while placing.
// The meaning of the triangle spots is revealed only after completion.
export const GUIDE_TEXT: Record<Guide, { label: string; lead: string }> = {
  free: { label: '内側↔外側', lead: '内側と外側、感じるままに' },
  triangle: { label: '①②③', lead: '①→②→③の順に、○へ置いてみる' },
  horizontal: { label: '過去→未来', lead: '左から、過去 → 現在 → 未来' },
  none: { label: 'ガイドなし', lead: '好きな場所へ、自由に' },
}

// Triangle vertices on the field (0–1), inside the range a card center can reach.
export const TRIANGLE_SPOTS = [
  { number: '①', x: .22, y: .76, where: '左下', name: '本来の姿', note: '奥にある、もともとのもの' },
  { number: '②', x: .78, y: .76, where: '右下', name: '表面的な姿', note: '外から見えているもの' },
  { number: '③', x: .50, y: .22, where: '上', name: '理想的な姿', note: 'こうなったらいいなと願うもの' },
] as const

// Under the other guides, the areas of the field get names too, resting on the finished artwork.
export interface Area { name: string; note?: string; x: number; y: number }
export const AREAS: Partial<Record<Guide, readonly Area[]>> = {
  horizontal: [{ name: 'これまで', x: .2, y: .93 }, { name: '今', x: .5, y: .93 }, { name: 'これから', x: .8, y: .93 }],
  free: [{ name: '外側', note: 'まわりとの関わり', x: .5, y: .05 }, { name: 'まん中', note: '自分の中のこと', x: .5, y: .5 }],
}

// Where a card sits, in the words of the guide it was placed with; null when it sits nowhere in particular.
export function placeOf(guide: Guide, card: { x: number; y: number }) {
  if (guide === 'triangle') {
    const spot = TRIANGLE_SPOTS.find(spot => Math.hypot(card.x - spot.x, card.y - spot.y) < .16)
    return spot ? spot.name : null
  }
  if (guide === 'horizontal') return card.x < .37 ? 'これまで' : card.x < .63 ? '今' : 'これから'
  if (guide === 'free') return Math.hypot(card.x - .5, card.y - .5) < .2 ? 'まん中' : '外側'
  return null
}

// Three rows of one-tap answers, in place of a question to write about.
export type ReactionKey = 'feel' | 'have' | 'keep'
export type Reaction = Partial<Record<ReactionKey, string>>
export const REACTIONS: readonly { key: ReactionKey; options: readonly { id: string; label: string; say: string }[] }[] = [
  { key: 'feel', options: [{ id: 'fit', label: 'しっくりくる', say: 'しっくりくる。' }, { id: 'surprise', label: 'ちょっと意外', say: 'ちょっと意外。' }] },
  { key: 'have', options: [{ id: 'have', label: 'もう持ってる', say: 'もう持ってるもの。' }, { id: 'want', label: 'ほしい', say: 'ほしいもの。' }] },
  { key: 'keep', options: [{ id: 'treasure', label: '大事にしたい', say: '大事にしたい。' }, { id: 'release', label: '手放してもいい', say: '手放してもいい。' }] },
]

// The taps, read back as one line: 理想的な姿に「挑戦」。ちょっと意外。でも、ほしいもの。大事にしたい。
export function hitokoto(word: string, place: string | null, reaction: Reaction) {
  const say = (key: ReactionKey) => REACTIONS.find(row => row.key === key)!.options.find(option => option.id === reaction[key])?.say ?? ''
  const have = say('have')
  return `${place ? `${place}に` : ''}「${word}」。${say('feel')}${have && reaction.feel === 'surprise' ? `でも、${have}` : have}${say('keep')}`
}

export interface Notes { title: string; answers: Record<string, string>; reactions?: Record<string, Reaction> }

export const emptyNotes = (): Notes => ({ title: '', answers: {}, reactions: {} })
