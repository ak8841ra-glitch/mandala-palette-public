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
export const GUIDES = ['free', 'triangle', 'horizontal', 'none'] as const
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

export interface Question { id: string; text: string; sub?: string; guide?: Guide }

// Short questions to scan; the optional sub line softens them for anyone who wants more.
export const QUESTIONS: readonly Question[] = [
  { id: 'story', text: '浮かんでくるストーリーは？', sub: '眺めていて、ふと浮かぶこと' },
  { id: 'color', text: '一番目に入る色は？', sub: 'その色のそばにある気持ちは？' },
  { id: 'largest', text: '一番大きな言葉を眺めると？', sub: 'なんとなく感じること' },
  { id: 'center', text: '中心のあたりにあるものは？', sub: '今のあなたにとって、どんな存在？' },
  { id: 'unexpected', text: '思いがけない場所にある言葉は？', sub: 'そこにあると、どんな感じ？' },
  { id: 'move', text: '動かしたくなるものは？', sub: 'どこへ行きたそう？' },
  { id: 'spots', text: '①②③を見比べると？', sub: 'ふと感じること', guide: 'triangle' },
]

export const fullQuestion = (question: Question) => question.sub ? `${question.text}　${question.sub}` : question.text

export interface Notes { title: string; questionIds: string[]; answers: Record<string, string> }

export const emptyNotes = (): Notes => ({ title: '', questionIds: ['story'], answers: {} })
