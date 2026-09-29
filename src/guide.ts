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

export const FIELDS = ['triangle', 'horizontal', 'free'] as const
export type Field = typeof FIELDS[number]

// Shown on the field while placing; the meaning of the triangle spots is revealed only after completion.
export const FIELD_GUIDES: Record<Field, string> = {
  triangle: '①→②→③の順に、○へ置いてみる',
  horizontal: '左から、過去 → 現在 → 未来',
  free: '内側と外側、感じるままに',
}

// Vertex positions match the three small flowers in field-triangle.svg (0–1 of the field).
export const TRIANGLE_SPOTS = [
  { number: '①', x: .211, y: .782, where: '左下', name: '本来の姿', note: '奥にある、もともとのもの' },
  { number: '②', x: .790, y: .780, where: '右下', name: '表面的な姿', note: '外から見えているもの' },
  { number: '③', x: .500, y: .184, where: '上', name: '理想的な姿', note: 'こうなったらいいなと願うもの' },
] as const

export interface Question { id: string; text: string; sub?: string; field?: Field }

// Short questions to scan; the optional sub line softens them for anyone who wants more.
export const QUESTIONS: readonly Question[] = [
  { id: 'story', text: '浮かんでくるストーリーは？', sub: '眺めていて、ふと浮かぶこと' },
  { id: 'color', text: '一番目に入る色は？', sub: 'その色のそばにある気持ちは？' },
  { id: 'largest', text: '一番大きな言葉を眺めると？', sub: 'なんとなく感じること' },
  { id: 'center', text: '中心のあたりにあるものは？', sub: '今のあなたにとって、どんな存在？' },
  { id: 'unexpected', text: '思いがけない場所にある言葉は？', sub: 'そこにあると、どんな感じ？' },
  { id: 'move', text: '動かしたくなるものは？', sub: 'どこへ行きたそう？' },
  { id: 'spots', text: '①②③を見比べると？', sub: 'ふと感じること', field: 'triangle' },
]

export const fullQuestion = (question: Question) => question.sub ? `${question.text}　${question.sub}` : question.text

export interface Notes { title: string; questionIds: string[]; answers: Record<string, string> }

export const emptyNotes = (): Notes => ({ title: '', questionIds: ['story'], answers: {} })
