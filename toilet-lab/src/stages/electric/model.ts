import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { StageModel } from '../types'
import { v, mat, curve, polyCurve, boxMinMax, cyl, rod, tube, createRegistry } from '../../three/kit'

// 座標系：1単位 ≒ 10cm（本体の高さは目安）。後ろの壁は z = -1.5〜0、手前が +z。床の上面が y = 0。
// 屋内（洗面所や納戸など）に置く、床置きの貯湯式電気温水器。右どなりに台所の流し台。

const C = {
  wall: 0xeceae4,
  floor: 0xd9d2c5,
  unit: 0xf4f4f1,
  tank: 0xc9d0d5,
  water: 0x9fb7c9,
  hot: 0xe6a07e,
  brass: 0xc9a25a,
  dark: 0x4b535b,
  chrome: 0xc4cad0,
  cabinet: 0xe6dccb,
  counter: 0xf2f1ee,
}

export function buildElectric(): StageModel {
  const root = new THREE.Group()
  const R = createRegistry(root)
  const { reg, proxy, env, cut } = R
  const hit = () => R.hitMat

  // ---------- 壁・床・流し台 ----------
  env(boxMinMax(-6, 12, -0.3, 22, -1.5, 0, mat(C.wall, { roughness: 0.9 })))
  env(boxMinMax(-6, 12, -0.3, 0, 0, 10, mat(C.floor, { roughness: 0.85 })))
  const cabM = mat(C.cabinet, { roughness: 0.8 })
  env(boxMinMax(6.2, 6.4, 0, 8.6, 0.2, 6.0, cabM))
  env(boxMinMax(10.8, 11.0, 0, 8.6, 0.2, 6.0, cabM))
  env(boxMinMax(6.2, 11.0, 0, 8.6, 0.0, 0.2, cabM))
  cut(boxMinMax(6.4, 10.8, 0, 8.6, 5.8, 6.0, cabM))
  env(boxMinMax(6.1, 11.1, 8.6, 8.9, 0.0, 6.1, mat(C.counter, { roughness: 0.4 })))
  env(boxMinMax(7.0, 10.2, 8.905, 8.92, 2.0, 5.0, mat(0xb9c2c8, { roughness: 0.3, metalness: 0.4 })))
  // 脚
  for (const x of [-2.7, 2.7]) for (const z of [0.8, 6.2]) env(boxMinMax(x - 0.25, x + 0.25, 0, 0.6, z - 0.25, z + 0.25, mat(0x9aa2a8)))

  // ---------- 本体 ----------
  const U = { x0: -3.2, x1: 3.2, y0: 0.6, y1: 19.0, z0: 0.3, z1: 6.7 }
  const casing = new THREE.Mesh(
    new RoundedBoxGeometry(U.x1 - U.x0, U.y1 - U.y0, U.z1 - U.z0, 4, 0.3),
    mat(C.unit, { roughness: 0.4 }),
  )
  casing.position.set(0, (U.y0 + U.y1) / 2, (U.z0 + U.z1) / 2)
  reg('unit', casing, { shell: true })

  // 貯湯タンク
  const T = { y0: 3.6, y1: 18.0, z: 3.5, r: 2.7 }
  const tankM = () => mat(C.tank, { metalness: 0.45, roughness: 0.35 })
  const tankBody = cyl(T.r, T.y1 - T.y0, tankM(), 40)
  tankBody.position.set(0, (T.y0 + T.y1) / 2, T.z)
  reg('tank', tankBody, { shell: true })
  for (const top of [true, false]) {
    const capGeo = new THREE.SphereGeometry(T.r, 40, 12, 0, Math.PI * 2, top ? 0 : Math.PI / 2, Math.PI / 2)
    capGeo.scale(1, 0.18, 1)
    const cap = new THREE.Mesh(capGeo, tankM())
    cap.position.set(0, top ? T.y1 : T.y0, T.z)
    reg('tank', cap, { shell: true })
  }

  // タンクの中のお湯（上）と水（下）の層。部品ではないので選択対象外
  const layerM = (color: number, opacity: number) =>
    new THREE.MeshStandardMaterial({ color, transparent: true, opacity, depthWrite: false, roughness: 0.2 })
  const hotGeo = new THREE.CylinderGeometry(T.r - 0.12, T.r - 0.12, 1, 40)
  hotGeo.translate(0, -0.5, 0)
  const hotLayer = new THREE.Mesh(hotGeo, layerM(0xf0783c, 0.42))
  hotLayer.position.set(0, T.y1 - 0.05, T.z)
  hotLayer.renderOrder = 2
  root.add(hotLayer)
  const coldGeo = new THREE.CylinderGeometry(T.r - 0.12, T.r - 0.12, 1, 40)
  coldGeo.translate(0, 0.5, 0)
  const coldLayer = new THREE.Mesh(coldGeo, layerM(0x5aa0e0, 0.32))
  coldLayer.position.set(0, T.y0 + 0.05, T.z)
  coldLayer.renderOrder = 2
  root.add(coldLayer)
  const H = T.y1 - T.y0 - 0.1
  const setHot = (f: number) => {
    hotLayer.scale.y = Math.max(0.01, H * f)
    coldLayer.scale.y = Math.max(0.01, H * (1 - f))
  }

  // ヒーター（前から差し込む U 字）
  const heaterPath = polyCurve([v(-0.35, 4.5, 6.2), v(-0.35, 4.5, 1.3), v(0.35, 4.5, 1.3), v(0.35, 4.5, 6.2)], 0.3)
  reg('heater', tube(heaterPath, 0.09, mat(0x5d666e, { metalness: 0.5, roughness: 0.4 }), 60))
  const flange = cyl(0.55, 0.15, mat(0x8e979e, { metalness: 0.4 }), 24)
  flange.rotation.x = Math.PI / 2
  flange.position.set(0, 4.5, 6.15)
  reg('heater', flange)
  proxy('heater', boxMinMax(-0.75, 0.75, 4.1, 4.9, 1.0, 6.4, hit()))
  const glow = new THREE.Mesh(
    new THREE.TubeGeometry(heaterPath, 60, 0.16, 10, false),
    new THREE.MeshBasicMaterial({ color: 0xff6a2a, transparent: true, opacity: 0, depthWrite: false }),
  )
  root.add(glow)

  // 温度センサー（タンクの横に高さを変えて）
  const zs = T.z + Math.sqrt(T.r * T.r - 1.9 * 1.9) + 0.05
  for (const y of [6.0, 9.5, 13.0, 16.5]) reg('tempSensor', boxMinMax(1.75, 2.15, y - 0.18, y + 0.18, zs - 0.1, zs + 0.15, mat(0x3a6f9c)))
  proxy('tempSensor', boxMinMax(1.6, 2.3, 5.6, 16.9, zs - 0.25, zs + 0.3, hit()))

  // 混合弁（下の部屋）
  const brass = () => mat(C.brass, { metalness: 0.5, roughness: 0.35 })
  reg('mixer', boxMinMax(1.05, 1.75, 1.7, 2.35, 4.1, 4.75, brass()))
  const knob = cyl(0.22, 0.3, mat(0x2f6aa0), 16)
  knob.rotation.x = Math.PI / 2
  knob.position.set(1.4, 2.02, 4.9)
  reg('mixer', knob)

  // 漏電遮断器（前面の下）
  reg('breaker', boxMinMax(-2.3, -1.3, 1.5, 2.6, U.z1 - 0.05, U.z1 + 0.2, mat(0xe9eae7, { roughness: 0.5 })))
  reg('breaker', boxMinMax(-1.95, -1.65, 2.0, 2.35, U.z1 + 0.2, U.z1 + 0.35, mat(0x4d555c)))

  // 排水栓（タンクの底から前へ）
  const drainRoute = polyCurve([v(-0.3, T.y0 - 0.3, T.z), v(-0.3, 1.2, T.z), v(-0.3, 1.2, U.z1 + 0.3)], 0.25)
  root.add(tube(drainRoute, 0.07, mat(C.chrome, { metalness: 0.4 }), 30))
  reg('drainCock', boxMinMax(-0.55, -0.05, 0.95, 1.45, U.z1 + 0.05, U.z1 + 0.5, brass()))
  reg('drainCock', rod(v(-0.3, 1.45, U.z1 + 0.3), v(0.1, 1.8, U.z1 + 0.3), 0.04, mat(0xd94a3a)))
  proxy('drainCock', boxMinMax(-0.7, 0.2, 0.8, 1.9, U.z1, U.z1 + 0.65, hit()))

  // ---------- 配管と弁 ----------
  const supplyRoute = polyCurve(
    [v(5.6, -0.3, 2.5), v(5.6, 1.3, 2.5), v(3.2, 1.3, 2.5), v(2.2, 1.3, 2.5), v(1.6, 2.4, 2.8), v(1.6, T.y0 + 0.1, 2.8)],
    0.3,
  )
  reg('supplyPipe', tube(supplyRoute, 0.18, mat(C.water, { roughness: 0.7 }), 60))
  proxy('supplyPipe', tube(supplyRoute, 0.28, hit(), 30))
  // 給水止水栓
  reg('supplyValve', boxMinMax(5.35, 5.85, 0.45, 0.95, 2.25, 2.75, mat(C.chrome, { metalness: 0.4, roughness: 0.35 })))
  const sh = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.06, 8, 20), mat(0x2f6aa0))
  sh.position.set(5.6, 0.7, 2.95)
  reg('supplyValve', sh)
  proxy('supplyValve', boxMinMax(5.2, 6.0, 0.3, 1.1, 2.2, 3.2, hit()))
  // 減圧弁
  reg('reducer', boxMinMax(4.1, 4.7, 1.0, 1.6, 2.2, 2.8, brass()))
  const bell = cyl(0.32, 0.6, brass(), 20)
  bell.position.set(4.4, 1.9, 2.5)
  reg('reducer', bell)
  const bellTop = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), brass())
  bellTop.position.set(4.4, 2.2, 2.5)
  reg('reducer', bellTop)
  proxy('reducer', boxMinMax(3.95, 4.85, 0.9, 2.6, 2.05, 2.95, hit()))

  // 混合弁への水の枝管と、タンク上からのお湯の管（本体の中）
  const coldBranch = polyCurve([v(2.6, 1.3, 2.5), v(2.0, 1.6, 3.8), v(1.75, 2.0, 4.4)], 0.2)
  root.add(tube(coldBranch, 0.07, mat(C.water), 20))
  const hotInner = polyCurve(
    [v(0, T.y1 + 0.3, T.z), v(0, 18.6, T.z), v(2.8, 18.6, 1.0), v(2.8, 2.6, 1.0), v(1.4, 2.35, 4.1)],
    0.35,
  )
  root.add(tube(hotInner, 0.08, mat(0xc0814f, { metalness: 0.4, roughness: 0.4 }), 80))

  // 逃し弁（本体の上）と、その排水管
  reg('relief', boxMinMax(-0.3, 0.3, 19.0, 19.6, T.z - 0.3, T.z + 0.3, brass()))
  reg('relief', rod(v(0, 19.6, T.z), v(0.45, 20.0, T.z), 0.06, mat(0xd94a3a)))
  const reliefDrain = polyCurve([v(0.3, 19.3, T.z), v(3.45, 19.3, 4.8), v(3.45, 1.0, 4.8), v(4.0, 0.7, 5.2)], 0.35)
  root.add(tube(reliefDrain, 0.08, mat(0xd4d8dc, { roughness: 0.6 }), 60))
  proxy('relief', boxMinMax(-0.5, 0.6, 18.9, 20.2, T.z - 0.5, T.z + 0.5, hit()))
  // 排水口（ホッパー）
  const hopperGeo = new THREE.CylinderGeometry(0.5, 0.25, 0.6, 20, 1, true)
  const hopper = new THREE.Mesh(hopperGeo, mat(0x9aa2a8, { side: THREE.DoubleSide }))
  hopper.position.set(4.0, 0.3, 5.2)
  reg('drainOutlet', hopper)
  const hopperPipe = cyl(0.22, 0.4, mat(0x9aa2a8), 16)
  hopperPipe.position.set(4.0, -0.1, 5.2)
  reg('drainOutlet', hopperPipe)
  proxy('drainOutlet', boxMinMax(3.4, 4.6, -0.1, 0.8, 4.6, 5.8, hit()))
  const cockHose = curve([v(-0.3, 1.2, U.z1 + 0.5), v(1.0, 0.5, U.z1 + 0.6), v(3.2, 0.5, 5.6), v(3.75, 0.55, 5.25)], 0.3)
  root.add(tube(cockHose, 0.06, mat(0xd4d8dc, { roughness: 0.6 }), 30))

  // 給湯配管（混合弁 → 流し台の蛇口）
  const hotRoute = polyCurve(
    [v(1.75, 2.3, 4.4), v(3.2, 2.3, 4.0), v(7.0, 2.3, 4.0), v(7.0, 2.3, 1.2), v(8.3, 2.3, 1.2), v(8.3, 8.9, 1.2)],
    0.35,
  )
  reg('hotPipe', tube(hotRoute, 0.18, mat(C.hot, { roughness: 0.7 }), 80))
  proxy('hotPipe', tube(hotRoute, 0.28, hit(), 40))

  // 蛇口
  const chromeM = () => mat(C.chrome, { metalness: 0.55, roughness: 0.25 })
  const fbase = cyl(0.25, 0.7, chromeM(), 20)
  fbase.position.set(8.3, 9.25, 1.2)
  reg('faucet', fbase)
  const spout = curve([v(8.3, 9.5, 1.2), v(8.3, 10.5, 1.35), v(8.3, 10.55, 2.1), v(8.3, 10.1, 2.6)], 0.4)
  reg('faucet', tube(spout, 0.09, chromeM(), 30))
  reg('faucet', rod(v(8.3, 9.65, 1.2), v(8.3, 9.95, 0.8), 0.05, chromeM()))
  proxy('faucet', boxMinMax(7.9, 8.7, 8.9, 10.8, 0.7, 2.8, hit()))
  // リモコン
  reg('remote', boxMinMax(9.4, 10.4, 11.6, 12.8, 0.0, 0.22, mat(0xf7f7f5, { roughness: 0.4 })))
  reg('remote', boxMinMax(9.55, 10.25, 12.15, 12.6, 0.22, 0.24, mat(0x9fb4ad)))

  // ---------- 動きの道すじ ----------
  const conv = (x: number) => curve([v(x, 4.9, T.z + 0.3), v(x * 1.1, 9, T.z + 0.6), v(x * 0.9, 13, T.z + 0.5), v(x, 17.4, T.z + 0.3)], 0.3)
  const supplyPath = polyCurve([...supplyRoute.getSpacedPoints(50), v(1.6, 7.0, 2.8)], 0.3)
  const hotOutPath = polyCurve([v(0, 16.8, T.z), ...hotInner.getSpacedPoints(60).slice(1)], 0.3)
  const mixedPath = polyCurve([...hotRoute.getSpacedPoints(70), v(8.3, 9.5, 1.2), ...spout.getSpacedPoints(16).slice(1), v(8.3, 9.0, 2.6)], 0.3)
  const reliefPath = polyCurve([v(0, 19.3, T.z), ...reliefDrain.getSpacedPoints(40), v(4.0, 0.1, 5.2)], 0.3)

  const anchors: Record<string, THREE.Vector3> = {
    unit: v(U.x1, 17.5, U.z1),
    tank: v(-1.6, 15.0, T.z + 2.2),
    heater: v(0.35, 4.5, 6.2),
    tempSensor: v(2.15, 13.0, zs + 0.1),
    mixer: v(1.75, 2.35, 4.75),
    breaker: v(-1.3, 2.6, U.z1 + 0.2),
    drainCock: v(-0.05, 1.45, U.z1 + 0.5),
    remote: v(10.4, 12.8, 0.22),
    supplyPipe: v(5.6, 0.2, 2.5),
    supplyValve: v(5.85, 0.95, 2.95),
    reducer: v(4.7, 2.2, 2.5),
    relief: v(0.3, 19.6, T.z + 0.3),
    drainOutlet: v(4.5, 0.6, 5.2),
    hotPipe: v(5.5, 2.3, 4.0),
    faucet: v(8.3, 10.55, 2.1),
  }
  const views: Record<string, THREE.Vector3> = {
    unit: v(0.5, 0.25, 1),
    tank: v(0.4, 0.2, 1),
    heater: v(0.4, 0.15, 1),
    tempSensor: v(0.6, 0.15, 1),
    mixer: v(0.4, 0.2, 1),
    breaker: v(0.1, 0.1, 1),
    drainCock: v(0.2, 0.3, 1),
    remote: v(0.1, 0.1, 1),
    supplyPipe: v(0.6, 0.3, 1),
    supplyValve: v(0.6, 0.35, 1),
    reducer: v(0.6, 0.35, 1),
    relief: v(0.5, 0.6, 1),
    drainOutlet: v(0.4, 0.7, 1),
    hotPipe: v(0.3, 0.5, 1),
    faucet: v(0.4, 0.3, 1),
  }

  // ---------- 動き ----------
  const ramp = (t: number, a: number, b: number) => Math.max(0, Math.min(1, (t - a) / (b - a)))
  const smooth = (k: number) => k * k * (3 - 2 * k)
  const REST = 0.85
  const glowM = glow.material as THREE.MeshBasicMaterial
  const applyFlow = (t: number, running: boolean) => {
    let f = REST
    if (running) {
      if (t < 0.6) f = REST + (0.3 - REST) * smooth(ramp(t, 0, 0.6))
      else if (t < 9.8) f = 0.3 + 0.65 * smooth(ramp(t, 0.6, 7.2))
      else f = 0.95 - 0.13 * smooth(ramp(t, 9.8, 14.6))
    }
    setHot(f)
    const heating = running ? ramp(t, 0.4, 0.8) * (1 - ramp(t, 7.0, 7.4)) : 0
    glowM.opacity = heating * (0.55 + 0.15 * Math.sin(t * 9))
    glow.visible = heating > 0.01
  }
  setHot(REST)

  return {
    root,
    partMeshes: R.partMeshes,
    pickables: R.pickables,
    shells: R.shells,
    cutPanels: R.cutPanels,
    cutFrames: R.cutFrames,
    anchors,
    views,
    paths: {
      convL: conv(-1.3),
      convC: conv(0),
      convR: conv(1.3),
      relief: reliefPath,
      supply: supplyPath,
      hotOut: hotOutPath,
      coldMix: coldBranch,
      mixed: mixedPath,
    },
    lifts: [],
    applyFlow,
  }
}
