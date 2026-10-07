import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { PartId } from '../data/parts'

// 座標系：1単位 ≒ 10cm。床の上面が y=0、壁の表面が z=0、便器の前は +z、右は +x。
// すべて基本形状（箱・円柱・回転体・押し出し・管）の組み合わせで作る。

export const COLORS = {
  porcelain: 0xf8f8f5,
  wall: 0xeceae4,
  floor: 0xd9d2c5,
  cut: 0x9aa7a6,
  water: 0x3a9be0,
  waterDeep: 0x2a7fc4,
  supply: 0x7fa6c9, // 給水（きれいな水）側の金属・管
  drain: 0x9aa1a8, // 排水側の管（灰色の塩ビ管をイメージ）
  rubber: 0x3d4248,
  metal: 0xc4cad0,
  plastic: 0xd7dbe0,
  float: 0xf3efe6,
  refill: 0x8cc5a2,
  trap: 0xd9dee4,
  ghost: 0xc9d4dc,
}

export type FlowPaths = {
  supply: THREE.Curve<THREE.Vector3>
  fill: THREE.Curve<THREE.Vector3>
  refill: THREE.Curve<THREE.Vector3>
  flushL: THREE.Curve<THREE.Vector3>
  flushR: THREE.Curve<THREE.Vector3>
  drain: THREE.Curve<THREE.Vector3>
}

export type ToiletModel = {
  root: THREE.Group
  partMeshes: Map<PartId, THREE.Mesh[]>
  pickables: THREE.Mesh[]
  shells: THREE.Mesh[]
  cutPanels: THREE.Object3D[]
  cutFrames: THREE.Object3D[]
  anchors: Record<PartId, THREE.Vector3>
  views: Partial<Record<PartId, THREE.Vector3>>
  paths: FlowPaths
  anim: {
    lever: THREE.Group
    flapper: THREE.Group
    float: THREE.Group
    floatAxis: THREE.Vector3
    tankWater: THREE.Mesh
    sealDisc: THREE.Mesh
    tankLid: THREE.Group
    chainLinks: THREE.Mesh[]
    chainTop: THREE.Object3D
    chainBottom: THREE.Object3D
  }
  constants: { waterLevel: number; tankBottom: number; sealLevel: number; floatPivotY: number; floatReach: number }
}

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

function mat(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05, ...opts })
}

function curve(points: THREE.Vector3[], tension = 0.2) {
  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', tension)
}

// 角をはっきりさせたい配管用：折れ線の角を少しだけ丸めた曲線
function polyCurve(points: THREE.Vector3[], round = 0.18) {
  const path = new THREE.CurvePath<THREE.Vector3>()
  let prev = points[0].clone()
  for (let i = 1; i < points.length; i++) {
    const p = points[i]
    if (i < points.length - 1) {
      const next = points[i + 1]
      const a = p.clone().add(prev.clone().sub(p).setLength(Math.min(round, prev.distanceTo(p) / 2)))
      const b = p.clone().add(next.clone().sub(p).setLength(Math.min(round, next.distanceTo(p) / 2)))
      path.add(new THREE.LineCurve3(prev, a))
      path.add(new THREE.QuadraticBezierCurve3(a, p.clone(), b))
      prev = b
    } else {
      path.add(new THREE.LineCurve3(prev, p.clone()))
    }
  }
  return path
}

function box(w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
  mesh.position.set(x, y, z)
  return mesh
}

// min/max から箱を作る
function boxMinMax(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, m: THREE.Material) {
  return box(x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, m)
}

function cyl(r: number, h: number, m: THREE.Material, seg = 24) {
  return new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), m)
}

// 2点間に円柱を置く
function rod(a: THREE.Vector3, b: THREE.Vector3, r: number, m: THREE.Material) {
  const len = a.distanceTo(b)
  const mesh = cyl(r, len, m, 12)
  mesh.position.copy(a).add(b).multiplyScalar(0.5)
  mesh.quaternion.setFromUnitVectors(v(0, 1, 0), b.clone().sub(a).normalize())
  return mesh
}

