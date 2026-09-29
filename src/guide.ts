// Gentle guides added after the live-event feedback: themes, placement axis, and reflection questions.
export interface Theme { id: string; label: string; prompt: string }

export const THEMES: readonly Theme[] = [
  { id: 'now', label: '今のわたし', prompt: '今のわたしを思い浮かべて' },
  { id: 'work', label: '仕事', prompt: '仕事のことを思い浮かべて' },
  { id: 'relationships', label: '人間関係', prompt: 'まわりの人との関係を思い浮かべて' },
  { id: 'future', label: 'これから', prompt: 'これからのことを思い浮かべて' },
  { id: 'curious', label: '最近気になっていること', prompt: '最近気になっていることを思い浮かべて' },
  { id: 'free', label: 'テーマを決めず自由に', prompt: '' },
]

export const FIELDS = ['triangle', 'horizontal', 'free'] as const
export type Field = typeof FIELDS[number]

// Shown on the field while placing; the meaning of the triangle spots is revealed only after completion.
export const FIELD_GUIDES: Record<Field, string> = {
  triangle: '3つの○に、①→②→③の順番で置いてみてください。どれをどこに置くかは、直感で大丈夫です。',
  horizontal: '左から右へ、過去→現在→未来。時間の流れにそって置いてみてください。',
  free: '内側に置きたいもの、外側に置きたいもの。感じるままに置いてみてください。',
}

// Vertex positions match the three small flowers in field-triangle.svg (0–1 of the field).
export const TRIANGLE_SPOTS = [
  { number: '①', x: .211, y: .782, where: '左下', name: '本来の姿', note: '奥にある、もともとのもの' },
  { number: '②', x: .790, y: .780, where: '右下', name: '表面的な姿', note: '外から見えている、表に出ているもの' },
  { number: '③', x: .500, y: .184, where: '上', name: '理想的な姿', note: 'こうなったらいいなと願うもの' },
] as const

export interface Question { id: string; text: string; field?: Field }

// Soft, open questions: they invite a vague feeling into words without demanding reasons.
export const QUESTIONS: readonly Question[] = [
  { id: 'story', text: 'この曼荼羅を眺めていると、どんなストーリーが浮かんできますか？' },
  { id: 'color', text: '一番目に入る色はどれですか？その色を見ていると、どんな気持ちがそばにありそうですか？' },
  { id: 'largest', text: '一番大きくした言葉を眺めて、なんとなく感じることはありますか？' },
  { id: 'center', text: '中心のあたりにあるものは、今のあなたにとって、どんな存在に感じますか？' },
  { id: 'unexpected', text: '思いがけない場所にある言葉はありますか？そこにあると、どんな感じがしますか？' },
  { id: 'move', text: '少し動かしてみたくなるものはありますか？どこへ行きたがっているように見えますか？' },
  { id: 'spots', text: '①②③の3つの場所を見比べて、ふと感じることはありますか？', field: 'triangle' },
]

export interface Notes { title: string; questionIds: string[]; answers: Record<string, string> }

export const emptyNotes = (): Notes => ({ title: '', questionIds: ['story'], answers: {} })
