import * as THREE from 'three'
import type { PartId } from '../stages/types'

// 模型づくりの共通道具：基本形状と、部品としての登録。

export const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

export function mat(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05, ...opts })
}

export function curve(points: THREE.Vector3[], tension = 0.2) {
  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', tension)
}

// 角をはっきりさせたい配管用：折れ線の角を少しだけ丸めた曲線
export function polyCurve(points: THREE.Vector3[], round = 0.18) {
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

export function box(w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
  mesh.position.set(x, y, z)
  return mesh
}

// min/max から箱を作る
export function boxMinMax(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, m: THREE.Material) {
  return box(x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, m)
}

export function cyl(r: number, h: number, m: THREE.Material, seg = 24) {
  return new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), m)
}

// 2点間に円柱を置く
export function rod(a: THREE.Vector3, b: THREE.Vector3, r: number, m: THREE.Material) {
  const len = a.distanceTo(b)
  const mesh = cyl(r, len, m, 12)
  mesh.position.copy(a).add(b).multiplyScalar(0.5)
  mesh.quaternion.setFromUnitVectors(v(0, 1, 0), b.clone().sub(a).normalize())
  return mesh
}

export function tube(c: THREE.Curve<THREE.Vector3>, r: number, m: THREE.Material, seg = 64) {
  return new THREE.Mesh(new THREE.TubeGeometry(c, seg, r, 14, false), m)
}

// 部品の登録係。登録したメッシュは、選択・強調・半透明化・当たり判定の対象になる。
export function createRegistry(root: THREE.Group) {
  const partMeshes = new Map<PartId, THREE.Mesh[]>()
  const pickables: THREE.Mesh[] = []
  const shells: THREE.Mesh[] = []
  const cutPanels: THREE.Object3D[] = []
  const cutFrames: THREE.Object3D[] = []
  const hitMat = new THREE.MeshBasicMaterial()

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
    mesh.material = hitMat
    mesh.visible = false
    mesh.userData.partId = id
    mesh.userData.proxy = true
    pickables.push(mesh)
    parent.add(mesh)
    return mesh
  }

  // 背景（壁・床など、部品ではないもの）
  const env = (mesh: THREE.Mesh, parent: THREE.Object3D = root) => {
    mesh.receiveShadow = true
    mesh.userData.env = true
    parent.add(mesh)
    return mesh
  }

  // 「内部を見る」で切り取る部分（壁や床の一部）。切り口の枠線も作る
  const cut = (panel: THREE.Mesh, color = 0x9aa7a6) => {
    env(panel)
    cutPanels.push(panel)
    const frame = new THREE.LineSegments(new THREE.EdgesGeometry(panel.geometry), new THREE.LineBasicMaterial({ color }))
    frame.position.copy(panel.position)
    frame.quaternion.copy(panel.quaternion)
    frame.visible = false
    root.add(frame)
    cutFrames.push(frame)
  }

  return { partMeshes, pickables, shells, cutPanels, cutFrames, hitMat, reg, proxy, env, cut }
}

// 薄い板が並んだ面（熱交換器のフィンなど）の縞模様
export function stripes(lines: number, color = '#c7d0d6', line = '#9aa6ae', vertical = true) {
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

// 壁の切り口（断面）：斜線で「ここで切っている」ことを示す板。x = 一定の面に置く
export function sectionCap(x: number, y0: number, y1: number, z0: number, z1: number) {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  g.fillStyle = '#d6d1c7'
  g.fillRect(0, 0, 64, 64)
  g.strokeStyle = '#b9b2a5'
  g.lineWidth = 3
  for (let i = -64; i < 128; i += 16) {
    g.beginPath()
    g.moveTo(i, 64)
    g.lineTo(i + 64, 0)
    g.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(Math.max(1, (z1 - z0) / 1.5), Math.max(1, (y1 - y0) / 1.5))
  tex.colorSpace = THREE.SRGBColorSpace
  const cap = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0, y1 - y0), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }))
  cap.rotation.y = Math.PI / 2
  cap.position.set(x + 0.005, (y0 + y1) / 2, (z0 + z1) / 2)
  return cap
}
