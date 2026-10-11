import type * as THREE from 'three'

// ステージ（設備）ごとに差し替える中身の型。
// 3D表示・説明・検索・ゲームは、すべてこの形のデータを読んで動く。

export type PartId = string

export type Term = { word: string; meaning: string }
export type Link = { to: PartId; text: string }

export type Part = {
  id: PartId
  name: string // 正式名称（一般的な呼び方のうち代表的なもの）
  kana: string // 検索用のよみ
  aliases: string[] // よくある呼び方
  phrases: string[] // 検索用の言い換え（画面には出さない）
  group: string
  role: string // 一文で分かる役割
  links: Link[] // どこにつながっているか
  detail: string[] // 「詳しく」で読める補足
  terms?: Term[] // 専門用語のミニ解説
  level: 1 | 2 | 3 // 1=全体表示でも名前を出す / 2=少し近づくと / 3=かなり近づくと
  inside: boolean // 「内部を見る」のときだけ見える
}

export type FlowStep = { at: number; text: string; focus: PartId[] }
export type FlowStream = {
  key: string
  path: string
  start: number
  end: number
  speed: number
  spacing: number
  color: number
  shape?: 'arrow' | 'drop' // drop：水の粒（丸）
}

// 「内部を見る」で持ち上げて半透明にする部品（タンクのふた・前面パネルなど）
export type Lift = { id: PartId; group: THREE.Object3D; offset: THREE.Vector3; rotate?: THREE.Euler }

export type StageModel = {
  root: THREE.Group
  partMeshes: Map<PartId, THREE.Mesh[]>
  pickables: THREE.Mesh[]
  shells: THREE.Mesh[]
  cutPanels: THREE.Object3D[]
  cutFrames: THREE.Object3D[]
  anchors: Record<PartId, THREE.Vector3>
  views: Record<PartId, THREE.Vector3>
  paths: Record<string, THREE.Curve<THREE.Vector3>>
  lifts: Lift[]
  // t 秒時点の動き（運転していないときは rest）を模型に反映する
  applyFlow: (t: number, running: boolean) => void
  // 毎フレームの更新（鎖の形など）
  update?: (dt: number, running: boolean) => void
}

export type LostPart = { id: PartId; line: string; hints: [string, string] }
export type QuizQuestion = { target: PartId; prompt: string; hint: string }
export type Source = { title: string; url: string; note: string }

export type Stage = {
  key: string
  name: string // 「トイレ」
  brand: string // 画面左上の名前「トイレのしくみ」
  sub: string // ステージ一覧の説明
  ready: true
  parts: Part[]
  groups: string[] // 部品一覧（WebGLなし表示）での並び順
  build: () => StageModel
  camera: {
    home: { target: [number, number, number]; dir: [number, number, number]; halfH: number; halfW: number }
    flow: { target: [number, number, number]; dir: [number, number, number]; scale: number }
    zoom: { min: number; max: number } // 部品へズームするときの距離の範囲
    labelDist: [number, number] // これより近いと level3 / level2 のラベルを出す
    shadow: { left: number; right: number; top: number; bottom: number }
  }
  ghost: { ids: PartId[]; opacity: Record<PartId, number>; pickLast: PartId[]; hideLabelInside: PartId[] }
  glassIds: PartId[] // 動きを見せている間、半透明にする管など
  flow: {
    duration: number
    steps: FlowStep[]
    streams: FlowStream[]
    legend: { label: string; color: number; kind?: 'arrow' | 'drop' }[]
    action: string // 「水を流す」
    actionIcon: string
  }
  lost: LostPart[]
  quiz: QuizQuestion[]
  searchExample: string
  info: { scope: string[]; simplifications: string[]; sources: Source[] }
  plainFlow: string[] // WebGLなし表示での「動きの順番」
}

export type StageStub = { key: string; name: string; sub: string; ready: false }
