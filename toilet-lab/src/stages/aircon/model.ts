import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { StageModel } from '../types'
import { v, mat, curve, polyCurve, boxMinMax, cyl, rod, tube, createRegistry } from '../../three/kit'

// 座標系：1単位 ≒ 10cm（室内機の取り付け高さは縮めて表示）。
// 壁は z = -1.5〜0。部屋側が +z、屋外側が -z。床と地面の上面が y = 0。
// 室内機は部屋側の壁の上のほう、室外機は屋外の地面に置く。

const C = {
  white: 0xf7f8f6,
  wall: 0xeceae4,
  wallOut: 0xd9d5cc,
  floor: 0xd9d2c5,
  ground: 0xc9c7c0,
  insul: 0xefe7d3, // 配管の断熱材
  drain: 0xb9c0c6,
  fin: 0xc7d0d6,
  filter: 0xe9eef0,
  dark: 0x4b535b,
  brass: 0xc9a25a,
  compressor: 0x3f4b47,
  fan: 0xdfe3e6,
}

// フィン（薄い板が並んだ面）の縞模様
function stripes(lines: number, color = '#c7d0d6', line = '#9aa6ae', vertical = true) {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 256
  const g = c.getContext('2d')!
  g.fillStyle = color
  g.fillRect(0, 0, 256, 256)
  g.strokeStyle = line
  g.lineWidth = 2
  for (let i = 0; i < lines; i++) {
    const p = ((i + 0.5) * 256) / lines
    g.beginPath()
    if (vertical) {
      g.moveTo(p, 0)
      g.lineTo(p, 256)
    } else {
      g.moveTo(0, p)
      g.lineTo(256, p)
    }
    g.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function grid() {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = '#eef2f3'
  g.fillRect(0, 0, 128, 128)
  g.strokeStyle = '#b8c3c8'
  for (let i = 0; i <= 128; i += 8) {
    g.beginPath()
    g.moveTo(i, 0)
    g.lineTo(i, 128)
    g.moveTo(0, i)
    g.lineTo(128, i)
    g.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(6, 1)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function buildAircon(): StageModel {
  const root = new THREE.Group()
  const R = createRegistry(root)
  const { reg, proxy, env, cut } = R
  const hit = () => R.hitMat

  // ---------- 壁・床・地面 ----------
  const wallM = mat(C.wall, { roughness: 0.9 })
  const hole = { x0: 2.3, x1: 4.2, y0: 10.9, y1: 12.8 }
  const WX0 = -10,
    WX1 = 6,
    WY = 16
  env(boxMinMax(WX0, hole.x0, -0.3, WY, -1.5, 0, wallM))
  env(boxMinMax(hole.x1, WX1, -0.3, WY, -1.5, 0, wallM))
  env(boxMinMax(hole.x0, hole.x1, -0.3, hole.y0, -1.5, 0, wallM))
  env(boxMinMax(hole.x0, hole.x1, hole.y1, WY, -1.5, 0, wallM))
  cut(boxMinMax(hole.x0, hole.x1, hole.y0, hole.y1, -1.5, 0, wallM))
  // 壁の切り口（断面）：斜線で「ここで切っている」ことを示す
  const hatch = document.createElement('canvas')
  hatch.width = hatch.height = 64
  const hg = hatch.getContext('2d')!
  hg.fillStyle = '#d6d1c7'
  hg.fillRect(0, 0, 64, 64)
  hg.strokeStyle = '#b9b2a5'
  hg.lineWidth = 3
  for (let i = -64; i < 128; i += 16) {
    hg.beginPath()
    hg.moveTo(i, 64)
    hg.lineTo(i + 64, 0)
    hg.stroke()
  }
  const hatchTex = new THREE.CanvasTexture(hatch)
  hatchTex.wrapS = hatchTex.wrapT = THREE.RepeatWrapping
  hatchTex.repeat.set(1, 10)
  hatchTex.colorSpace = THREE.SRGBColorSpace
  const capGeo = new THREE.PlaneGeometry(1.5, WY + 0.3)
  const cap = new THREE.Mesh(capGeo, new THREE.MeshStandardMaterial({ map: hatchTex, roughness: 1 }))
  cap.rotation.y = Math.PI / 2
  cap.position.set(WX1 + 0.005, (WY - 0.3) / 2, -0.75)
  env(cap)

  // 外壁の色（屋外側の面）
  env(boxMinMax(WX0, WX1, -0.3, WY, -1.52, -1.5, mat(C.wallOut, { roughness: 1 })))
  env(boxMinMax(WX0, WX1, -0.3, 0, 0, 9, mat(C.floor, { roughness: 0.85 })))
  env(boxMinMax(WX0, WX1, -0.3, 0, -9, -1.5, mat(C.ground, { roughness: 1 })))

  // ---------- 室内機 ----------
  const IU = { x0: -4, x1: 4, y0: 11.5, y1: 14.4, z0: 0.15, z1: 2.4 }
  const casing = new THREE.Mesh(
    new RoundedBoxGeometry(IU.x1 - IU.x0, IU.y1 - IU.y0, IU.z1 - IU.z0, 4, 0.3),
    mat(C.white, { roughness: 0.35 }),
  )
  casing.position.set(0, (IU.y0 + IU.y1) / 2, (IU.z0 + IU.z1) / 2)
  reg('indoorUnit', casing, { shell: true })

  // 前面パネル（内部表示で上に開く）
  const panelPivot = new THREE.Group()
  panelPivot.position.set(0, IU.y1 - 0.05, IU.z1 + 0.02)
  root.add(panelPivot)
  const panel = new THREE.Mesh(new RoundedBoxGeometry(7.9, 2.0, 0.14, 3, 0.06), mat(0xfbfbfa, { roughness: 0.3 }))
  panel.position.set(0, -1.0, 0.05)
  reg('frontPanel', panel, { parent: panelPivot })

  // エアフィルター（前面と上面）
  const filterM = () => mat(0xffffff, { map: grid(), roughness: 0.8, side: THREE.DoubleSide })
  const f1 = boxMinMax(-3.6, 3.6, 12.55, 14.0, 2.08, 2.14, filterM())
  f1.rotation.x = -0.12
  reg('airFilter', f1)
  const f2 = boxMinMax(-3.6, 3.6, 14.12, 14.18, 0.55, 2.05, filterM())
  reg('airFilter', f2)

  // 室内熱交換器（Λ形）
  const finM = () => mat(0xffffff, { map: stripes(48), roughness: 0.5, metalness: 0.2 })
  const hx1 = new THREE.Mesh(new THREE.BoxGeometry(7.4, 1.75, 0.32), finM())
  hx1.position.set(0, 13.05, 1.72)
  hx1.rotation.x = -0.22
  reg('indoorHx', hx1)
  const hx2 = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.32, 1.35), finM())
  hx2.position.set(0, 13.85, 0.95)
  hx2.rotation.x = 0.38
  reg('indoorHx', hx2)
  // 両端の銅管の曲がり（目印）
  for (const x of [-3.75, 3.75]) {
    const end = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.6, 1.0), mat(0xaab4bb, { metalness: 0.3, roughness: 0.45 }))
    end.position.set(x, 13.3, 1.35)
    reg('indoorHx', end)
  }

  // 室内ファン（クロスフローファン）
  const fanG = new THREE.Group()
  fanG.position.set(0, 12.45, 1.05)
  root.add(fanG)
  const fanM = mat(C.fan, { roughness: 0.5 })
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2
    const blade = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.04, 0.2), fanM)
    blade.position.set(0, Math.sin(a) * 0.42, Math.cos(a) * 0.42)
    blade.rotation.x = -a + 0.5
    reg('indoorFan', blade, { parent: fanG })
  }
  for (const x of [-3.5, -1.17, 1.17, 3.5]) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 24), fanM)
    disc.rotation.z = Math.PI / 2
    disc.position.x = x
    reg('indoorFan', disc, { parent: fanG })
  }
  const motor = cyl(0.32, 0.5, mat(C.dark), 20)
  motor.rotation.z = Math.PI / 2
  motor.position.set(-3.8, 12.45, 1.05)
  reg('indoorFan', motor)
  const fanHit = cyl(0.62, 7.2, hit(), 8)
  fanHit.rotation.z = Math.PI / 2
  proxy('indoorFan', fanHit, fanG)

  // ドレンパン
  const panM = mat(0xb7bec4, { roughness: 0.6 })
  reg('drainPan', boxMinMax(-3.8, 3.8, 12.02, 12.12, 1.55, 2.25, panM))
  reg('drainPan', boxMinMax(-3.8, 3.8, 12.12, 12.32, 2.17, 2.25, panM))
  reg('drainPan', boxMinMax(-3.8, 3.8, 12.12, 12.28, 1.55, 1.63, panM))
  proxy('drainPan', boxMinMax(-3.85, 3.85, 11.95, 12.35, 1.5, 2.3, hit()))

  // 風向ルーバー
  const flapPivot = new THREE.Group()
  flapPivot.position.set(0, 11.72, 2.2)
  root.add(flapPivot)
  const flapMesh = new THREE.Mesh(new RoundedBoxGeometry(7.2, 0.08, 0.7, 2, 0.03), mat(0xf3f4f2, { roughness: 0.35 }))
  flapMesh.position.set(0, 0, 0.32)
  reg('flap', flapMesh, { parent: flapPivot })
  const FLAP_REST = 1.3
  const FLAP_OPEN = 0.45
  flapPivot.rotation.x = FLAP_REST

  // リモコン（壁のホルダー）
  const remote = new THREE.Mesh(new RoundedBoxGeometry(0.55, 1.5, 0.22, 2, 0.08), mat(0xfafafa, { roughness: 0.4 }))
  remote.position.set(-6.2, 8.0, 0.2)
  reg('remote', remote)
  const screen = boxMinMax(-6.4, -6.0, 8.25, 8.6, 0.31, 0.33, mat(0x9fb4ad))
  reg('remote', screen)
  reg('remote', boxMinMax(-6.55, -5.85, 7.15, 7.5, 0.0, 0.35, mat(0xe6e8e6)))

  // ---------- 室外機 ----------
  const OU = { x0: -3.9, x1: 3.9, y0: 0.5, y1: 6.0, z0: -4.9, z1: -2.0 }
  const ouM = () => mat(0xf2f2ee, { roughness: 0.45, side: THREE.DoubleSide })
  // 台（ブロック）
  for (const x of [-3.0, 3.0]) env(boxMinMax(x - 0.6, x + 0.6, 0, OU.y0, -4.7, -2.2, mat(0xa9a69e, { roughness: 1 })))
  // 天板・底板・右側板・左側の前寄り（熱交換器が背面と左側を兼ねる）
  reg('outdoorUnit', boxMinMax(OU.x0, OU.x1, OU.y1 - 0.12, OU.y1, OU.z0, OU.z1, ouM()), { shell: true })
  reg('outdoorUnit', boxMinMax(OU.x0, OU.x1, OU.y0, OU.y0 + 0.12, OU.z0, OU.z1, ouM()), { shell: true })
  reg('outdoorUnit', boxMinMax(OU.x1 - 0.1, OU.x1, OU.y0, OU.y1, OU.z0, OU.z1, ouM()), { shell: true })
  reg('outdoorUnit', boxMinMax(1.3, OU.x1, OU.y0, OU.y1, OU.z1 - 0.1, OU.z1, ouM()), { shell: true })
  // 前面パネル（丸い吹き出し口つき）
  const FAN = v(-1.25, 3.25, OU.z0 + 0.35)
  const front = new THREE.Shape()
  front.moveTo(OU.x0, OU.y0)
  front.lineTo(OU.x1, OU.y0)
  front.lineTo(OU.x1, OU.y1)
  front.lineTo(OU.x0, OU.y1)
  front.lineTo(OU.x0, OU.y0)
  const opening = new THREE.Path()
  opening.absarc(FAN.x, FAN.y, 2.2, 0, Math.PI * 2, true)
  front.holes.push(opening)
  const frontGeo = new THREE.ExtrudeGeometry(front, { depth: 0.1, bevelEnabled: false, curveSegments: 48 })
  const frontMesh = new THREE.Mesh(frontGeo, ouM())
  frontMesh.position.z = OU.z0
  reg('outdoorUnit', frontMesh, { shell: true })
  // ファンガード（網）
  const guardM = mat(0x8e979e, { metalness: 0.4, roughness: 0.4 })
  for (const r of [0.6, 1.2, 1.75, 2.2]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.03, 6, 48), guardM)
    ring.position.set(FAN.x, FAN.y, OU.z0 - 0.05)
    root.add(ring)
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI
    const bar = rod(
      v(FAN.x + Math.cos(a) * 2.2, FAN.y + Math.sin(a) * 2.2, OU.z0 - 0.05),
      v(FAN.x - Math.cos(a) * 2.2, FAN.y - Math.sin(a) * 2.2, OU.z0 - 0.05),
      0.03,
      guardM,
    )
    root.add(bar)
  }
  // 仕切り板（ファン室と機械室）
  env(boxMinMax(1.25, 1.33, OU.y0 + 0.12, OU.y1 - 0.12, OU.z0 + 0.1, OU.z1 - 0.1, mat(0xd9dcd8, { side: THREE.DoubleSide })))

  // 室外熱交換器（背面と左側面のL字）
  const ofinM = () => mat(0xffffff, { map: stripes(64), roughness: 0.5, metalness: 0.2 })
  reg('outdoorHx', boxMinMax(OU.x0 + 0.05, 1.2, OU.y0 + 0.15, OU.y1 - 0.15, OU.z1 - 0.32, OU.z1 - 0.02, ofinM()))
  reg('outdoorHx', boxMinMax(OU.x0, OU.x0 + 0.3, OU.y0 + 0.15, OU.y1 - 0.15, OU.z0 + 0.6, OU.z1 - 0.02, ofinM()))

  // 室外ファン（プロペラ）
  const ofan = new THREE.Group()
  ofan.position.copy(FAN)
  root.add(ofan)
  const bladeM = mat(0x8fa0aa, { roughness: 0.5, side: THREE.DoubleSide })
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Shape()
    blade.moveTo(0.25, -0.2)
    blade.quadraticCurveTo(1.4, -0.9, 1.95, -0.2)
    blade.quadraticCurveTo(2.0, 0.5, 0.25, 0.25)
    const g = new THREE.ShapeGeometry(blade, 12)
    const m = new THREE.Mesh(g, bladeM)
    m.rotation.z = (i / 3) * Math.PI * 2
    m.rotation.y = 0.25
    reg('outdoorFan', m, { parent: ofan })
  }
  const hubMesh = cyl(0.32, 0.4, mat(0x6f7c84), 20)
  hubMesh.rotation.x = Math.PI / 2
  reg('outdoorFan', hubMesh, { parent: ofan })
  const ofanHit = cyl(2.1, 0.5, hit(), 16)
  ofanHit.rotation.x = Math.PI / 2
  proxy('outdoorFan', ofanHit, ofan)

  // 圧縮機
  const comp = new THREE.Group()
  comp.position.set(2.6, 0, -3.45)
  root.add(comp)
  const compM = () => mat(C.compressor, { roughness: 0.45, metalness: 0.3 })
  const body = cyl(0.72, 2.3, compM(), 32)
  body.position.y = 1.85
  reg('compressor', body, { parent: comp })
  for (const y of [0.7, 3.0]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.72, 32, 12, 0, Math.PI * 2, y > 1 ? 0 : Math.PI / 2, Math.PI / 2), compM())
    cap.scale.y = 0.45
    cap.position.y = y
    reg('compressor', cap, { parent: comp })
  }
  const acc = cyl(0.28, 1.6, compM(), 20) // アキュムレーター（圧縮機の付属）
  acc.position.set(-0.95, 2.1, 0.3)
  reg('compressor', acc, { parent: comp })

  // 四方弁
  const fw = cyl(0.17, 0.9, mat(C.brass, { metalness: 0.5, roughness: 0.35 }), 16)
  fw.rotation.z = Math.PI / 2
  fw.position.set(2.5, 4.35, -3.0)
  reg('fourWay', fw)
  const fwCoil = boxMinMax(2.35, 2.75, 4.5, 4.85, -3.2, -2.8, mat(C.dark))
  reg('fourWay', fwCoil)
  proxy('fourWay', boxMinMax(1.9, 3.1, 4.0, 5.0, -3.4, -2.6, hit()))

  // 膨張弁（電子膨張弁）
  const ev = cyl(0.13, 0.6, mat(C.brass, { metalness: 0.5, roughness: 0.35 }), 16)
  ev.position.set(3.25, 2.4, -2.55)
  reg('expansionValve', ev)
  const evCoil = cyl(0.26, 0.4, mat(C.dark), 16)
  evCoil.position.set(3.25, 2.85, -2.55)
  reg('expansionValve', evCoil)
  proxy('expansionValve', boxMinMax(2.85, 3.65, 1.9, 3.3, -2.95, -2.15, hit()))

  // 機械室の中の配管（目印）
  const copper = mat(0xc58b5a, { metalness: 0.4, roughness: 0.4 })
  root.add(tube(curve([v(2.6, 3.25, -3.45), v(2.6, 4.0, -3.4), v(2.5, 4.35, -3.0)]), 0.06, copper, 16))
  root.add(tube(curve([v(2.1, 4.35, -3.0), v(1.6, 4.6, -2.6), v(1.1, 4.8, -2.25)]), 0.06, copper, 16))
  root.add(tube(curve([v(1.1, 1.3, -2.25), v(2.4, 1.6, -2.4), v(3.25, 2.1, -2.55)]), 0.05, copper, 16))

  // 接続バルブ
  const valveM = () => mat(0xb0b8bf, { metalness: 0.5, roughness: 0.35 })
  const LV = v(OU.x1 + 0.25, 1.3, -3.6)
  const GV = v(OU.x1 + 0.25, 2.05, -3.6)
  for (const p of [LV, GV]) {
    const b = boxMinMax(p.x - 0.25, p.x + 0.2, p.y - 0.22, p.y + 0.22, p.z - 0.3, p.z + 0.3, valveM())
    reg('serviceValve', b)
    const capM = cyl(0.12, 0.3, valveM(), 6)
    capM.position.set(p.x, p.y, p.z - 0.45)
    capM.rotation.x = Math.PI / 2
    reg('serviceValve', capM)
  }
  proxy('serviceValve', boxMinMax(OU.x1, OU.x1 + 0.7, 0.9, 2.5, -4.2, -3.0, hit()))

  // ---------- 配管穴・冷媒配管・ドレンホース・連絡線 ----------
  const SL = v(3.25, 11.85, 0)
  const sleeveGeo = new THREE.CylinderGeometry(0.55, 0.55, 1.5, 24, 1, true)
  sleeveGeo.rotateX(Math.PI / 2)
  const sleeve = new THREE.Mesh(sleeveGeo, mat(0x9aa3a8, { side: THREE.DoubleSide }))
  sleeve.position.set(SL.x, SL.y, -0.75)
  reg('sleeve', sleeve)

  const insul = () => mat(C.insul, { roughness: 0.8 })
  const liquidRoute = polyCurve(
    [
      v(3.55, 12.7, 1.55),
      v(3.55, 12.1, 0.7),
      v(3.05, 11.95, 0.25),
      v(3.05, 11.95, -1.55),
      v(4.9, 11.5, -2.0),
      v(4.9, 1.3, -2.0),
      v(4.9, 1.3, LV.z),
      v(LV.x + 0.2, LV.y, LV.z),
    ],
    0.35,
  )
  const gasRoute = polyCurve(
    [
      v(3.6, 13.6, 1.0),
      v(3.6, 12.5, 0.6),
      v(3.45, 11.95, 0.25),
      v(3.45, 11.95, -1.55),
      v(4.9, 11.3, -2.5),
      v(4.9, 2.05, -2.5),
      v(4.9, 2.05, GV.z),
      v(GV.x + 0.2, GV.y, GV.z),
    ],
    0.4,
  )
  reg('liquidPipe', tube(liquidRoute, 0.17, insul(), 160))
  reg('gasPipe', tube(gasRoute, 0.24, insul(), 160))
  proxy('liquidPipe', tube(liquidRoute, 0.23, hit(), 60))
  proxy('gasPipe', tube(gasRoute, 0.28, hit(), 60))

  const drainRoute = polyCurve(
    [
      v(3.7, 12.1, 1.9),
      v(3.7, 11.75, 0.8),
      v(3.25, 11.5, 0.25),
      v(3.25, 11.45, -1.55),
      v(5.4, 11.1, -1.65),
      v(5.4, 0.4, -1.65),
      v(5.5, 0.15, -2.1),
    ],
    0.4,
  )
  reg('drainHose', tube(drainRoute, 0.12, mat(C.drain, { roughness: 0.6 }), 160))
  proxy('drainHose', tube(drainRoute, 0.2, hit(), 60))

  const cableRoute = polyCurve(
    [v(3.2, 12.9, 0.8), v(2.95, 12.2, 0.25), v(2.95, 12.2, -1.55), v(4.45, 11.9, -1.62), v(4.45, 4.9, -1.62), v(4.45, 4.9, -2.6), v(OU.x1, 4.9, -2.6)],
    0.3,
  )
  reg('cable', tube(cableRoute, 0.05, mat(0x8a9197), 120))
  proxy('cable', tube(cableRoute, 0.17, hit(), 50))

  // ---------- 動きの道すじ ----------
  const hotPath = polyCurve(
    [
      v(2.6, 3.4, -3.45),
      v(2.6, 4.35, -3.2),
      v(1.6, 4.6, -2.6),
      v(1.0, 5.3, -2.0),
      v(-3.4, 5.3, -1.95),
      v(-3.4, 4.0, -1.95),
      v(1.0, 4.0, -1.95),
      v(1.0, 2.6, -1.95),
      v(-3.4, 2.6, -1.95),
      v(-3.4, 1.2, -1.95),
      v(1.0, 1.2, -1.95),
      v(2.4, 1.6, -2.4),
      v(3.25, 2.2, -2.55),
    ],
    0.3,
  )
  const coldPath = polyCurve(
    [
      v(3.25, 2.4, -2.55),
      v(3.6, 1.3, -3.2),
      v(LV.x + 0.2, LV.y, LV.z),
      ...liquidRoute.getSpacedPoints(60).reverse().slice(1),
      v(3.4, 12.65, 1.95),
      v(-3.5, 12.65, 2.0),
      v(-3.5, 13.25, 1.9),
      v(3.4, 13.25, 1.85),
      v(3.4, 13.8, 1.7),
      v(-3.4, 13.95, 1.5),
      v(-3.4, 14.1, 0.9),
      v(3.5, 14.0, 0.95),
      v(3.6, 13.6, 1.0),
    ],
    0.3,
  )
  const returnPath = polyCurve([...gasRoute.getSpacedPoints(70), v(3.6, 2.05, -3.4), v(2.9, 4.35, -3.0), v(2.0, 3.5, -3.2), v(1.65, 3.2, -3.15)], 0.3)
  const air = (x: number, pts: [number, number, number][]) => curve(pts.map(([y, z, dx]) => v(x + dx, y, z)), 0.3)
  const roomAir = (x: number) => air(x, [[15.8, 3.4, 0], [15.0, 1.6, 0], [14.3, 1.3, 0], [13.2, 1.15, 0], [12.5, 1.15, 0]])
  const coolAir = (x: number) => air(x, [[12.4, 1.2, 0], [11.7, 2.3, 0], [10.9, 3.9, 0], [10.0, 5.6, 0], [9.2, 7.2, 0]])
  const hotAir = (y: number) => curve([v(-1.25, y, -1.0), v(-1.25, y, -2.4), v(-1.25, y, -4.6), v(-1.25, y - 0.2, -6.4), v(-1.25, y - 0.4, -8.2)], 0.3)
  const drainPath = polyCurve([v(2.5, 12.15, 1.9), ...drainRoute.getSpacedPoints(70).slice(1)], 0.3)

  // ---------- ラベルの位置・ズームの向き ----------
  const anchors: Record<string, THREE.Vector3> = {
    indoorUnit: v(4.0, 14.0, 1.6),
    frontPanel: v(2.5, 13.8, 2.55),
    airFilter: v(1.5, 13.3, 2.15),
    indoorHx: v(-2.0, 13.4, 1.6),
    indoorFan: v(0.5, 12.45, 1.55),
    drainPan: v(-2.5, 12.15, 2.25),
    flap: v(2.5, 11.42, 2.32),
    remote: v(-6.2, 8.4, 0.35),
    liquidPipe: v(4.9, 7.0, -2.0),
    gasPipe: v(4.9, 5.0, -2.5),
    drainHose: v(5.4, 3.0, -1.65),
    cable: v(4.45, 9.0, -1.62),
    sleeve: v(SL.x, SL.y + 0.55, -0.75),
    outdoorUnit: v(OU.x1, OU.y1, OU.z0),
    outdoorFan: v(FAN.x + 1.2, FAN.y + 1.2, OU.z0 - 0.1),
    outdoorHx: v(-2.0, 4.8, -2.0),
    compressor: v(2.6, 2.9, -3.5),
    fourWay: v(2.5, 4.55, -2.8),
    expansionValve: v(3.25, 2.85, -2.9),
    serviceValve: v(LV.x - 0.1, LV.y, -3.95),
  }
  const views: Record<string, THREE.Vector3> = {
    indoorUnit: v(0.6, 0.3, 1),
    frontPanel: v(0.5, 0.2, 1),
    airFilter: v(0.4, 0.5, 1),
    indoorHx: v(0.7, 0.3, 1),
    indoorFan: v(0.4, -0.65, 1),
    drainPan: v(0.6, 0.6, 1),
    flap: v(0.5, -0.2, 1),
    remote: v(0.2, 0.1, 1),
    liquidPipe: v(1, 0.2, -0.3),
    gasPipe: v(1, 0.2, -0.3),
    drainHose: v(1, 0.2, -0.4),
    cable: v(1, 0.2, -0.3),
    sleeve: v(1, 0.2, 0.15),
    outdoorUnit: v(0.6, 0.35, -1),
    outdoorFan: v(0.3, 0.2, -1),
    outdoorHx: v(-0.6, 0.4, 0.3),
    compressor: v(1, 0.4, -0.6),
    fourWay: v(1, 0.5, -0.6),
    expansionValve: v(1, 0.4, -0.3),
    serviceValve: v(1, 0.3, -0.5),
  }

  // ---------- 動き ----------
  const ramp = (t: number, a: number, b: number) => Math.max(0, Math.min(1, (t - a) / (b - a)))
  const smooth = (k: number) => k * k * (3 - 2 * k)
  // 回る角度：回り始め〜止まるまでの時間に比例（逆戻りしない）
  const spin = (t: number, a: number, b: number, w: number) => w * Math.max(0, Math.min(t, b) - a)
  const applyFlow = (t: number, running: boolean) => {
    const open = smooth(ramp(t, 0, 0.8)) * (1 - smooth(ramp(t, 14.1, 14.9)))
    flapPivot.rotation.x = FLAP_REST + (FLAP_OPEN - FLAP_REST) * open
    fanG.rotation.x = -spin(t, 5.6, 14.6, 9)
    ofan.rotation.z = spin(t, 1.8, 14.6, 7)
    const shake = running && t > 0.6 && t < 14.3 ? Math.sin(t * 70) * 0.012 : 0
    comp.position.x = 2.6 + shake
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
      hot: hotPath,
      cold: coldPath,
      ret: returnPath,
      roomAirL: roomAir(-2.6),
      roomAirC: roomAir(0),
      roomAirR: roomAir(2.6),
      coolAirL: coolAir(-2.6),
      coolAirC: coolAir(0),
      coolAirR: coolAir(2.6),
      hotAirA: hotAir(4.2),
      hotAirB: hotAir(2.4),
      drain: drainPath,
    },
    lifts: [{ id: 'frontPanel', group: panelPivot, offset: v(0, 0.2, 0.1), rotate: new THREE.Euler(-1.25, 0, 0) }],
    applyFlow,
  }
}
