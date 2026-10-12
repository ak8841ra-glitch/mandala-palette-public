import type { FlowStep, FlowStream } from '../types'

// 「お湯を出す」アニメーションの台本（瞬間式：使う分だけ、その場で温める）

export const FLOW_DURATION = 14

export const WATER = 0x3a8fe0 // 水
export const HOT = 0xe8573a // お湯
export const GAS = 0xe0b020 // ガス
export const AIR = 0xa3aeb4 // 空気
export const EXHAUST = 0xb98a6c // 排気

export const FLOW_STEPS: FlowStep[] = [
  { at: 0, text: '蛇口を開けると、水道の水が給水配管を通って給湯器へ流れ込みます。', focus: ['faucet', 'waterValve', 'waterPipe'] },
  {
    at: 2.0,
    text: '水量センサーが水の流れを感じとり、制御基板が燃焼ファンを回して、空気を送り込みます。',
    focus: ['flowSensor', 'board', 'fan'],
  },
  {
    at: 4.0,
    text: 'ガス弁が開いてバーナーにガスが送られ、点火プラグの火花で火がつきます。炎検知センサーが炎を見張ります。',
    focus: ['gasValve', 'burner', 'igniter', 'flameRod'],
  },
  { at: 6.4, text: '炎の熱で熱交換器の管が熱せられ、中を通る水がその場でお湯になります。', focus: ['hx', 'burner'] },
  { at: 8.8, text: 'お湯は給湯配管を通って蛇口へ。燃えたあとのガス（排気）は排気口から外へ出ます。', focus: ['hotPipe', 'faucet', 'exhaust'] },
  {
    at: 11.4,
    text: '蛇口を閉めて水が止まると、火が消えます。ファンは少しの間回って、中の排気を出し切ってから止まります。',
    focus: ['flowSensor', 'burner', 'fan'],
  },
]

export const FLOW_STREAMS: FlowStream[] = [
  { key: 'water', path: 'water', start: 0.3, end: 11.4, speed: 2.6, spacing: 0.45, color: WATER },
  { key: 'airA', path: 'airA', start: 2.1, end: 12.4, speed: 2.0, spacing: 0.5, color: AIR },
  { key: 'airB', path: 'airB', start: 2.2, end: 12.4, speed: 2.0, spacing: 0.5, color: AIR },
  { key: 'gas', path: 'gas', start: 4.0, end: 11.4, speed: 2.6, spacing: 0.45, color: GAS },
  { key: 'hot', path: 'hot', start: 6.2, end: 11.4, speed: 6.5, spacing: 0.5, color: HOT },
  { key: 'exhaustA', path: 'exhaustA', start: 5.4, end: 12.4, speed: 2.4, spacing: 0.55, color: EXHAUST },
  { key: 'exhaustB', path: 'exhaustB', start: 5.5, end: 12.4, speed: 2.4, spacing: 0.55, color: EXHAUST },
]
