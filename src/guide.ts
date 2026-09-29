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

export type Layout = 'distance' | 'free'

export interface Question { id: string; text: string }

export const QUESTIONS: readonly Question[] = [
  { id: 'story', text: 'この曼荼羅を眺めていると、どんなストーリーが浮かびますか？' },
  { id: 'color', text: '一番目に入る色は？' },
  { id: 'largest', text: '一番大きくした言葉は？' },
  { id: 'center', text: 'なぜそれを中心に置いた？' },
  { id: 'unexpected', text: '意外な場所にある言葉は？' },
  { id: 'move', text: '今、動かしたくなったものは？' },
]

export interface Notes { title: string; questionIds: string[]; answers: Record<string, string> }

export const emptyNotes = (): Notes => ({ title: '', questionIds: ['story'], answers: {} })
