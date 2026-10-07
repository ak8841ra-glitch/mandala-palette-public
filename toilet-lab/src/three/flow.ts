import type { PartId } from '../data/parts'
import type { FlowPaths } from './buildModel'

// 「水を流す」アニメーションの台本。流体シミュレーションではなく、時間で動きを決めている。

export const FLOW_DURATION = 13.5

export const FLOW_STEPS: { at: number; text: string; focus: PartId[] }[] = [
  {
    at: 0,
    text: '洗浄レバーを回すと、タンクの中の鎖がフロートバルブを引き上げます。',
    focus: ['lever', 'chain', 'floatValve'],
  },
  {
    at: 1.1,
    text: 'タンクの水が排水口から便器へ。フチ（リム）の裏を通って勢いよく流れ込みます。',
    focus: ['floatValve', 'tankGasket'],
  },
  {
    at: 3.0,
    text: '水と汚れが排水トラップのせきを越え、床下の排水管へ流れていきます。',
    focus: ['trap', 'floorFlange', 'drainPipe'],
  },
  {
    at: 5.0,
    text: '水位といっしょに浮き球が下がり、ボールタップが開いて給水が始まります。フロートバルブは閉じます。',
    focus: ['floatBall', 'ballTap', 'supplyHose', 'stopValve'],
  },
  {
    at: 7.2,
    text: '給水の一部は補助水管 → オーバーフロー管を通って便器へ。減った封水が元の高さに戻ります。',
    focus: ['refillTube', 'overflow', 'sealWater'],
  },
  {
    at: 10.2,
    text: '水位が上がって浮き球が持ち上がると、ボールタップが閉じて給水が止まります。',
    focus: ['floatBall', 'ballTap'],
  },
]

export const CLEAN = 0x1f8ef1
export const USED = 0x9a7a4c

export const FLOW_STREAMS: {
  key: string
  path: keyof FlowPaths
  start: number
  end: number
  speed: number
  spacing: number
  color: number
}[] = [
  { key: 'flushL', path: 'flushL', start: 0.6, end: 4.6, speed: 3.2, spacing: 0.42, color: CLEAN },
  { key: 'flushR', path: 'flushR', start: 0.6, end: 4.6, speed: 3.2, spacing: 0.42, color: CLEAN },
  { key: 'drain', path: 'drain', start: 1.5, end: 6.0, speed: 2.6, spacing: 0.42, color: USED },
  { key: 'supply', path: 'supply', start: 5.0, end: 11.8, speed: 2.4, spacing: 0.4, color: CLEAN },
  { key: 'fill', path: 'fill', start: 5.6, end: 12.0, speed: 1.8, spacing: 0.32, color: CLEAN },
  { key: 'refill', path: 'refill', start: 6.6, end: 9.6, speed: 2.0, spacing: 0.36, color: CLEAN },
]

const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))
const seg = (t: number, a: number, b: number) => ease((t - a) / (b - a))

export function flowState(
  t: number,
  c: { waterLevel: number; tankBottom: number; sealLevel: number },
): { lever: number; flapper: number; tankLevel: number; seal: number } {
  const lever = 0.55 * seg(t, 0, 0.45) * (1 - seg(t, 1.4, 2.0))
  const flapper = 1.05 * seg(t, 0.15, 0.6) * (1 - seg(t, 4.7, 5.3))
  const low = c.tankBottom + 0.22
  const tankLevel = c.waterLevel - (c.waterLevel - low) * seg(t, 0.6, 4.7) + (c.waterLevel - low) * seg(t, 5.3, 12.2)
  // 便器の水面：流れ込みで上がり → 流れ出て下がる → 補助水管の水で元に戻る
  const seal =
    c.sealLevel + 0.35 * seg(t, 0.9, 1.9) - 0.6 * seg(t, 2.2, 4.6) + 0.25 * seg(t, 6.8, 9.8)
  return { lever, flapper, tankLevel, seal }
}
