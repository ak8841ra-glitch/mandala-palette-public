import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { PART_MAP, PARTS, type PartId } from '../data/parts'
import { buildToilet, type ToiletModel } from './buildModel'
import { FLOW_DURATION, FLOW_STEPS, FLOW_STREAMS, flowState } from './flow'

export type LostEvent = { type: 'grab' } | { type: 'wrong'; near: PartId | null } | { type: 'returning' } | { type: 'placed' }

type Callbacks = {
  onSelect: (id: PartId | null) => void
  onFlushStep: (step: number | null) => void
  onFlushDone: () => void
  onModeChange: (inside: boolean) => void
  onInteract: () => void
  onLost: (e: LostEvent) => void
}

// 迷子パーツ：模型から外して運べるようにした部品
type Lost = {
  id: PartId
  carrier: THREE.Group
  items: { mesh: THREE.Mesh; parent: THREE.Object3D; pos: THREE.Vector3; quat: THREE.Quaternion; scale: THREE.Vector3 }[]
  home: THREE.Vector3 // 元の場所（運ぶ入れ物の中心）
  homePoints: THREE.Vector3[] // 当たり判定に使う、元の場所の代表点
  radius: number
  phase: 'leaving' | 'away' | 'drag' | 'returning'
  from: THREE.Vector3
  t: number
  dur: number
  tag: HTMLDivElement
}

type Tween = {
  fromPos: THREE.Vector3
  toPos: THREE.Vector3
  fromTarget: THREE.Vector3
  toTarget: THREE.Vector3
  t: number
  dur: number
}

type Label = {
  id: PartId
  el: HTMLDivElement
  text: HTMLSpanElement
  w: number
  h: number
  occluded: boolean
}

const ACCENT = new THREE.Color(0xf08a24)
const FOCUS = new THREE.Color(0x2bb3a3)
const GHOST_IDS = new Set<PartId>(['bowl', 'tank', 'lid', 'seat'])
const HOME_TARGET = new THREE.Vector3(-0.5, 3.7, 2.4)
const HOME_DIR = new THREE.Vector3(-0.62, 0.36, 1).normalize()
const FLOW_DIR = new THREE.Vector3(-0.85, 0.36, 0.9).normalize()

// 不透明⇔半透明を切り替えるときはシェーダーの作り直しが必要（OPAQUE の定義が変わるため）
function setTransparent(mat: THREE.Material, on: boolean) {
  if (mat.transparent === on) return
  mat.transparent = on
  mat.needsUpdate = true
}

