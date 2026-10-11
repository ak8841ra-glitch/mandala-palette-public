import type { Stage, StageStub } from './types'
import { toilet } from './toilet'
import { aircon } from './aircon'

// ステージの並び。ready: false は「準備中」として一覧に出る
export const STAGES: (Stage | StageStub)[] = [
  toilet,
  aircon,
  { key: 'faucet', name: '水栓', sub: 'キッチン・洗面の蛇口', ready: false },
  { key: 'breaker', name: 'ブレーカー', sub: '分電盤のしくみ', ready: false },
]

export const READY: Stage[] = STAGES.filter((s): s is Stage => s.ready)

export function stageByKey(key: string): Stage {
  return READY.find((s) => s.key === key) ?? toilet
}

export function nextStage(key: string): Stage | StageStub | undefined {
  const i = STAGES.findIndex((s) => s.key === key)
  return STAGES[i + 1]
}

export function partMap(stage: Stage) {
  return Object.fromEntries(stage.parts.map((p) => [p.id, p]))
}

export function pickLost(stage: Stage, except?: string) {
  const pool = stage.lost.filter((p) => p.id !== except)
  return pool[Math.floor(Math.random() * pool.length)]
}
