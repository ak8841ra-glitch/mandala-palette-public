import type { Stage } from '../types'
import { PARTS } from './parts'
import { buildToilet } from './model'
import { FLOW_DURATION, FLOW_STEPS, FLOW_STREAMS, CLEAN, USED } from './flow'
import { MODEL_SCOPE, QUIZ, SIMPLIFICATIONS, SOURCES, TOILET_LOST } from './info'

export const toilet: Stage = {
  key: 'toilet',
  name: 'トイレ',
  brand: 'トイレのしくみ',
  sub: 'タンク式の洋式トイレ',
  ready: true,
  parts: PARTS,
  groups: ['便器まわり', 'タンクの外側', 'タンクの中', '給水（きれいな水）', '排水（流したあとの水）'],
  build: buildToilet,
  camera: {
    home: { target: [-0.5, 3.7, 2.4], dir: [-0.62, 0.36, 1], halfH: 5.4, halfW: 3.9 },
    flow: { target: [-0.4, 3.2, 2.0], dir: [-0.85, 0.36, 0.9], scale: 1.18 },
    zoom: { min: 4.4, max: 14 },
    labelDist: [7.5, 13],
    shadow: { left: -8, right: 8, top: 10, bottom: -4 },
  },
  ghost: {
    ids: ['bowl', 'tank', 'lid', 'seat'],
    // ふたは模型の手前に立っているので、内部表示ではほぼ消す
    opacity: { lid: 0.06, seat: 0.22 },
    pickLast: ['lid'],
    hideLabelInside: ['tankLid', 'lid'],
  },
  glassIds: ['trap', 'drainPipe', 'floorFlange', 'supplyPipe', 'supplyHose', 'overflow', 'ballTap', 'tankGasket', 'stopValve'],
  flow: {
    duration: FLOW_DURATION,
    steps: FLOW_STEPS,
    streams: FLOW_STREAMS,
    legend: [
      { label: 'きれいな水', color: CLEAN },
      { label: '流したあとの水', color: USED },
    ],
    action: '水を流す',
    actionIcon: 'flush',
  },
  lost: TOILET_LOST,
  quiz: QUIZ,
  searchExample: '水を止める',
  info: { scope: MODEL_SCOPE, simplifications: SIMPLIFICATIONS, sources: SOURCES },
  plainFlow: [
    '洗浄レバーを回すと、鎖がフロートバルブを引き上げる',
    'タンクの水が便器のフチから流れ込む',
    '水と汚れが排水トラップを越えて、床下の排水管へ',
    '水位と一緒に浮き球が下がり、ボールタップが開いて給水',
    '給水の一部は補助水管→オーバーフロー管→便器へ。封水が元に戻る',
    '浮き球が上がりきると給水が止まる',
  ],
}