// 水を流している間、中の矢印が見えるよう半透明にする配管
const GLASS_IDS: PartId[] = ['trap', 'drainPipe', 'floorFlange', 'supplyPipe', 'supplyHose', 'overflow', 'ballTap', 'tankGasket', 'stopValve']

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export class Viewer {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200)
  private controls: OrbitControls
  private model: ToiletModel
  private raycaster = new THREE.Raycaster()
  private timer = new THREE.Timer()
  private raf = 0
  private host: HTMLElement
  private labelLayer: HTMLElement
  private labels: Label[] = []
  private cb: Callbacks
  private width = 1
  private height = 1

  private selected: PartId | null = null
  private focusSet = new Set<PartId>()
  private inside = false
  private insideAmt = 0 // 0=外側, 1=内部（なめらかに切り替える）
  private tween: Tween | null = null
  private flushT: number | null = null
  private flushStep: number | null = null
  private labelsOn = true
  private insetTarget = { right: 0, bottom: 0, top: 0 }
  private inset = { right: 0, bottom: 0, top: 0 }
  private baseFov = 38
  private frame = 0
  private chainLength = 0
  private streams: { mesh: THREE.InstancedMesh; curve: THREE.Curve<THREE.Vector3>; len: number; key: string }[] = []
  private resizeObs: ResizeObserver
  private down: { x: number; y: number; t: number } | null = null
  private pulse = 0
  private glassAmt = 0
  private blockers: { x0: number; y0: number; x1: number; y1: number }[] = []
  private lost: Lost | null = null
  private grab: { x: number; y: number; moved: boolean; plane: THREE.Plane } | null = null
  private suppressTap = false
  private clockT = 0
  private homeOnInsets = false

  constructor(host: HTMLElement, labelLayer: HTMLElement, cb: Callbacks) {
    this.host = host
    this.labelLayer = labelLayer
    this.cb = cb
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.domElement.className = 'gl'
    host.appendChild(this.renderer.domElement)

    this.scene.background = new THREE.Color(0xf1f3f2)
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d4ca, 1.6))
    const sun = new THREE.DirectionalLight(0xffffff, 1.7)
    sun.position.set(6, 14, 10)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.left = -8
    sun.shadow.camera.right = 8
    sun.shadow.camera.top = 10
    sun.shadow.camera.bottom = -4
    sun.shadow.bias = -0.0008
    sun.shadow.normalBias = 0.02
    this.scene.add(sun)
    const fill = new THREE.DirectionalLight(0xdfeaf5, 0.6)
    fill.position.set(-8, 6, 6)
    this.scene.add(fill)

    this.model = buildToilet()
    this.scene.add(this.model.root)
    this.buildStreams()
    this.chainLength = this.chainEnds().a.distanceTo(this.chainEnds().b) + 0.35

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.09
    this.controls.minDistance = 2.2
    this.controls.maxDistance = 34
    this.controls.maxPolarAngle = Math.PI * 0.62
    this.controls.screenSpacePanning = true
    this.controls.addEventListener('start', () => {
      this.tween = null
      this.cb.onInteract()
    })

    this.buildLabels()

    const el = this.renderer.domElement
    el.addEventListener('pointerdown', this.onLostDown, { capture: true })
    el.addEventListener('pointermove', this.onLostMove)
    el.addEventListener('pointerup', this.onLostUp, { capture: true })
    el.addEventListener('pointerdown', this.onDown)
    el.addEventListener('pointerup', this.onUp)

    this.resizeObs = new ResizeObserver(() => this.resize())
    this.resizeObs.observe(host)
    this.resize()
    this.camera.position.copy(this.homePosition(HOME_TARGET, HOME_DIR))
    this.controls.target.copy(HOME_TARGET)
    this.controls.update()
    this.applySelection()
    this.loop()
    if (import.meta.env.DEV) (window as unknown as { __viewer: Viewer }).__viewer = this
  }

  // 開発時の確認用（ソフトウェア描画で遅い環境でもアニメーションの途中を確認できるように）
  debugFinishTween() {
    if (this.tween) this.tween.t = this.tween.dur - 0.001
    this.insideAmt = this.inside ? 0.999 : 0.001
  }

  debugFlushAt(t: number) {
    this.flushT = t
  }

  debugState() {
    return { cam: this.camera.position.toArray(), target: this.controls.target.toArray(), fov: this.camera.fov }
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    this.resizeObs.disconnect()
    this.controls.dispose()
    const el = this.renderer.domElement
    el.removeEventListener('pointerdown', this.onLostDown, { capture: true })
    el.removeEventListener('pointermove', this.onLostMove)
    el.removeEventListener('pointerup', this.onLostUp, { capture: true })
    el.removeEventListener('pointerdown', this.onDown)
    el.removeEventListener('pointerup', this.onUp)
    this.renderer.dispose()
    this.renderer.domElement.remove()
    this.labelLayer.innerHTML = ''
  }

  // ---------- 公開操作 ----------

  select(id: PartId | null, opts: { fly?: boolean } = {}) {
    this.selected = id
    this.applySelection()
    if (id && PART_MAP[id].inside && !this.inside) this.setInside(true)
    if (id && opts.fly) this.flyTo(id)
  }

  setInside(inside: boolean) {
    if (this.inside === inside) return
    this.inside = inside
    this.cb.onModeChange(inside)
  }

  resetView() {
    this.flyToPose(HOME_TARGET, this.homePosition(HOME_TARGET, HOME_DIR), 1.0)
  }

  setLabelsVisible(on: boolean) {
    this.labelsOn = on
  }

  setInsets(right: number, bottom: number, top = 0) {
    this.insetTarget = { right, bottom, top }
    // 上のカードが出たあとで、模型全体が残りの場所に収まるよう引き直す
    if (this.homeOnInsets) {
      this.homeOnInsets = false
      this.resetView()
    }
  }

  startFlush() {
    this.flushT = 0
    this.setInside(true)
    const target = new THREE.Vector3(-0.4, 3.2, 2.0)
    this.flyToPose(target, this.homePosition(target, FLOW_DIR, 1.18), 1.1)
  }

  stopFlush() {
    if (this.flushT === null) return
    this.flushT = null
    this.applyFlow(FLOW_DURATION)
    this.setFlushStep(null)
    this.cb.onFlushDone()
  }

  // ---------- 迷子パーツ ----------

  startLost(id: PartId) {
    this.endLost()
    this.stopFlush()
    this.select(null)
    this.setInside(true)
    this.resetView()
    this.homeOnInsets = true
    const meshes = this.model.partMeshes.get(id) ?? []
    this.model.root.updateMatrixWorld(true)
    const box = new THREE.Box3()
    for (const m of meshes) box.expandByObject(m)
    const home = box.getCenter(new THREE.Vector3())
    const homePoints = [home.clone()]
    for (const m of meshes) {
      const g = m.geometry as THREE.BufferGeometry & { parameters?: { path?: THREE.Curve<THREE.Vector3> } }
      if (g.parameters?.path) homePoints.push(...g.parameters.path.getPoints(10).map((p) => p.applyMatrix4(m.matrixWorld)))
      else homePoints.push(new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3()))
    }
    const carrier = new THREE.Group()
    carrier.position.copy(home)
    this.model.root.add(carrier)
    carrier.updateMatrixWorld(true)
    const items = meshes.map((mesh) => {
      const item = {
        mesh,
        parent: mesh.parent!,
        pos: mesh.position.clone(),
        quat: mesh.quaternion.clone(),
        scale: mesh.scale.clone(),
      }
      carrier.attach(mesh)
      return item
    })
    const tag = document.createElement('div')
    tag.className = 'lost-tag'
    tag.textContent = `${PART_MAP[id].name}（迷子）`
    this.labelLayer.appendChild(tag)
    this.lost = {
      id,
      carrier,
      items,
      home,
      homePoints,
      radius: box.getSize(new THREE.Vector3()).length() / 2,
      phase: 'leaving',
      from: home.clone(),
      t: 0,
      dur: 1.3,
      tag,
    }
    this.selected = id
    this.applySelection()
  }

  endLost() {
    const l = this.lost
    if (!l) return
    for (const it of l.items) {
      it.parent.add(it.mesh)
      it.mesh.position.copy(it.pos)
      it.mesh.quaternion.copy(it.quat)
      it.mesh.scale.copy(it.scale)
    }
    l.carrier.removeFromParent()
    l.tag.remove()
    this.lost = null
    this.grab = null
    this.controls.enabled = true
  }

  private rayAt(cx: number, cy: number) {
    const r = this.renderer.domElement.getBoundingClientRect()
    const ndc = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1)
    this.raycaster.setFromCamera(ndc, this.camera)
    return this.raycaster.ray
  }

  private hitsLost(cx: number, cy: number) {
    const l = this.lost
    if (!l) return false
    const ray = this.rayAt(cx, cy)
    if (this.raycaster.intersectObject(l.carrier, true).length) return true
    const c = l.carrier.getWorldPosition(new THREE.Vector3())
    return ray.distanceToPoint(c) < Math.max(0.6, l.radius * 0.7)
  }

  private onLostDown = (e: PointerEvent) => {
    const l = this.lost
    if (!l || l.phase !== 'away' || !this.hitsLost(e.clientX, e.clientY)) return
    // 迷子の子をつかんだら、模型は回さない
    this.controls.enabled = false
    this.renderer.domElement.setPointerCapture(e.pointerId)
    const camDir = this.camera.getWorldDirection(new THREE.Vector3())
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(camDir, this.controls.target)
    this.grab = { x: e.clientX, y: e.clientY, moved: false, plane }
  }

  private onLostMove = (e: PointerEvent) => {
    const g = this.grab
    const l = this.lost
    if (!g || !l) return
    if (!g.moved && Math.hypot(e.clientX - g.x, e.clientY - g.y) < 7) return
    g.moved = true
    l.phase = 'drag'
    const p = this.rayAt(e.clientX, e.clientY).intersectPlane(g.plane, new THREE.Vector3())
    if (p) l.carrier.position.copy(p)
  }

  private onLostUp = (e: PointerEvent) => {
    const g = this.grab
    if (!g) return
    this.grab = null
    this.controls.enabled = true
    this.suppressTap = true
    if (g.moved) this.tryPlace(e.clientX, e.clientY)
    else this.cb.onLost({ type: 'grab' })
  }

  private tryPlace(cx: number, cy: number) {
    const l = this.lost
    if (!l) return
    const ray = this.rayAt(cx, cy)
    const near = Math.min(...l.homePoints.map((p) => ray.distanceToPoint(p)))
    const picked = this.pick(cx, cy, l.id)
    // 元の場所の近く、または元の場所に残した当たり判定（見えない）を押したら正解
    const ok = near < 0.6 || picked === l.id
    if (ok) {
      l.phase = 'returning'
      l.from = l.carrier.position.clone()
      l.t = 0
      l.dur = 0.9
      this.cb.onLost({ type: 'returning' })
    } else {
      if (l.phase === 'drag') {
        l.phase = 'leaving'
        l.from = l.carrier.position.clone()
        l.t = 0
        l.dur = 0.6
      }
      this.cb.onLost({ type: 'wrong', near: picked })
    }
  }

  // 迷子の子が待つ場所：模型を回しても画面の右下あたりに見えるよう、カメラから決める
  private lostSpot() {
    const narrow = this.width / this.height < 0.8
    const ndc = new THREE.Vector3(narrow ? 0.5 : 0.6, narrow ? -0.58 : -0.2, 0.5)
    const dir = ndc.unproject(this.camera).sub(this.camera.position).normalize()
    const d = this.camera.position.distanceTo(this.controls.target) * 0.7
    return this.camera.position.clone().add(dir.multiplyScalar(d))
  }

  private updateLost(dt: number) {
    const l = this.lost
    if (!l) return
    const c = l.carrier
    if (l.phase === 'leaving' || l.phase === 'returning') {
      l.t += dt
      const k = easeInOut(Math.min(1, l.t / l.dur))
      const to = l.phase === 'leaving' ? this.lostSpot() : l.home
      c.position.lerpVectors(l.from, to, k)
      c.position.y += Math.sin(k * Math.PI) * 1.2
      c.rotation.z *= 1 - k
      if (l.t >= l.dur) {
        if (l.phase === 'leaving') l.phase = 'away'
        else {
          c.position.copy(l.home)
          c.rotation.set(0, 0, 0)
          const id = l.id
          this.endLost()
          this.selected = id
          this.applySelection()
          this.cb.onLost({ type: 'placed' })
          return
        }
      }
    } else if (l.phase === 'away') {
      // ふわふわ待っている
      c.position.copy(this.lostSpot())
      c.position.y += Math.sin(this.clockT * 2.2) * 0.12
      c.rotation.z = Math.sin(this.clockT * 1.6) * 0.12
    }
    // 名札
    const v = c.getWorldPosition(new THREE.Vector3())
    v.y += Math.max(0.6, l.radius * 0.6)
    v.project(this.camera)
    const x = (v.x * 0.5 + 0.5) * this.width
    const y = (-v.y * 0.5 + 0.5) * this.height
    l.tag.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`
    l.tag.classList.toggle('on', l.phase !== 'returning' && v.z < 1)
  }

  get isFlushing() {
    return this.flushT !== null
  }

  // ---------- カメラ ----------

  private homePosition(target: THREE.Vector3, dir: THREE.Vector3, scale = 1) {
    // 模型全体（高さ約9、幅約5）が画面に収まる距離を求める
    // 上下のカードやパネルで隠れる分を除いた高さで考える
    const visibleH = Math.max(200, this.height - this.insetTarget.top - this.insetTarget.bottom)
    const vfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(this.baseFov) / 2) * (visibleH / this.height))
    const aspect = this.width / visibleH
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect)
    const halfH = 5.4
    const halfW = 3.9
    const d = Math.max(halfH / Math.tan(vfov / 2), halfW / Math.tan(hfov / 2)) * scale + 1.5
    return target.clone().add(dir.clone().multiplyScalar(d))
  }

  private flyTo(id: PartId) {
    const meshes = this.model.partMeshes.get(id) ?? []
    const box = new THREE.Box3()
    for (const m of meshes) box.expandByObject(m)
    const center = box.getCenter(new THREE.Vector3())
    const radius = box.getSize(new THREE.Vector3()).length() / 2
    const aspect = this.width / Math.max(1, this.height)
    const dist = THREE.MathUtils.clamp(radius * 2.6 + 3.2, 4.4, 14) * (aspect < 0.8 ? 1.6 : 1)
    const dir = (this.model.views[id]?.clone() ?? this.camera.position.clone().sub(this.controls.target)).normalize()
    this.flyToPose(center, center.clone().add(dir.multiplyScalar(dist)), 1.0)
  }

  private flyToPose(target: THREE.Vector3, pos: THREE.Vector3, dur: number) {
    this.tween = {
      fromPos: this.camera.position.clone(),
      toPos: pos,
      fromTarget: this.controls.target.clone(),
      toTarget: target.clone(),
      t: 0,
      dur,
    }
  }

  private resize() {
    const r = this.host.getBoundingClientRect()
    this.width = Math.max(1, r.width)
    this.height = Math.max(1, r.height)
    this.renderer.setSize(this.width, this.height, false)
    this.applyViewOffset()
    this.measureLabels()
  }

  private applyViewOffset() {
    // 説明パネルなどに隠れない部分の中央に注目点が来るよう、投影の中心をずらす。
    // 仮想の大きな画面の一部を表示する形にし、見える範囲の画角は変えない。
    const { right, bottom, top } = this.inset
    const w = this.width
    const h = this.height
    if (right < 1 && bottom < 1 && top < 1) {
      this.camera.clearViewOffset()
      this.camera.aspect = w / h
      this.camera.fov = this.baseFov
    } else {
      const fw = w + right
      const fh = h + bottom + top
      this.camera.aspect = fw / fh
      const t = Math.tan(THREE.MathUtils.degToRad(this.baseFov) / 2) * (fh / h)
      this.camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(t))
      this.camera.setViewOffset(fw, fh, right, bottom, w, h)
    }
    this.camera.updateProjectionMatrix()
  }

  // ---------- 選択と見た目 ----------

  private applySelection() {
    for (const [id, meshes] of this.model.partMeshes) {
      const sel = id === this.selected
      const foc = this.focusSet.has(id)
      for (const m of meshes) {
        const mat = m.material as THREE.MeshStandardMaterial
        if (!mat.emissive) continue
        if (sel) mat.emissive.copy(ACCENT)
        else if (foc) mat.emissive.copy(FOCUS)
        else mat.emissive.setRGB(0, 0, 0)
        mat.emissiveIntensity = sel ? 0.55 : foc ? 0.45 : 0
      }
    }
    for (const l of this.labels) {
      l.el.classList.toggle('selected', l.id === this.selected)
      l.el.classList.toggle('focus', this.focusSet.has(l.id))
    }
  }

  private applyGlass() {
    const k = this.glassAmt
    for (const id of GLASS_IDS) {
      for (const m of this.model.partMeshes.get(id) ?? []) {
        const mat = m.material as THREE.MeshStandardMaterial
        const op = 1 - 0.62 * k
        setTransparent(mat, op < 0.999)
        mat.opacity = op
        mat.depthWrite = op > 0.9
      }
    }
  }

  private applyMode() {
    const k = this.insideAmt
    const { shells, cutPanels, cutFrames, anim } = this.model
    for (const m of shells) {
      const mat = m.material as THREE.MeshStandardMaterial
      const id = m.userData.partId as PartId
      const sel = id === this.selected || this.focusSet.has(id)
      // ふたは模型の手前に立っているので、内部表示ではほぼ消す
      const target = sel ? 0.42 : id === 'lid' ? 0.06 : id === 'seat' ? 0.22 : 0.12
      const op = 1 - (1 - target) * k
      setTransparent(mat, op < 0.999)
      mat.opacity = op
      mat.depthWrite = op > 0.6
      m.castShadow = op > 0.6
    }
    anim.tankLid.position.y = 1.3 * easeInOut(k)
    anim.tankLid.position.z = -0.0
    for (const m of this.model.partMeshes.get('tankLid') ?? []) {
      const mat = m.material as THREE.MeshStandardMaterial
      const op = 1 - 0.78 * k
      setTransparent(mat, op < 0.999)
      mat.opacity = op
      mat.depthWrite = op > 0.6
      m.castShadow = op > 0.6
    }
    for (const p of cutPanels) p.visible = k < 0.5
    for (const f of cutFrames) f.visible = k >= 0.5
  }

  // ---------- 入力 ----------

  private onDown = (e: PointerEvent) => {
    this.down = { x: e.clientX, y: e.clientY, t: performance.now() }
  }

  private onUp = (e: PointerEvent) => {
    const d = this.down
    this.down = null
    if (this.suppressTap) {
      this.suppressTap = false
      return
    }
    if (!d) return
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8 || performance.now() - d.t > 600) return
    if (this.lost) {
      // 迷子パーツ中は、タップした場所に連れていく
      if (this.lost.phase === 'away') this.tryPlace(e.clientX, e.clientY)
      return
    }
    const id = this.pick(e.clientX, e.clientY)
    this.cb.onSelect(id)
  }

  // ignoreMoved: 迷子として外に出ている部品のメッシュは無視する（元の場所の当たり判定は残す）
  private pick(cx: number, cy: number, ignoreMoved?: PartId): PartId | null {
    this.rayAt(cx, cy)
    const hits = this.raycaster.intersectObjects(this.model.pickables, false)
    const usable = hits.filter((h) => {
      const id = h.object.userData.partId as PartId
      if (ignoreMoved && id === ignoreMoved && !h.object.userData.proxy) return false
      return this.inside || !PART_MAP[id].inside
    })
    if (!usable.length) return null
    if (this.inside) {
      // 内部表示では半透明の外側（便器・タンク・ふた）より中の部品を優先する
      const inner = usable.find((h) => {
        const id = h.object.userData.partId as PartId
        return !GHOST_IDS.has(id) && id !== 'tankLid'
      })
      if (inner) return inner.object.userData.partId
      // ほぼ見えない便ふたは最後に回す
      const shell = usable.find((h) => h.object.userData.partId !== 'lid')
      if (shell) return shell.object.userData.partId
    }
    return usable[0].object.userData.partId
  }

  // ---------- ラベル ----------

  private buildLabels() {
    this.labelLayer.innerHTML = ''
    for (const p of PARTS) {
      const el = document.createElement('div')
      el.className = 'label'
      el.dataset.level = String(p.level)
      const dot = document.createElement('i')
      const text = document.createElement('span')
      text.textContent = p.name
      el.append(dot, text)
      el.addEventListener('click', (ev) => {
        ev.stopPropagation()
        this.cb.onSelect(p.id)
      })
      this.labelLayer.appendChild(el)
      this.labels.push({ id: p.id, el, text, w: 60, h: 22, occluded: false })
    }
    this.measureLabels()
  }

  private measureLabels() {
    for (const l of this.labels) {
      const w = l.text.offsetWidth
      const h = l.text.offsetHeight
      if (w > 0) {
        l.w = w
        l.h = h
      }
    }
  }

  private anchorOf(id: PartId, out: THREE.Vector3) {
    out.copy(this.model.anchors[id])
    if (id === 'tankLid') out.y += this.model.anim.tankLid.position.y
    return out
  }

  private updateOcclusion() {
    // 外側表示のとき、壁や便器の向こうにある部品のラベルを隠す
    const occluders: THREE.Object3D[] = []
    this.model.root.traverse((o) => {
      if (!(o instanceof THREE.Mesh) || !o.visible) return
      const mat = o.material as THREE.Material
      if (mat.transparent && mat.opacity < 0.6) return
      if (o.userData.env || o.userData.shell) occluders.push(o)
    })
    const camPos = this.camera.position
    for (const l of this.labels) {
      const a = this.anchorOf(l.id, new THREE.Vector3())
      const dir = a.clone().sub(camPos)
      const dist = dir.length()
      this.raycaster.set(camPos, dir.normalize())
      this.raycaster.far = dist - 0.35
      const own = l.id
      const hit = this.raycaster.intersectObjects(occluders, false).find((h) => h.object.userData.partId !== own)
      l.occluded = !!hit
    }
    this.raycaster.far = Infinity
  }

  private updateBlockers() {
    const host = this.host.getBoundingClientRect()
    this.blockers = []
    document.querySelectorAll('[data-label-block]').forEach((el) => {
      const r = el.getBoundingClientRect()
      if (r.width && r.height)
        this.blockers.push({ x0: r.left - host.left, y0: r.top - host.top, x1: r.right - host.left, y1: r.bottom - host.top })
    })
  }

  private updateLabels() {
    const camDist = this.camera.position.distanceTo(this.controls.target)
    const maxLevel = camDist < 7.5 ? 3 : camDist < 13 ? 2 : 1
    const v = new THREE.Vector3()
    type Cand = { l: Label; x: number; y: number; pri: number }
    const cands: Cand[] = []
    for (const l of this.labels) {
      const p = PART_MAP[l.id]
      const isSel = l.id === this.selected
      const isFocus = this.focusSet.has(l.id)
      let show = this.labelsOn
      if (show && !isSel && !isFocus && p.level > maxLevel) show = false
      if (show && p.inside && this.insideAmt < 0.5) show = false
      if (show && (l.id === 'tankLid' || l.id === 'lid') && this.insideAmt > 0.5 && !isSel) show = false
      if (show && l.occluded && !isSel && !isFocus) show = false
      if (show) {
        this.anchorOf(l.id, v).project(this.camera)
        if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) show = false
        else {
          const x = (v.x * 0.5 + 0.5) * this.width
          const y = (-v.y * 0.5 + 0.5) * this.height
          const centerD = Math.hypot(x - this.width / 2, y - this.height / 2) / this.width
          const pri = (isSel ? -100 : 0) + (isFocus ? -50 : 0) + p.level * 2 + centerD
          cands.push({ l, x, y, pri })
        }
      }
      if (!show) l.el.classList.remove('on')
    }
    cands.sort((a, b) => a.pri - b.pri)
    // 画面上のボタンやパネルの下にはラベルを置かない
    const placed: { x0: number; y0: number; x1: number; y1: number }[] = [...this.blockers]
    const pad = 3
    const hitAny = (r: { x0: number; y0: number; x1: number; y1: number }) =>
      r.x0 < 4 ||
      r.x1 > this.width - 4 ||
      r.y0 < 4 ||
      r.y1 > this.height - 4 ||
      placed.some((q) => r.x0 < q.x1 + pad && r.x1 + pad > q.x0 && r.y0 < q.y1 + pad && r.y1 + pad > q.y0)
    for (const c of cands) {
      const { w, h } = c.l
      const opts = [
        [10, -h - 6],
        [-w - 10, -h - 6],
        [10, 6],
        [-w - 10, 6],
        [-w / 2, -h - 14],
        [-w / 2, 12],
      ]
      let ok = false
      for (const [dx, dy] of opts) {
        const r = { x0: c.x + dx, y0: c.y + dy, x1: c.x + dx + w, y1: c.y + dy + h }
        if (!hitAny(r)) {
          placed.push(r, { x0: c.x - 5, y0: c.y - 5, x1: c.x + 5, y1: c.y + 5 })
          c.l.el.style.transform = `translate(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px)`
          c.l.text.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`
          ok = true
          break
        }
      }
      c.l.el.classList.toggle('on', ok)
    }
  }

  // ---------- 水の流れ ----------

  private buildStreams() {
    const cone = new THREE.ConeGeometry(0.1, 0.3, 10)
    for (const s of FLOW_STREAMS) {
      const curve = this.model.paths[s.path]
      const len = curve.getLength()
      const count = Math.max(4, Math.ceil(len / s.spacing))
      const mesh = new THREE.InstancedMesh(
        cone,
        new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.95, depthWrite: false }),
        count,
      )
      mesh.renderOrder = 10
      mesh.frustumCulled = false
      mesh.count = 0
      this.scene.add(mesh)
      this.streams.push({ mesh, curve, len, key: s.key })
    }
  }

  private setFlushStep(step: number | null) {
    if (step === this.flushStep) return
    this.flushStep = step
    this.focusSet = new Set(step === null ? [] : FLOW_STEPS[step].focus)
    this.applySelection()
    this.cb.onFlushStep(step)
  }

  private applyFlow(t: number) {
    const st = flowState(t, this.model.constants)
    const { anim, constants } = this.model
    anim.lever.rotation.z = st.lever
    anim.flapper.rotation.x = -st.flapper
    anim.tankWater.scale.y = Math.max(0.02, st.tankLevel - constants.tankBottom)
    anim.sealDisc.position.y = st.seal
    // 浮き球は水面に浮かぶ（アームの可動範囲内で）
    const rel = THREE.MathUtils.clamp((st.tankLevel - constants.floatPivotY) / constants.floatReach, -0.8, 0.2)
    const ang = Math.max(Math.asin(rel), -0.85)
    anim.float.quaternion.setFromAxisAngle(anim.floatAxis, ang)

    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const up = new THREE.Vector3(0, 1, 0)
    const sc = new THREE.Vector3()
    for (let i = 0; i < this.streams.length; i++) {
      const s = this.streams[i]
      const def = FLOW_STREAMS[i]
      const active = this.flushT !== null && t >= def.start && t <= def.end + s.len / def.speed
      if (!active) {
        s.mesh.count = 0
        continue
      }
      const head = ((t - def.start) * def.speed) / s.len // 流れの先頭（0〜）
      const tail = t > def.end ? ((t - def.end) * def.speed) / s.len : 0
      const n = s.mesh.instanceMatrix.count
      const phase = ((t * def.speed) / def.spacing) % 1
      let k = 0
      for (let j = 0; j < n; j++) {
        const u = (j + phase) / n
        if (u > head || u < tail || u > 1) continue
        const pos = s.curve.getPointAt(Math.min(u, 1))
        const tan = s.curve.getTangentAt(Math.min(u, 1))
        q.setFromUnitVectors(up, tan)
        const edge = Math.min(1, (head - u) * 8, (u - tail) * 8 + (tail === 0 ? 1 : 0))
        sc.setScalar(Math.max(0.2, edge))
        m.compose(pos, q, sc)
        s.mesh.setMatrixAt(k++, m)
      }
      s.mesh.count = k
      s.mesh.instanceMatrix.needsUpdate = true
    }
  }

  private chainEnds() {
    return {
      a: this.model.anim.chainTop.getWorldPosition(new THREE.Vector3()),
      b: this.model.anim.chainBottom.getWorldPosition(new THREE.Vector3()),
    }
  }

  private updateChain() {
    this.model.root.updateMatrixWorld(true)
    const { a, b } = this.chainEnds()
    const links = this.model.anim.chainLinks
    const d = a.distanceTo(b)
    const sag = Math.sqrt(Math.max(0, this.chainLength * this.chainLength - d * d)) * 0.5
    const mid = a.clone().add(b).multiplyScalar(0.5).add(new THREE.Vector3(0, 0, sag))
    const bez = new THREE.QuadraticBezierCurve3(a, mid, b)
    const up = new THREE.Vector3(0, 1, 0)
    const twist = new THREE.Quaternion().setFromAxisAngle(up, Math.PI / 2)
    links.forEach((l, i) => {
      const u = (i + 0.5) / links.length
      l.position.copy(bez.getPoint(u))
      l.quaternion.setFromUnitVectors(up, bez.getTangent(u).normalize())
      if (i % 2) l.quaternion.multiply(twist)
    })
  }

  // ---------- 毎フレーム ----------

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop)
    this.timer.update()
    const dt = Math.min(this.timer.getDelta(), 0.05)
    this.frame++

    // 外側／内部の切り替えをなめらかに
    const goal = this.inside ? 1 : 0
    if (Math.abs(this.insideAmt - goal) > 0.001) {
      this.insideAmt += Math.sign(goal - this.insideAmt) * Math.min(Math.abs(goal - this.insideAmt), dt * 2.6)
      this.applyMode()
    } else if (this.frame % 20 === 0) this.applyMode()

    const glassGoal = this.flushT !== null ? 1 : 0
    if (Math.abs(this.glassAmt - glassGoal) > 0.001) {
      this.glassAmt += Math.sign(glassGoal - this.glassAmt) * Math.min(Math.abs(glassGoal - this.glassAmt), dt * 2)
      this.applyGlass()
    }

    // 説明パネルぶんの余白
    const ir = this.insetTarget.right - this.inset.right
    const ib = this.insetTarget.bottom - this.inset.bottom
    const it = this.insetTarget.top - this.inset.top
    if (Math.abs(ir) > 0.5 || Math.abs(ib) > 0.5 || Math.abs(it) > 0.5) {
      const k = Math.min(1, dt * 7)
      this.inset.right += ir * k
      this.inset.bottom += ib * k
      this.inset.top += it * k
      this.applyViewOffset()
    }

    // カメラ移動
    if (this.tween) {
      // 注目点のまわりを回り込むように移動する（模型を突き抜けないように）
      const tw = this.tween
      tw.t += dt
      const k = easeInOut(Math.min(1, tw.t / tw.dur))
      const fromOff = tw.fromPos.clone().sub(tw.fromTarget)
      const toOff = tw.toPos.clone().sub(tw.toTarget)
      const dist = THREE.MathUtils.lerp(fromOff.length(), toOff.length(), k)
      const q = new THREE.Quaternion().setFromUnitVectors(fromOff.clone().normalize(), toOff.clone().normalize())
      const dir = fromOff.normalize().applyQuaternion(new THREE.Quaternion().slerp(q, k))
      this.controls.target.lerpVectors(tw.fromTarget, tw.toTarget, k)
      this.camera.position.copy(this.controls.target).add(dir.multiplyScalar(dist))
      if (tw.t >= tw.dur) this.tween = null
    }
    this.controls.update()

    // 水を流すアニメーション
    if (this.flushT !== null) {
      this.flushT += dt
      const t = this.flushT
      let step: number | null = null
      FLOW_STEPS.forEach((s, i) => {
        if (t >= s.at) step = i
      })
      if (t >= FLOW_DURATION) {
        this.flushT = null
        step = null
      }
      this.setFlushStep(step)
      this.applyFlow(Math.min(t, FLOW_DURATION))
      if (this.flushT === null) this.cb.onFlushDone()
    }
    this.updateChain()
    this.clockT += dt
    this.updateLost(dt)

    // 選択中の部品をゆっくり明滅
    if (this.selected) {
      this.pulse += dt
      const k = 0.42 + 0.18 * Math.sin(this.pulse * 4)
      for (const m of this.model.partMeshes.get(this.selected) ?? []) {
        const mat = m.material as THREE.MeshStandardMaterial
        if (mat.emissive) mat.emissiveIntensity = k
      }
    }

    if (this.frame % 6 === 0) this.updateOcclusion()
    if (this.frame % 30 === 1) this.measureLabels()
    if (this.frame % 8 === 0) this.updateBlockers()
    this.updateLabels()
    this.renderer.render(this.scene, this.camera)
  }
}
