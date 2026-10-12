import type { Stage } from '../types'
import { PARTS } from './parts'
import { buildElectric } from './model'
import { DRIP, FLOW_DURATION, FLOW_STEPS, FLOW_STREAMS, HEAT, HOT, MIXED, WATER } from './flow'
import { ELECTRIC_LOST, MODEL_SCOPE, QUIZ, SIMPLIFICATIONS, SOURCES } from './info'

export const electric: Stage = {
  key: 'electric',
  name: '電気温水器',
  brand: '電気温水器のしくみ',
  sub: '夜に沸かして、ためて使う（貯湯式）',
  ready: true,
  parts: PARTS,
  groups: ['本体', '本体の中', '配管と弁'],
  build: buildElectric,
  camera: {
    home: { target: [2.6, 9.8, 2.8], dir: [0.55, 0.22, 1], halfH: 11.6, halfW: 8.4 },
    flow: { target: [2.6, 9.6, 2.8], dir: [0.42, 0.16, 1], scale: 1.0 },
    zoom: { min: 5, max: 20 },
    labelDist: [10, 19],
    shadow: { left: -14, right: 14, top: 24, bottom: -6 },
  },
  ghost: { ids: ['unit', 'tank'], opacity: { tank: 0.22 }, pickLast: [], hideLabelInside: [] },
  glassIds: ['supplyPipe', 'hotPipe', 'reducer', 'mixer', 'relief', 'faucet'],
  flow: {
    duration: FLOW_DURATION,
    steps: FLOW_STEPS,
    streams: FLOW_STREAMS,
    legend: [
      { label: '温まったお湯', color: HEAT },
      { label: '熱いお湯', color: HOT },
      { label: '水', color: WATER },
      { label: '混ぜたお湯', color: MIXED },
      { label: '逃し弁の水', color: DRIP, kind: 'drop' },
    ],
    action: '沸かして使う',
    actionIcon: 'bolt',
  },
  lost: ELECTRIC_LOST,
  quiz: QUIZ,
  searchExample: '水がポタポタ',
  info: { scope: MODEL_SCOPE, simplifications: SIMPLIFICATIONS, sources: SOURCES },
  plainFlow: [
    '夜、ヒーターがタンクの下のほうの水を温める',
    '温まったお湯は上へ。タンクの上から熱いお湯がたまる',
    'ふくらんだ分の水は、逃し弁から排水口へ（沸かしている間）',
    '蛇口を開けると、減圧弁を通った水がタンクの下から入る',
    'その水に押し出されて、上の熱いお湯が出ていく',
    '混合弁で水と混ぜて温度を合わせ、蛇口へ',
  ],
}
