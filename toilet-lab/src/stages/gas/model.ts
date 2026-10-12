import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { StageModel } from '../types'
import { v, mat, curve, polyCurve, boxMinMax, cyl, rod, tube, createRegistry, stripes, sectionCap } from '../../three/kit'

// 座標系：1単位 ≒ 10cm。外壁は z = -1.5〜0。屋外が +z、家の中が -z。地面・床の上面が y = 0。
// 給湯器は外壁にかけ、給湯配管は壁を通して台所の蛇口へつなぐ。

const C = {
  wall: 0xe9e6df,
  wallOut: 0xd9d5cc,
  ground: 0xc9c7c0,
  floor: 0xd9d2c5,
  cabinet: 0xe6dccb,
  counter: 0xf2f1ee,
  unit: 0xf3f3f0,
  water: 0x9fb7c9,
  gas: 0xd9b84a,
  hot: 0xe6a07e,
  brass: 0xc9a25a,
  dark: 0x4b535b,
  chrome: 0xc4cad0,
}

export function buildGas(): StageModel {
  const root = new THREE.Group()
  const R = createRegistry(root)
  const { reg, proxy, env, cut } = R
  const hit = () => R.hitMat

  // ---------- 外壁・地面・台所 ----------
  const wallM = mat(C.wall, { roughness: 0.9 })
  const WX0 = -8,
    WX1 = 5.5,
    WY = 15
  const hole = { x0: -2.1, x1: -0.5, y0: 3.4, y1: 5.0 }
  env(boxMinMax(WX0, hole.x0, -0.3, WY, -1.5, 0, wallM))
  env(boxMinMax(hole.x1, WX1, -0.3, WY, -1.5, 0, wallM))
  env(boxMinMax(hole.x0, hole.x1, -0.3, hole.y0, -1.5, 0, wallM))
  env(boxMinMax(hole.x0, hole.x1, hole.y1, WY, -1.5, 0, wallM))
  cut(boxMinMax(hole.x0, hole.x1, hole.y0, hole.y1, -1.5, 0, wallM))
  env(boxMinMax(WX0, WX1, -0.3, WY, -0.02, 0.0, mat(C.wallOut, { roughness: 1 })))
  env(sectionCap(WX1, -0.3, WY, -1.5, 0))
  env(boxMinMax(WX0, WX1, -0.3, 0, 0, 8, mat(C.ground, { roughness: 1 })))
  env(boxMinMax(WX0, WX1, -0.3, 0, -8, -1.5, mat(C.floor, { roughness: 0.85 })))
  // 台所のキャビネット（右側の板は内部表示で外す）
  const cabM = mat(C.cabinet, { roughness: 0.8 })
  env(boxMinMax(0.5, 0.7, 0, 8.4, -5.5, -1.5, cabM))
  env(boxMinMax(0.5, 5.0, 0, 8.4, -1.7, -1.5, cabM))
  env(boxMinMax(0.5, 5.0, 0, 8.4, -5.5, -5.3, cabM))
  cut(boxMinMax(4.8, 5.0, 0, 8.4, -5.3, -1.7, cabM))
  env(boxMinMax(0.4, 5.1, 8.4, 8.7, -5.6, -1.5, mat(C.counter, { roughness: 0.4 })))
  env(boxMinMax(1.6, 4.4, 8.705, 8.72, -4.7, -2.7, mat(0xb9c2c8, { roughness: 0.3, metalness: 0.4 })))

  // ---------- 給湯器本体 ----------
  const U = { x0: -2.4, x1: 2.4, y0: 6.5, y1: 13.0, z0: 0.15, z1: 2.55 }
  const casing = new THREE.Mesh(
    new RoundedBoxGeometry(U.x1 - U.x0, U.y1 - U.y0, U.z1 - U.z0, 4, 0.18),
    mat(C.unit, { roughness: 0.4 }),
  )
  casing.position.set(0, (U.y0 + U.y1) / 2, (U.z0 + U.z1) / 2)
  reg('unit', casing, { shell: true })
  // 下の接続口
  for (const x of [-1.3, 0, 1.3]) {
    const n = cyl(0.17, 0.3, mat(C.chrome, { metalness: 0.4 }), 12)
    n.position.set(x, U.y0 - 0.1, x === 0 ? 0.8 : 1.0)
    reg('unit', n)
  }

  // 排気口（前面上）と排気の集まる部分
  const exM = mat(0xffffff, { map: stripes(10, '#6f7880', '#4a5157', false), roughness: 0.6 })
  reg('exhaust', boxMinMax(-1.6, 1.6, 12.0, 12.7, U.z1 - 0.02, U.z1 + 0.14, exM))
  reg('exhaust', boxMinMax(-2.0, 2.0, 11.65, 12.0, 0.5, 2.2, mat(0x9aa2a8, { roughness: 0.6 })))
  reg('exhaust', boxMinMax(-1.6, 1.6, 11.95, 12.7, 2.0, 2.5, mat(0x9aa2a8, { roughness: 0.6 })))

  // 熱交換器
  const hxM = mat(0xffffff, { map: stripes(56, '#d6b49a', '#a8785a'), roughness: 0.5, metalness: 0.3 })
  reg('hx', boxMinMax(-2.0, 2.0, 10.2, 11.6, 0.5, 2.2, hxM))
  const copper = () => mat(0xc0814f, { metalness: 0.5, roughness: 0.35 })
  const hxTube = polyCurve(
    [v(1.95, 10.3, 2.3), v(1.95, 10.45, 2.3), v(-1.95, 10.45, 2.3), v(-1.95, 10.9, 2.3), v(1.95, 10.9, 2.3), v(1.95, 11.35, 2.3), v(-1.95, 11.35, 2.3)],
    0.2,
  )
  reg('hx', tube(hxTube, 0.09, copper(), 120))

  // バーナー（炎は運転中だけ見える）
  const burnerM = mat(0xffffff, { map: stripes(30, '#9ea7ad', '#6f787e'), roughness: 0.5, metalness: 0.3 })
  reg('burner', boxMinMax(-1.8, 1.8, 8.9, 9.6, 0.6, 2.1, burnerM))
  const flames = new THREE.Group()
  root.add(flames)
  const flameM = new THREE.MeshBasicMaterial({ color: 0x4aa3ff, transparent: true, opacity: 0.85, depthWrite: false })
  const flameGeo = new THREE.ConeGeometry(0.09, 0.4, 8)
  flameGeo.translate(0, 0.2, 0)
  for (let x = -1.6; x <= 1.61; x += 0.4)
    for (const z of [0.9, 1.35, 1.8]) {
      const f = new THREE.Mesh(flameGeo, flameM)
      f.position.set(x, 9.62, z)
      flames.add(f)
    }
  flames.visible = false

  // 点火プラグ・炎検知センサー
  const ceramic = () => mat(0xf1efe8, { roughness: 0.4 })
  reg('igniter', rod(v(-1.5, 9.3, 2.25), v(-1.5, 9.9, 1.95), 0.05, ceramic()))
  reg('igniter', rod(v(-1.5, 9.9, 1.95), v(-1.35, 9.95, 1.8), 0.025, mat(C.dark)))
  proxy('igniter', boxMinMax(-1.75, -1.25, 9.2, 10.1, 1.7, 2.35, hit()))
  const spark = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff3a0 }))
  spark.position.set(-1.33, 9.97, 1.78)
  spark.visible = false
  root.add(spark)
  reg('flameRod', rod(v(1.5, 9.3, 2.25), v(1.5, 10.0, 1.9), 0.05, ceramic()))
  reg('flameRod', rod(v(1.5, 10.0, 1.9), v(1.3, 9.85, 1.6), 0.025, mat(C.dark)))
  proxy('flameRod', boxMinMax(1.2, 1.75, 9.2, 10.15, 1.5, 2.35, hit()))

  // 燃焼ファン（シロッコファン）
  const FAN = v(0.5, 7.75, 1.35)
  const fanG = new THREE.Group()
  fanG.position.copy(FAN)
  root.add(fanG)
  const bladeM = mat(0x8e9aa2, { roughness: 0.5 })
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.22), bladeM)
    b.position.set(0, Math.sin(a) * 0.5, Math.cos(a) * 0.5)
    b.rotation.x = -a + 0.6
    reg('fan', b, { parent: fanG })
  }
  for (const x of [-0.5, 0.5]) {
    const ringM = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 8, 28), mat(0x6f7c84))
    ringM.rotation.y = Math.PI / 2
    ringM.position.set(FAN.x + x, FAN.y, FAN.z)
    reg('fan', ringM)
  }
  const fanMotor = cyl(0.3, 0.5, mat(C.dark), 16)
  fanMotor.rotation.z = Math.PI / 2
  fanMotor.position.set(FAN.x + 0.85, FAN.y, FAN.z)
  reg('fan', fanMotor)
  const fanHit = cyl(0.72, 1.3, hit(), 12)
  fanHit.rotation.z = Math.PI / 2
  proxy('fan', fanHit, fanG)

  // ガス弁
  const brass = () => mat(C.brass, { metalness: 0.5, roughness: 0.35 })
  reg('gasValve', boxMinMax(-1.85, -1.15, 6.95, 7.5, 1.0, 1.6, brass()))
  const coil = cyl(0.22, 0.35, mat(C.dark), 16)
  coil.position.set(-1.5, 7.68, 1.3)
  reg('gasValve', coil)
  reg('gasValve', tube(polyCurve([v(-1.5, 7.5, 1.3), v(-1.5, 8.6, 1.3), v(-1.2, 8.85, 1.3)], 0.2), 0.07, brass(), 24))

  // 水量センサー
  const fs = cyl(0.22, 0.6, mat(0x7f98ab, { roughness: 0.4 }), 16)
  fs.position.set(1.3, 7.05, 1.0)
  reg('flowSensor', fs)
  const fsRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.05, 8, 20), mat(0x3a6f9c))
  fsRing.rotation.x = Math.PI / 2
  fsRing.position.set(1.3, 7.05, 1.0)
  reg('flowSensor', fsRing)
  proxy('flowSensor', boxMinMax(0.95, 1.65, 6.7, 7.45, 0.65, 1.35, hit()))

  // 制御基板
  reg('board', boxMinMax(-2.27, -2.2, 7.3, 9.4, 0.4, 1.0, mat(0x3f7f5a, { roughness: 0.6 })))
  for (const [y, z] of [
    [7.7, 0.55],
    [8.3, 0.75],
    [8.9, 0.6],
  ])
    reg('board', boxMinMax(-2.2, -2.08, y, y + 0.25, z, z + 0.25, mat(0x2c3236)))
  proxy('board', boxMinMax(-2.35, -1.9, 7.2, 9.5, 0.35, 1.1, hit()))

  // 本体の中の水・お湯の管（目印）
  const pipeIn = polyCurve([v(1.3, 6.5, 1.0), v(1.3, 7.4, 1.0), v(1.95, 8.0, 1.25), v(1.95, 10.3, 1.4), v(1.95, 10.3, 2.3)], 0.25)
  root.add(tube(pipeIn, 0.07, copper(), 40))
  const pipeOut = polyCurve([v(-1.95, 11.35, 2.3), v(-2.0, 11.35, 1.4), v(-2.0, 8.0, 1.3), v(-1.3, 7.2, 1.0), v(-1.3, 6.5, 1.0)], 0.25)
  root.add(tube(pipeOut, 0.07, copper(), 40))

  // 水抜き栓
  for (const x of [-1.75, 1.75]) {
    const p = cyl(0.12, 0.25, mat(0x2f6aa0, { roughness: 0.5 }), 10)
    p.position.set(x, U.y0 - 0.12, 1.8)
    reg('drainPlug', p)
  }
  proxy('drainPlug', boxMinMax(-2.05, -1.45, 6.0, 6.6, 1.5, 2.1, hit()))
  proxy('drainPlug', boxMinMax(1.45, 2.05, 6.0, 6.6, 1.5, 2.1, hit()))

  // ---------- 配管と栓 ----------
  const waterRoute = polyCurve([v(1.3, -0.3, 1.0), v(1.3, 6.4, 1.0)], 0.2)
  reg('waterPipe', tube(waterRoute, 0.2, mat(C.water, { roughness: 0.7 }), 30))
  const gasRoute = polyCurve([v(0, -0.3, 0.6), v(0, 5.9, 0.6), v(0, 6.4, 0.8)], 0.2)
  reg('gasPipe', tube(gasRoute, 0.14, mat(C.gas, { roughness: 0.5 }), 30))
  const hotRoute = polyCurve(
    [v(-1.3, 6.4, 1.0), v(-1.3, 4.2, 1.0), v(-1.3, 4.2, -2.0), v(3.0, 4.2, -2.0), v(3.0, 8.75, -2.0)],
    0.35,
  )
  reg('hotPipe', tube(hotRoute, 0.2, mat(C.hot, { roughness: 0.7 }), 90))
  proxy('waterPipe', tube(waterRoute, 0.3, hit(), 16))
  proxy('gasPipe', tube(gasRoute, 0.26, hit(), 16))
  proxy('hotPipe', tube(hotRoute, 0.3, hit(), 40))

  // 給水元栓
  reg('waterValve', boxMinMax(1.05, 1.55, 4.5, 5.1, 0.75, 1.25, mat(C.chrome, { metalness: 0.4, roughness: 0.35 })))
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.07, 8, 20), mat(0x2f6aa0))
  handle.position.set(1.3, 4.8, 1.45)
  reg('waterValve', handle)
  proxy('waterValve', boxMinMax(0.9, 1.7, 4.35, 5.25, 0.7, 1.6, hit()))
  // ガス栓
  reg('gasCock', boxMinMax(-0.22, 0.22, 3.9, 4.5, 0.38, 0.82, mat(C.brass, { metalness: 0.5, roughness: 0.35 })))
  reg('gasCock', boxMinMax(-0.08, 0.08, 4.1, 4.3, 0.8, 1.35, mat(0xe2b52f, { roughness: 0.5 })))
  proxy('gasCock', boxMinMax(-0.35, 0.35, 3.75, 4.65, 0.3, 1.45, hit()))

  // 電源コードとコンセント
  const cordRoute = curve([v(-2.0, 6.5, 1.5), v(-2.4, 5.6, 1.4), v(-3.3, 5.3, 0.6), v(-3.6, 5.2, 0.2)], 0.3)
  reg('cord', tube(cordRoute, 0.05, mat(0x4d555c), 30))
  reg('cord', boxMinMax(-3.95, -3.25, 4.85, 5.55, 0.0, 0.18, mat(0xf2f2ee)))
  proxy('cord', tube(cordRoute, 0.2, hit(), 16))

  // ---------- 家の中：蛇口・リモコン ----------
  const chromeM = () => mat(C.chrome, { metalness: 0.55, roughness: 0.25 })
  const fbase = cyl(0.25, 0.7, chromeM(), 20)
  fbase.position.set(3.0, 9.05, -2.0)
  reg('faucet', fbase)
  const spout = curve([v(3.0, 9.3, -2.0), v(3.0, 10.3, -2.15), v(3.0, 10.35, -2.9), v(3.0, 9.9, -3.4)], 0.4)
  reg('faucet', tube(spout, 0.09, chromeM(), 30))
  reg('faucet', rod(v(3.0, 9.45, -2.0), v(3.0, 9.75, -1.6), 0.05, chromeM()))
  proxy('faucet', boxMinMax(2.6, 3.4, 8.7, 10.6, -3.6, -1.55, hit()))
  reg('remote', boxMinMax(3.4, 4.4, 11.4, 12.6, -1.72, -1.5, mat(0xf7f7f5, { roughness: 0.4 })))
  reg('remote', boxMinMax(3.55, 4.25, 11.95, 12.45, -1.74, -1.72, mat(0x9fb4ad)))

  // ---------- 動きの道すじ ----------
  const waterPath = polyCurve(
    [v(1.3, -0.2, 1.0), v(1.3, 6.5, 1.0), v(1.3, 7.4, 1.0), v(1.95, 8.0, 1.25), v(1.95, 10.3, 1.4), v(1.95, 10.3, 2.3)],
    0.25,
  )
  const hotPath = polyCurve(
    [
      ...hxTube.getSpacedPoints(40).slice(1),
      v(-2.0, 11.35, 1.4),
      v(-2.0, 8.0, 1.3),
      v(-1.3, 7.2, 1.0),
      v(-1.3, 4.2, 1.0),
      v(-1.3, 4.2, -2.0),
      v(3.0, 4.2, -2.0),
      v(3.0, 9.3, -2.0),
      ...spout.getSpacedPoints(16).slice(1),
      v(3.0, 8.8, -3.4),
    ],
    0.25,
  )
  const gasPath = polyCurve([v(0, -0.2, 0.6), v(0, 5.9, 0.6), v(0, 6.5, 0.8), v(-1.5, 6.9, 1.1), v(-1.5, 8.6, 1.3), v(-0.6, 9.1, 1.35)], 0.25)
  const air = (x: number) => curve([v(x + 0.4, 5.6, 2.2), v(x + 0.3, 6.6, 1.9), v(x, 7.75, 1.35), v(x, 8.6, 1.4), v(x, 9.4, 1.4)], 0.3)
  const exhaustPath = (x: number) => curve([v(x, 10.0, 1.4), v(x, 11.8, 1.4), v(x, 12.35, 2.3), v(x, 12.45, 4.4), v(x, 12.9, 6.4)], 0.3)

  const anchors: Record<string, THREE.Vector3> = {
    unit: v(2.4, 12.6, 1.4),
    exhaust: v(1.2, 12.7, U.z1 + 0.1),
    remote: v(4.4, 12.5, -1.62),
    faucet: v(3.0, 10.35, -2.6),
    cord: v(-3.6, 5.55, 0.15),
    flowSensor: v(1.3, 7.35, 1.0),
    board: v(-2.2, 9.4, 0.7),
    fan: v(0.5, 8.45, 1.35),
    gasValve: v(-1.5, 7.5, 1.6),
    burner: v(1.0, 9.6, 2.1),
    igniter: v(-1.5, 9.95, 1.95),
    flameRod: v(1.5, 10.05, 1.9),
    hx: v(1.2, 11.6, 2.2),
    waterPipe: v(1.3, 2.0, 1.0),
    waterValve: v(1.3, 5.1, 1.45),
    gasPipe: v(0, 2.6, 0.6),
    gasCock: v(0, 4.5, 1.2),
    hotPipe: v(-1.3, 5.4, 1.0),
    drainPlug: v(1.75, 6.25, 1.8),
  }
  const views: Record<string, THREE.Vector3> = {
    unit: v(0.7, 0.3, 1),
    exhaust: v(0.4, 0.3, 1),
    remote: v(0.3, 0.2, -1),
    faucet: v(1, 0.4, -0.5),
    cord: v(-0.2, 0.2, 1),
    flowSensor: v(0.6, 0.1, 1),
    board: v(1, 0.2, 0.6),
    fan: v(0.7, 0.1, 1),
    gasValve: v(0.3, 0.1, 1),
    burner: v(0.5, 0.5, 1),
    igniter: v(0.2, 0.3, 1),
    flameRod: v(0.6, 0.3, 1),
    hx: v(0.5, 0.4, 1),
    waterPipe: v(0.6, 0.2, 1),
    waterValve: v(0.6, 0.2, 1),
    gasPipe: v(0.6, 0.2, 1),
    gasCock: v(0.4, 0.2, 1),
    hotPipe: v(1, 0.25, 0.2),
    drainPlug: v(0.4, -0.5, 1),
  }

  // ---------- 動き ----------
  const ramp = (t: number, a: number, b: number) => Math.max(0, Math.min(1, (t - a) / (b - a)))
  const spin = (t: number, a: number, b: number, w: number) => w * Math.max(0, Math.min(t, b) - a)
  const applyFlow = (t: number, running: boolean) => {
    fanG.rotation.x = -spin(t, 2.0, 13.0, 14)
    const flame = running ? ramp(t, 4.6, 5.0) * (1 - ramp(t, 11.6, 11.9)) : 0
    flames.visible = flame > 0.01
    const big = 0.55 + 0.45 * ramp(t, 5.0, 6.5)
    flames.children.forEach((f, i) => {
      const flick = 0.85 + 0.15 * Math.sin(t * 23 + i * 1.7)
      f.scale.set(1, flame * big * flick, 1)
    })
    spark.visible = running && t > 4.2 && t < 4.9 && Math.sin(t * 60) > 0
  }

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
      water: waterPath,
      hot: hotPath,
      gas: gasPath,
      airA: air(0.2),
      airB: air(0.9),
      exhaustA: exhaustPath(-0.8),
      exhaustB: exhaustPath(0.8),
    },
    lifts: [],
    applyFlow,
  }
}
