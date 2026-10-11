import type { FlowStep, FlowStream } from '../types'

// 「冷房運転」アニメーションの台本。冷媒の流れや風は、矢印で示す。

export const FLOW_DURATION = 15

export const HOT = 0xf07a32 // 熱い冷媒
export const COLD = 0x2f8de0 // 冷たい冷媒
export const RETURN = 0x6fb7d8 // もどる冷媒（ガス）
export const COOL_AIR = 0x8fd7ee // 冷えた風
export const HOT_AIR = 0xe8664a // 外へ捨てる温かい風
export const ROOM_AIR = 0xa3aeb4 // 部屋の空気
export const WATER = 0x1fb5c4 // ドレン水

export const FLOW_STEPS: FlowStep[] = [
  {
    at: 0,
    text: '冷房を始めると風向ルーバーが開き、室外機の圧縮機が冷媒をぎゅっと押し縮めて、熱いガスにします。',
    focus: ['compressor', 'fourWay', 'flap'],
  },
  {
    at: 2.2,
    text: '熱い冷媒は四方弁を通って室外熱交換器へ。室外ファンの風で熱を外に捨て、液体になります。',
    focus: ['outdoorHx', 'outdoorFan', 'fourWay'],
  },
  {
    at: 4.4,
    text: '膨張弁で圧力が下がると冷媒は一気に冷たくなり、細い管（液管）で室内機へ向かいます。',
    focus: ['expansionValve', 'serviceValve', 'liquidPipe'],
  },
  {
    at: 6.6,
    text: 'エアフィルターを通った部屋の空気から、室内熱交換器が熱をうばいます。室内ファンが冷えた風を送り出します。',
    focus: ['airFilter', 'indoorHx', 'indoorFan', 'flap'],
  },
  {
    at: 9.0,
    text: '空気が冷えるときに出た水は、ドレンパンに集まり、ドレンホースで外へ流れます。',
    focus: ['drainPan', 'drainHose'],
  },
  {
    at: 11.3,
    text: '熱をもらった冷媒は太い管（ガス管）で室外機へもどり、また圧縮機へ。これをくり返して部屋を冷やします。',
    focus: ['gasPipe', 'fourWay', 'compressor'],
  },
]

const air = (key: string, path: string, start: number, color: number, speed = 2.4): FlowStream => ({
  key,
  path,
  start,
  end: 13.8,
  speed,
  spacing: 0.6,
  color,
})

export const FLOW_STREAMS: FlowStream[] = [
  { key: 'hot', path: 'hot', start: 0.8, end: 13.4, speed: 3.0, spacing: 0.42, color: HOT },
  { key: 'cold', path: 'cold', start: 4.2, end: 13.4, speed: 3.6, spacing: 0.45, color: COLD },
  { key: 'ret', path: 'ret', start: 10.6, end: 13.6, speed: 4.2, spacing: 0.5, color: RETURN },
  air('hotAirA', 'hotAirA', 2.2, HOT_AIR, 3),
  air('hotAirB', 'hotAirB', 2.4, HOT_AIR, 3),
  air('roomAirL', 'roomAirL', 6.2, ROOM_AIR),
  air('roomAirC', 'roomAirC', 6.3, ROOM_AIR),
  air('roomAirR', 'roomAirR', 6.4, ROOM_AIR),
  air('coolAirL', 'coolAirL', 7.2, COOL_AIR, 2.8),
  air('coolAirC', 'coolAirC', 7.3, COOL_AIR, 2.8),
  air('coolAirR', 'coolAirR', 7.4, COOL_AIR, 2.8),
  { key: 'drain', path: 'drain', start: 9.0, end: 13.8, speed: 3.2, spacing: 0.7, color: WATER, shape: 'drop' },
]
