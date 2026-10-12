import type { Stage } from '../types'
import { PARTS } from './parts'
import { buildGas } from './model'
import { AIR, EXHAUST, FLOW_DURATION, FLOW_STEPS, FLOW_STREAMS, GAS, HOT, WATER } from './flow'
import { GAS_LOST, MODEL_SCOPE, QUIZ, SIMPLIFICATIONS, SOURCES } from './info'

export const gas: Stage = {
  key: 'gas',
  name: 'ガス給湯器',
  brand: 'ガス給湯器のしくみ',
  sub: '使う分だけ、その場で温める（瞬間式）',
  ready: true,
  parts: PARTS,
  groups: ['給湯器の外側', '給湯器の中', '配管と栓'],
  build: buildGas,
  camera: {
    home: { target: [0, 7.4, -0.6], dir: [1, 0.22, 0.4], halfH: 8.0, halfW: 6.8 },
    flow: { target: [0, 7.6, -0.4], dir: [1, 0.16, 0.22], scale: 1.0 },
    zoom: { min: 4.4, max: 16 },
    labelDist: [8, 15],
    shadow: { left: -12, right: 12, top: 16, bottom: -6 },
  },
  ghost: { ids: ['unit'], opacity: {}, pickLast: [], hideLabelInside: [] },
  glassIds: ['waterPipe', 'hotPipe', 'gasPipe', 'hx', 'gasValve', 'flowSensor', 'faucet', 'exhaust'],
  flow: {
    duration: FLOW_DURATION,
    steps: FLOW_STEPS,
    streams: FLOW_STREAMS,
    legend: [
      { label: '水', color: WATER },
      { label: 'お湯', color: HOT },
      { label: 'ガス', color: GAS },
      { label: '空気', color: AIR },
      { label: '排気', color: EXHAUST },
    ],
    action: 'お湯を出す',
    actionIcon: 'flame',
  },
  lost: GAS_LOST,
  quiz: QUIZ,
  searchExample: 'ガスを止める',
  info: { scope: MODEL_SCOPE, simplifications: SIMPLIFICATIONS, sources: SOURCES },
  plainFlow: [
    '蛇口を開けると、水が給湯器へ流れ込む',
    '水量センサーが流れを感じ、燃焼ファンが空気を送る',
    'ガス弁が開き、点火プラグで火がつく（炎検知センサーが見張る）',
    '熱交換器で、流れる水がその場でお湯になる',
    'お湯は給湯配管で蛇口へ。排気は排気口から外へ',
    '蛇口を閉めると火が消え、ファンが少し回って止まる',
  ],
}
