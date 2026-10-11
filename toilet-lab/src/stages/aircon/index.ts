import type { Stage } from '../types'
import { PARTS } from './parts'
import { buildAircon } from './model'
import { COLD, COOL_AIR, FLOW_DURATION, FLOW_STEPS, FLOW_STREAMS, HOT, HOT_AIR, WATER } from './flow'
import { AIRCON_LOST, MODEL_SCOPE, QUIZ, SIMPLIFICATIONS, SOURCES } from './info'

export const aircon: Stage = {
  key: 'aircon',
  name: 'エアコン',
  brand: 'エアコンのしくみ',
  sub: '壁かけ形の室内機と室外機',
  ready: true,
  parts: PARTS,
  groups: ['室内機', '室内機の中', 'つなぐもの（配管など）', '室外機', '室外機の中'],
  build: buildAircon,
  camera: {
    home: { target: [0, 7.6, -0.6], dir: [1, 0.2, 0.26], halfH: 10.2, halfW: 8.6 },
    flow: { target: [0, 7.4, -0.4], dir: [1, 0.1, 0.06], scale: 1.0 },
    zoom: { min: 5, max: 22 },
    labelDist: [10, 21],
    shadow: { left: -14, right: 14, top: 20, bottom: -8 },
  },
  ghost: { ids: ['indoorUnit', 'outdoorUnit'], opacity: {}, pickLast: [], hideLabelInside: ['frontPanel'] },
  glassIds: ['liquidPipe', 'gasPipe', 'drainHose', 'sleeve', 'indoorHx', 'outdoorHx', 'airFilter'],
  flow: {
    duration: FLOW_DURATION,
    steps: FLOW_STEPS,
    streams: FLOW_STREAMS,
    legend: [
      { label: '熱い冷媒', color: HOT },
      { label: '冷たい冷媒', color: COLD },
      { label: '冷えた風', color: COOL_AIR },
      { label: '外へ捨てる熱', color: HOT_AIR },
      { label: '水', color: WATER, kind: 'drop' },
    ],
    action: '冷房する',
    actionIcon: 'snow',
  },
  lost: AIRCON_LOST,
  quiz: QUIZ,
  searchExample: 'ホコリ',
  info: { scope: MODEL_SCOPE, simplifications: SIMPLIFICATIONS, sources: SOURCES },
  plainFlow: [
    '圧縮機が冷媒を押し縮めて、熱いガスにする',
    '室外熱交換器で、室外ファンの風に熱を捨てて液体になる',
    '膨張弁で圧力が下がって冷たくなり、細い管（液管）で室内機へ',
    '室内熱交換器が部屋の空気から熱をうばい、室内ファンが冷えた風を送る',
    '空気が冷えるときに出た水は、ドレンパン→ドレンホースで外へ',
    '熱をもらった冷媒は太い管（ガス管）で室外機へもどり、くり返す',
  ],
}