function tube(c: THREE.Curve<THREE.Vector3>, r: number, m: THREE.Material, seg = 64) {
  return new THREE.Mesh(new THREE.TubeGeometry(c, seg, r, 14, false), m)
}

export function buildToilet(): ToiletModel {
  const root = new THREE.Group()
  const partMeshes = new Map<PartId, THREE.Mesh[]>()
  const pickables: THREE.Mesh[] = []
  const shells: THREE.Mesh[] = []
  const cutPanels: THREE.Object3D[] = []
  const cutFrames: THREE.Object3D[] = []

  // 部品として登録する
  const reg = (id: PartId, mesh: THREE.Mesh, opt: { shell?: boolean; parent?: THREE.Object3D } = {}) => {
    mesh.userData.partId = id
    mesh.castShadow = true
    mesh.receiveShadow = true
    if (!partMeshes.has(id)) partMeshes.set(id, [])
    partMeshes.get(id)!.push(mesh)
    pickables.push(mesh)
    if (opt.shell) {
      mesh.userData.shell = true
      shells.push(mesh)
    }
    ;(opt.parent ?? root).add(mesh)
    return mesh
  }
  // 細い部品を選びやすくする、見えない太めの当たり判定
  const proxy = (id: PartId, mesh: THREE.Mesh, parent: THREE.Object3D = root) => {
    mesh.visible = false
    mesh.userData.partId = id
    mesh.userData.proxy = true
    pickables.push(mesh)
    parent.add(mesh)
  }
  const hitMat = new THREE.MeshBasicMaterial()

  // ---------- 壁と床（内部表示で一部を切り取る） ----------
  const wallM = mat(COLORS.wall, { roughness: 0.9 })
  const floorM = mat(COLORS.floor, { roughness: 0.85 })
  const W0 = -7,
    W1 = 7
  const wallHole = { x0: -3.0, x1: -1.8, y0: -0.4, y1: 2.6 }
  const wallParts = [
    boxMinMax(W0, wallHole.x0, -0.4, 10, -0.3, 0, wallM),
    boxMinMax(wallHole.x1, W1, -0.4, 10, -0.3, 0, wallM),
    boxMinMax(wallHole.x0, wallHole.x1, wallHole.y1, 10, -0.3, 0, wallM),
  ]
  const floorHole = { x0: -1.1, x1: 1.1, z0: 0, z1: 3.2 }
  const floorParts = [
    boxMinMax(W0, floorHole.x0, -0.4, 0, -0.3, 11, floorM),
    boxMinMax(floorHole.x1, W1, -0.4, 0, -0.3, 11, floorM),
    boxMinMax(floorHole.x0, floorHole.x1, -0.4, 0, floorHole.z1, 11, floorM),
    boxMinMax(floorHole.x0, floorHole.x1, -0.4, 0, -0.3, 0, floorM),
  ]
  for (const m of [...wallParts, ...floorParts]) {
    m.receiveShadow = true
    m.userData.env = true
    root.add(m)
  }
  const wallPanel = boxMinMax(wallHole.x0, wallHole.x1, wallHole.y0, wallHole.y1, -0.3, 0, wallM)
  const floorPanel = boxMinMax(floorHole.x0, floorHole.x1, -0.4, 0, floorHole.z0, floorHole.z1, floorM)
  for (const p of [wallPanel, floorPanel]) {
    p.receiveShadow = true
    p.userData.env = true
    root.add(p)
    cutPanels.push(p)
    const frame = new THREE.LineSegments(
      new THREE.EdgesGeometry(p.geometry),
      new THREE.LineBasicMaterial({ color: COLORS.cut }),
    )
    frame.position.copy(p.position)
    frame.visible = false
    root.add(frame)
    cutFrames.push(frame)
  }
  // 切り取った穴の奥（壁の中・床下）を少し暗い色で見せる
  const cavityM = mat(0xb9b2a5, { roughness: 1 })
  const wallBack = boxMinMax(wallHole.x0, wallHole.x1, wallHole.y0, wallHole.y1, -0.34, -0.3, cavityM)
  wallBack.userData.env = true
  root.add(wallBack)
  const crawl = boxMinMax(floorHole.x0 - 0.2, floorHole.x1 + 0.2, -2.3, -2.25, -0.3, floorHole.z1 + 0.2, cavityM)
  crawl.userData.env = true
  crawl.receiveShadow = true
  root.add(crawl)

  // 切り口に見える断面（床・壁の厚み）を少し濃く
  const sectionM = mat(0xc9c1b2, { roughness: 1 })
  const floorUnder = boxMinMax(-7, 7, -0.42, -0.4, -0.3, 11, sectionM)
  root.add(floorUnder)

  // ---------- 便器 ----------
  const porcelain = () => mat(COLORS.porcelain, { roughness: 0.28, side: THREE.DoubleSide })
  const BOWL_Z = 4.1
  const profile = [
    [1.15, 0],
    [1.02, 0.5],
    [0.93, 1.2],
    [1.0, 1.9],
    [1.25, 2.5],
    [1.55, 3.0],
    [1.78, 3.4],
    [1.86, 3.62],
    [1.82, 3.74],
    [1.62, 3.77],
    [1.5, 3.7],
    [1.44, 3.45],
    [1.24, 3.0],
    [0.95, 2.55],
    [0.6, 2.15],
    [0.32, 1.95],
    [0.28, 1.9],
  ].map(([r, y]) => new THREE.Vector2(r, y))
  const bowlGeo = new THREE.LatheGeometry(profile, 64)
  bowlGeo.scale(1, 1, 1.22)
  const bowl = new THREE.Mesh(bowlGeo, porcelain())
  bowl.position.set(0, 0, BOWL_Z)
  reg('bowl', bowl, { shell: true })

  // 便器の後ろ側（タンクをのせる部分）：側面の形を押し出して作る
  const side = new THREE.Shape()
  side.moveTo(0.85, 0)
  side.lineTo(3.0, 0)
  side.lineTo(3.0, 0.9)
  side.bezierCurveTo(3.0, 2.2, 2.3, 2.6, 2.15, 3.62)
  side.lineTo(0.85, 3.62)
  side.lineTo(0.85, 0)
  const rearGeo = new THREE.ExtrudeGeometry(side, {
    depth: 1.8,
    bevelEnabled: true,
    bevelThickness: 0.12,
    bevelSize: 0.08,
    bevelSegments: 3,
    curveSegments: 16,
  })
  rearGeo.rotateY(-Math.PI / 2)
  rearGeo.translate(0.9, 0, 0)
  const rear = new THREE.Mesh(rearGeo, porcelain())
  reg('bowl', rear, { shell: true })

  // ---------- 便座とふた ----------
  const SEAT_Y = 3.78
  const SEAT_Z = 4.15
  const ring = new THREE.Shape()
  ring.absellipse(0, 0, 1.85, 2.2, 0, Math.PI * 2, false, 0)
  const hole = new THREE.Path()
  hole.absellipse(0, -0.12, 1.12, 1.45, 0, Math.PI * 2, true, 0)
  ring.holes.push(hole)
  const seatGeo = new THREE.ExtrudeGeometry(ring, {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.06,
    bevelSegments: 3,
    curveSegments: 48,
  })
  seatGeo.rotateX(-Math.PI / 2)
  const seat = new THREE.Mesh(seatGeo, mat(0xfbfbf9, { roughness: 0.35 }))
  seat.position.set(0, SEAT_Y, SEAT_Z)
  reg('seat', seat, { shell: true })
  for (const x of [-0.85, 0.85]) {
    const hinge = cyl(0.13, 0.42, mat(0xe7e8e6, { roughness: 0.4 }), 16)
    hinge.rotation.z = Math.PI / 2
    hinge.position.set(x, SEAT_Y + 0.17, 2.25)
    reg('seat', hinge, { shell: true })
  }

  const lidShape = new THREE.Shape()
  lidShape.absellipse(0, -2.12, 1.83, 2.1, 0, Math.PI * 2, false, 0)
  const lidGeo = new THREE.ExtrudeGeometry(lidShape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.06,
    bevelSegments: 3,
    curveSegments: 48,
  })
  lidGeo.rotateX(-Math.PI / 2)
  const lidPivot = new THREE.Group()
  lidPivot.position.set(0, SEAT_Y + 0.22, 2.3)
  lidPivot.rotation.x = -Math.PI * 0.51
  root.add(lidPivot)
  const lid = new THREE.Mesh(lidGeo, mat(0xfbfbf9, { roughness: 0.35 }))
  reg('lid', lid, { parent: lidPivot, shell: true })

  // ---------- タンク ----------
  const T = { x0: -2.0, x1: 2.0, y0: 3.7, y1: 7.82, z0: 0.25, z1: 2.0 }
  const tankGeo = new RoundedBoxGeometry(T.x1 - T.x0, T.y1 - T.y0, T.z1 - T.z0, 4, 0.16)
  const tank = new THREE.Mesh(tankGeo, mat(COLORS.porcelain, { roughness: 0.28 }))
  tank.position.set(0, (T.y0 + T.y1) / 2, (T.z0 + T.z1) / 2)
  reg('tank', tank, { shell: true })

  const tankLid = new THREE.Group()
  root.add(tankLid)
  const tlGeo = new RoundedBoxGeometry(4.16, 0.28, 1.92, 4, 0.1)
  const tl = new THREE.Mesh(tlGeo, mat(COLORS.porcelain, { roughness: 0.28 }))
  tl.position.set(0, T.y1 + 0.12, (T.z0 + T.z1) / 2)
  reg('tankLid', tl, { parent: tankLid })

  // タンクの水（部品ではないので選択対象外）
  const tankBottom = T.y0 + 0.12
  const WATER_LEVEL = 6.3
  const twGeo = new THREE.BoxGeometry(3.7, 1, 1.5)
  twGeo.translate(0, 0.5, 0)
  const tankWater = new THREE.Mesh(
    twGeo,
    new THREE.MeshStandardMaterial({
      color: COLORS.water,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      roughness: 0.1,
    }),
  )
  tankWater.position.set(0, tankBottom, (T.z0 + T.z1) / 2)
  tankWater.scale.y = WATER_LEVEL - tankBottom
  tankWater.renderOrder = 2
  root.add(tankWater)

  // ---------- 洗浄レバー（外のハンドル＋中のアーム） ----------
  const HUB = v(-1.35, 7.15, T.z1)
  const lever = new THREE.Group()
  lever.position.copy(HUB)
  root.add(lever)
  const chrome = () => mat(COLORS.metal, { metalness: 0.25, roughness: 0.3 })
  const hub = cyl(0.2, 0.16, chrome(), 24)
  hub.rotation.x = Math.PI / 2
  hub.position.set(0, 0, 0.08)
  reg('lever', hub, { parent: lever })
  const handle = new THREE.Mesh(new RoundedBoxGeometry(0.8, 0.16, 0.12, 2, 0.05), chrome())
  handle.position.set(-0.42, -0.04, 0.2)
  handle.rotation.z = 0.08
  reg('lever', handle, { parent: lever })
  const shaft = rod(v(0, 0, 0.1), v(0, 0, -0.3), 0.05, chrome())
  reg('lever', shaft, { parent: lever })
  const armEnd = v(2.05, 0.02, -0.65) // HUB からの相対位置（フロートバルブの真上）
  const arm = rod(v(0, 0, -0.3), armEnd, 0.045, mat(COLORS.plastic))
  reg('lever', arm, { parent: lever })
  proxy('lever', new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 0.45), hitMat), lever)
  lever.children[lever.children.length - 1].position.set(-0.35, 0, 0.18)
  const chainTop = new THREE.Object3D()
  chainTop.position.copy(armEnd)
  lever.add(chainTop)

  // ---------- 排水口・フロートバルブ・オーバーフロー管 ----------
  const DRAIN = v(0.7, tankBottom, 1.3)
  const OVF = v(0.7, 0, 0.62)
  const plastic = () => mat(COLORS.plastic, { roughness: 0.45 })
  const seatRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 10, 32), plastic())
  seatRing.rotation.x = Math.PI / 2
  seatRing.position.set(DRAIN.x, DRAIN.y + 0.04, DRAIN.z)
  reg('overflow', seatRing)
  const ovfPipe = cyl(0.17, 6.95 - tankBottom, plastic(), 24)
  ovfPipe.position.set(OVF.x, (6.95 + tankBottom) / 2, OVF.z)
  reg('overflow', ovfPipe)
  const ovfTop = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 8, 24), plastic())
  ovfTop.rotation.x = Math.PI / 2
  ovfTop.position.set(OVF.x, 6.95, OVF.z)
  reg('overflow', ovfTop)
  const ovfBase = boxMinMax(OVF.x - 0.15, OVF.x + 0.15, tankBottom, tankBottom + 0.12, OVF.z, DRAIN.z - 0.3, plastic())
  reg('overflow', ovfBase)
  proxy('overflow', (() => {
    const m = cyl(0.3, 3.0, hitMat, 8)
    m.position.set(OVF.x, 5.3, OVF.z)
    return m
  })())

  const flapper = new THREE.Group()
  flapper.position.set(DRAIN.x, DRAIN.y + 0.1, DRAIN.z - 0.5) // 後ろ側のちょうつがい
  root.add(flapper)
  const flapGeo = new THREE.SphereGeometry(0.46, 32, 12, 0, Math.PI * 2, 0, Math.PI * 0.32)
  flapGeo.scale(1, 0.9, 1)
  const flap = new THREE.Mesh(flapGeo, mat(COLORS.rubber, { roughness: 0.7 }))
  flap.position.set(0, -0.36, 0.5)
  reg('floatValve', flap, { parent: flapper })
  const flapRim = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.06, 32), mat(COLORS.rubber, { roughness: 0.7 }))
  flapRim.position.set(0, 0.0, 0.5)
  reg('floatValve', flapRim, { parent: flapper })
  const flapArm = rod(v(0, 0.02, 0.02), v(0, 0.06, 0.25), 0.05, mat(COLORS.rubber, { roughness: 0.7 }))
  reg('floatValve', flapArm, { parent: flapper })
  proxy('floatValve', (() => {
    const m = cyl(0.58, 0.32, hitMat, 12)
    m.position.set(0, 0.14, 0.5)
    return m
  })(), flapper)
  const chainBottom = new THREE.Object3D()
  chainBottom.position.set(0, 0.12, 0.55)
  flapper.add(chainBottom)

  // ---------- 鎖（両端の位置から毎フレーム並べ直す） ----------
  const chainLinks: THREE.Mesh[] = []
  const linkGeo = new THREE.TorusGeometry(0.055, 0.016, 6, 12)
  linkGeo.scale(1, 1.6, 1)
  const chainMat = mat(0xaab1b8, { metalness: 0.7, roughness: 0.3 })
  for (let i = 0; i < 26; i++) {
    const link = new THREE.Mesh(linkGeo, chainMat)
    link.rotation.y = i % 2 ? Math.PI / 2 : 0
    reg('chain', link)
    chainLinks.push(link)
  }
  proxy('chain', (() => {
    const m = cyl(0.22, 2.6, hitMat, 8)
    m.position.set(DRAIN.x, 5.6, DRAIN.z + 0.05)
    return m
  })())

  // ---------- ボールタップと浮き球 ----------
  const BT = v(-1.5, 0, 1.1)
  const btM = () => mat(0xb7c0c9, { roughness: 0.45 })
  const btBody = cyl(0.17, 6.5 - (T.y0 - 0.35), btM(), 20)
  btBody.position.set(BT.x, (6.5 + T.y0 - 0.35) / 2, BT.z)
  reg('ballTap', btBody)
  const btHead = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.42, 0.5, 3, 0.1), btM())
  btHead.position.set(BT.x + 0.05, 6.62, BT.z)
  reg('ballTap', btHead)
  const btNut = cyl(0.26, 0.14, chrome(), 6)
  btNut.position.set(BT.x, T.y0 - 0.12, BT.z)
  reg('ballTap', btNut)
  const btSpout = cyl(0.07, 1.6, btM(), 10)
  btSpout.position.set(BT.x + 0.28, 5.0, BT.z)
  reg('ballTap', btSpout)
  proxy('ballTap', (() => {
    const m = cyl(0.42, 3.2, hitMat, 8)
    m.position.set(BT.x + 0.1, 5.2, BT.z)
    return m
  })())

  const FLOAT_PIVOT = v(BT.x + 0.3, 6.55, BT.z)
  const floatDir = v(1.05, 0, 0.28).normalize()
  const FLOAT_REACH = 1.2
  const floatAxis = floatDir.clone().cross(v(0, 1, 0)).normalize()
  const floatG = new THREE.Group()
  floatG.position.copy(FLOAT_PIVOT)
  root.add(floatG)
  const ballPos = floatDir.clone().multiplyScalar(FLOAT_REACH)
  const fArm = rod(v(0, 0, 0), ballPos.clone().multiplyScalar(0.72), 0.035, chrome())
  reg('ballTap', fArm, { parent: floatG })
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 20), mat(COLORS.float, { roughness: 0.4 }))
  ball.position.copy(ballPos)
  reg('floatBall', ball, { parent: floatG })
  proxy('floatBall', (() => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.48, 12, 8), hitMat)
    m.position.copy(ballPos)
    return m
  })(), floatG)

  // ---------- 補助水管 ----------
  const refillCurve = curve([
    v(BT.x + 0.2, 6.85, BT.z - 0.05),
    v(BT.x + 0.5, 7.3, 0.95),
    v(-0.2, 7.45, 0.72),
    v(0.55, 7.25, OVF.z),
    v(OVF.x, 6.85, OVF.z),
  ])
  reg('refillTube', tube(refillCurve, 0.045, mat(COLORS.refill, { roughness: 0.5 })))
  proxy('refillTube', tube(refillCurve, 0.2, hitMat, 24))

  // ---------- 密結パッキン ----------
  const gasket = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.48, 0.16, 32), mat(0x55606b, { roughness: 0.8 }))
  gasket.position.set(DRAIN.x, 3.66, DRAIN.z)
  reg('tankGasket', gasket)

  // ---------- 止水栓・給水管・給水ホース ----------
  const SV = v(-2.4, 1.9, 0)
  const supplyMetal = () => mat(COLORS.supply, { metalness: 0.45, roughness: 0.35 })
  const plate = cyl(0.36, 0.05, chrome(), 32)
  plate.rotation.x = Math.PI / 2
  plate.position.set(SV.x, SV.y, 0.03)
  reg('stopValve', plate)
  const svBody = cyl(0.15, 0.6, chrome(), 20)
  svBody.rotation.x = Math.PI / 2
  svBody.position.set(SV.x, SV.y, 0.32)
  reg('stopValve', svBody)
  const svCap = cyl(0.12, 0.3, chrome(), 16)
  svCap.position.set(SV.x, SV.y - 0.25, 0.4)
  reg('stopValve', svCap)
  const svScrew = cyl(0.1, 0.08, mat(0x8b949c, { metalness: 0.5 }), 16)
  svScrew.position.set(SV.x, SV.y - 0.42, 0.4)
  reg('stopValve', svScrew)
  const svOut = cyl(0.12, 0.32, chrome(), 16)
  svOut.position.set(SV.x, SV.y + 0.18, 0.55)
  reg('stopValve', svOut)
  proxy('stopValve', boxMinMax(SV.x - 0.38, SV.x + 0.38, SV.y - 0.55, SV.y + 0.45, 0, 0.8, hitMat))

  const pipeInWall = polyCurve([v(SV.x, -2.4, -0.15), v(SV.x, SV.y, -0.15), v(SV.x, SV.y, 0.05)], 0.12)
  reg('supplyPipe', tube(pipeInWall, 0.11, supplyMetal(), 48))

  const hoseCurve = curve([
    v(SV.x, SV.y + 0.32, 0.55),
    v(SV.x + 0.02, 2.75, 0.62),
    v(-2.1, 3.12, 0.9),
    v(BT.x - 0.05, 3.32, BT.z),
    v(BT.x, T.y0 - 0.2, BT.z),
  ])
  reg('supplyHose', tube(hoseCurve, 0.085, supplyMetal()))
  proxy('supplyHose', tube(hoseCurve, 0.24, hitMat, 24))

  // ---------- 封水・排水トラップ ----------
  const SEAL = 2.25
  const trapCurve = curve(
    [
      v(0, 1.98, 3.95),
      v(0, 1.55, 3.7),
      v(0, 1.28, 3.2),
      v(0, 1.75, 2.72),
      v(0, 2.52, 2.5),
      v(0, 2.1, 2.12),
      v(0, 1.2, 2.0),
      v(0, 0.12, 2.0),
    ],
    0.35,
  )
  const trapMesh = tube(trapCurve, 0.3, mat(COLORS.trap, { roughness: 0.35, side: THREE.DoubleSide }), 96)
  reg('trap', trapMesh)

  const waterM = () =>
    new THREE.MeshStandardMaterial({
      color: COLORS.water,
      transparent: true,
      opacity: 0.72,
      roughness: 0.1,
      depthWrite: false,
    })
  const sealGeo = new THREE.CircleGeometry(1, 48)
  sealGeo.rotateX(-Math.PI / 2)
  const sealDisc = new THREE.Mesh(sealGeo, waterM())
  sealDisc.scale.set(0.78, 1, 0.98)
  sealDisc.position.set(0, SEAL, BOWL_Z)
  sealDisc.renderOrder = 3
  reg('sealWater', sealDisc)
  // トラップの中の水（入口からせきの手前まで）
  const trapPts = trapCurve.getSpacedPoints(80)
  const wetPts = trapPts.slice(0, 40)
  const wet = tube(curve(wetPts, 0.5), 0.24, waterM(), 48)
  wet.renderOrder = 3
  reg('sealWater', wet)

  // ---------- 排水ソケット・排水管 ----------
  const drainM = () => mat(COLORS.drain, { roughness: 0.6 })
  const flange = cyl(0.55, 0.3, drainM(), 32)
  flange.position.set(0, -0.08, 2.0)
  reg('floorFlange', flange)
  const flangeRing = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 8, 32), mat(0x6b7178))
  flangeRing.rotation.x = Math.PI / 2
  flangeRing.position.set(0, 0.07, 2.0)
  reg('floorFlange', flangeRing)
  const drainCurve = polyCurve([v(0, -0.2, 2.0), v(0, -1.25, 2.0), v(0, -1.45, -2.4)], 0.45)
  reg('drainPipe', tube(drainCurve, 0.42, drainM(), 48))

  // ---------- 水の流れの道すじ ----------
  const supplyPath = polyCurve(
    [
      v(SV.x, -2.2, -0.15),
      v(SV.x, SV.y, -0.15),
      v(SV.x, SV.y, 0.55),
      ...hoseCurve.getPoints(10).slice(1),
      v(BT.x, 6.55, BT.z),
    ],
    0.08,
  )
  const fillPath = polyCurve([v(BT.x + 0.05, 6.6, BT.z), v(BT.x + 0.28, 6.4, BT.z), v(BT.x + 0.28, tankBottom + 0.2, BT.z)], 0.1)
  const refillPath = polyCurve(
    [
      ...refillCurve.getPoints(14),
      v(OVF.x, tankBottom + 0.05, OVF.z),
      v(OVF.x, 3.45, 1.4),
      v(0.3, 3.4, 2.4),
      v(0, 3.0, 5.6),
      v(0, SEAL + 0.05, 4.6),
    ],
    0.2,
  )
  const flush = (s: number) =>
    curve(
      [
        v(DRAIN.x, 4.3, DRAIN.z),
        v(DRAIN.x, 3.45, DRAIN.z + 0.15),
        v(s * 0.9, 3.5, 2.3),
        v(s * 1.55, 3.55, 3.3),
        v(s * 1.62, 3.5, 4.6),
        v(s * 1.05, 3.45, 5.75),
        v(s * 0.35, 3.1, 5.85),
        v(s * 0.1, 2.45, 4.9),
        v(0, SEAL - 0.1, 4.1),
      ],
      0.3,
    )
  const drainPath = polyCurve([...trapCurve.getPoints(30), v(0, -1.25, 2.0), v(0, -1.45, -2.2)], 0.4)

  const anchors: Record<PartId, THREE.Vector3> = {
    bowl: v(1.45, 2.9, 4.6),
    seat: v(-1.6, 3.95, 5.1),
    lid: v(0, 7.2, 2.15),
    tank: v(2.0, 6.0, 1.6),
    tankLid: v(1.5, 8.05, 1.6),
    lever: v(-2.0, 7.1, 2.25),
    stopValve: v(SV.x, SV.y, 0.55),
    supplyPipe: v(SV.x, 0.6, -0.1),
    supplyHose: v(-2.2, 2.9, 0.8),
    ballTap: v(BT.x, 5.0, BT.z),
    floatBall: v(-0.35, 6.3, 1.4),
    chain: v(DRAIN.x, 5.6, DRAIN.z + 0.05),
    floatValve: v(DRAIN.x, tankBottom + 0.2, DRAIN.z + 0.3),
    overflow: v(OVF.x, 6.7, OVF.z),
    refillTube: v(-0.4, 7.45, 0.75),
    tankGasket: v(DRAIN.x + 0.45, 3.66, DRAIN.z),
    sealWater: v(0.3, SEAL, 4.3),
    trap: v(0, 1.3, 3.2),
    floorFlange: v(0.5, 0, 2.0),
    drainPipe: v(0, -1.4, 0.2),
  }

  // 部品へズームするときの見る方向（指定がなければ今の向き）
  const views: Partial<Record<PartId, THREE.Vector3>> = {
    stopValve: v(-0.9, 0.35, 1),
    supplyPipe: v(-0.6, 0.25, 1),
    supplyHose: v(-1, 0.4, 0.8),
    trap: v(1, 0.25, 0.35),
    sealWater: v(0.15, 1.1, 0.8),
    floorFlange: v(0.7, 1.0, 0.8),
    drainPipe: v(0.9, 0.5, 0.9),
    tankGasket: v(0.9, 0.3, 0.9),
    floatValve: v(0.45, 0.75, 1),
    chain: v(0.45, 0.35, 1),
    overflow: v(0.6, 0.35, 1),
    refillTube: v(0.2, 0.7, 1),
    ballTap: v(-0.3, 0.3, 1),
    floatBall: v(0.2, 0.5, 1),
    lever: v(-0.5, 0.3, 1),
    tankLid: v(0.4, 0.8, 1),
    lid: v(0.3, 0.2, 1),
  }

  return {
    root,
    partMeshes,
    pickables,
    shells,
    cutPanels,
    cutFrames,
    anchors,
    views,
    paths: {
      supply: supplyPath,
      fill: fillPath,
      refill: refillPath,
      flushL: flush(-1),
      flushR: flush(1),
      drain: drainPath,
    },
    anim: {
      lever,
      flapper,
      float: floatG,
      floatAxis,
      tankWater,
      sealDisc,
      tankLid,
      chainLinks,
      chainTop,
      chainBottom,
    },
    constants: {
      waterLevel: WATER_LEVEL,
      tankBottom,
      sealLevel: SEAL,
      floatPivotY: FLOAT_PIVOT.y,
      floatReach: FLOAT_REACH,
    },
  }
}
