import type { FlowStep, FlowStream } from '../types'

// 「沸かして使う」アニメーションの台本（貯湯式：夜に沸かしてためておき、昼に使う）

export const FLOW_DURATION = 15

export const WATER = 0x3a8fe0 // 水
export const HEAT = 0xf07a32 // 温まってのぼるお湯
export const HOT = 0xe8573a // タンクの熱いお湯
export const MIXED = 0xf2a03a // 温度を合わせたお湯
export const DRIP = 0x1fb5c4 // 逃し弁から出る水

export const FLOW_STEPS: FlowStep[] = [
  {
    at: 0,
    text: '夜、電気料金の安い時間帯になると、ヒーターがタンクの下のほうの水を温め始めます。',
    focus: ['heater', 'breaker', 'tank'],
  },
  {
    at: 2.6,
    text: '温まったお湯は軽いので上へのぼり、タンクの上から順に熱いお湯がたまっていきます。温度センサーが残りの量を見ています。',
    focus: ['tank', 'tempSensor'],
  },
  {
    at: 5.2,
    text: '水は温めるとふくらみます。ふえた分は逃し弁から排水口へ。沸かしている間に少し水が出るのは、このためです。',
    focus: ['relief', 'drainOutlet'],
  },
  {
    at: 7.6,
    text: '昼、蛇口を開けると、減圧弁で押す力を弱めた水道の水が、タンクの下から入ってきます。',
    focus: ['faucet', 'supplyValve', 'reducer', 'supplyPipe'],
  },
  {
    at: 9.8,
    text: '入ってきた水に押し出されて、タンクの上の熱いお湯が出ていきます。ヒーターは動いていません。',
    focus: ['tank', 'hotPipe'],
  },
  {
    at: 12.0,
    text: '熱すぎるお湯は、混合弁で水と混ぜてちょうどよい温度にしてから、蛇口へ送られます。',
    focus: ['mixer', 'hotPipe', 'faucet'],
  },
]

export const FLOW_STREAMS: FlowStream[] = [
  { key: 'convL', path: 'convL', start: 0.6, end: 5.4, speed: 2.8, spacing: 0.8, color: HEAT },
  { key: 'convC', path: 'convC', start: 0.8, end: 5.4, speed: 2.8, spacing: 0.8, color: HEAT },
  { key: 'convR', path: 'convR', start: 1.0, end: 5.4, speed: 2.8, spacing: 0.8, color: HEAT },
  { key: 'relief', path: 'relief', start: 5.2, end: 7.4, speed: 5, spacing: 0.9, color: DRIP, shape: 'drop' },
  { key: 'supply', path: 'supply', start: 7.6, end: 14.4, speed: 2.6, spacing: 0.5, color: WATER },
  { key: 'hotOut', path: 'hotOut', start: 9.8, end: 14.4, speed: 3.6, spacing: 0.5, color: HOT },
  { key: 'coldMix', path: 'coldMix', start: 12.0, end: 14.4, speed: 1.6, spacing: 0.35, color: WATER },
  { key: 'mixed', path: 'mixed', start: 12.2, end: 14.5, speed: 3.6, spacing: 0.5, color: MIXED },
]
