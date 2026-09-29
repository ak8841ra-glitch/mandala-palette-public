import { useEffect, useRef, useState } from 'react'
import type { Ref } from 'react'
import { FAMILIES } from './palette'
import { SavedResult, loadImage, saveCanvas, today } from './save'
import type { Saved } from './save'

// Parts come from the 楽描き曼荼羅 part artwork: single-color shapes on transparency, recolored on draw.
type PartKey = 'dot' | 'spiral' | 'spiral_tail' | 'petal' | 'lotus' | 'spark'
  | 'ring_center' | 'ring_petal' | 'ring_lotus' | 'ring_outer' | 'dot_ring' | 'ring_plain'
const PARTS: Record<PartKey, string> = {
  dot: '点', spiral: '渦巻き', spiral_tail: '渦巻き（尾つき）', petal: '花びら', lotus: '蓮', spark: 'きらめき',
  ring_center: '花のメダリオン', ring_petal: '花びらの輪', ring_lotus: '蓮の輪', ring_outer: '外側の輪', dot_ring: '点の輪', ring_plain: 'シンプルな輪',
}
const MOTIFS: PartKey[] = ['petal', 'lotus', 'dot', 'spiral', 'spiral_tail', 'spark']
const RINGS: PartKey[] = ['ring_plain', 'ring_petal', 'ring_lotus', 'ring_outer', 'ring_center', 'dot_ring']
const partUrl = (part: PartKey) => `${import.meta.env.BASE_URL}assets/parts/${part}.png`

type Zone = 'center' | 'inner' | 'outer' | 'fill'
const ZONES: Record<Zone, { label: string; count: [number, number, number]; scale: [number, number, number]; radius: [number, number, number]; base: number }> = {
  // [default, min, max]; radius and base size are % of the canvas
  center: { label: '中心', count: [1, 1, 1], scale: [1, .4, 2.2], radius: [0, 0, 0], base: 34 },
  inner: { label: '内側', count: [6, 2, 16], scale: [.8, .3, 1.5], radius: [22, 12, 32], base: 20 },
  outer: { label: '外側', count: [12, 3, 28], scale: [.5, .2, 1.2], radius: [42, 30, 48], base: 13 },
  fill: { label: '全体を囲む', count: [1, 1, 1], scale: [1, .1, 1.5], radius: [0, 0, 0], base: 94 },
}

export interface Layer { id: number; zone: Zone; part: PartKey; count: number; scale: number; radius: number; rotation: number; color: string }
export interface Maker { bg: string; layers: Layer[]; nextId: number }
export const emptyMaker = (): Maker => ({ bg: '#FFFDF8', layers: [], nextId: 1 })

// Every tone of every color, in color-wheel order.
const TONES = FAMILIES.flatMap(family => family.colors.flatMap(color => color.tiers.map(tier => tier.bg)))
const BACKGROUNDS = [
  { color: '#FFFDF8', name: 'アイボリー' }, { color: '#FFFFFF', name: '白' }, { color: '#3A3639', name: 'チャコール' },
  { color: '#14213D', name: '紺' }, { color: '#0A0A0A', name: '黒' },
  ...FAMILIES.slice(1).map(family => ({ color: family.colors[0]!.tiers[0]!.bg, name: `淡い${family.name}` })),
]

function newLayer(maker: Maker, zone: Zone, part: PartKey, color: string): Layer {
  const d = ZONES[zone]
  return { id: maker.nextId, zone, part, count: d.count[0], scale: d.scale[0], radius: d.radius[0], rotation: 0, color }
}

// Relative luminance, to keep near-white tones out of the starter on the ivory background.
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
  return .2126 * r! + .7152 * g! + .0722 * b!
}

// A small starter, so the first view already shows what the tool makes.
function starter(colors: string[]): Maker {
  const visible = colors.filter(color => luminance(color) < .8)
  const [a = '#3E6CA8', b = '#EC6E88', c = '#8C4FAE', d = '#F2941C'] = [...visible, ...['#3E6CA8', '#EC6E88', '#8C4FAE', '#F2941C'].filter(color => !visible.includes(color))]
  let maker = emptyMaker()
  const add = (zone: Zone, part: PartKey, color: string, patch: Partial<Layer> = {}) => {
    maker = { ...maker, layers: [...maker.layers, { ...newLayer(maker, zone, part, color), ...patch }], nextId: maker.nextId + 1 }
  }
  add('fill', 'ring_plain', a)
  add('inner', 'petal', b, { count: 8 })
  add('center', 'lotus', c)
  add('outer', 'dot', d, { count: 16, scale: .35 })
  return maker
}

type Tinted = Map<string, HTMLCanvasElement>
async function tint(cache: Tinted, part: PartKey, color: string) {
  const key = `${part}|${color}`
  if (cache.has(key)) return cache.get(key)!
  const image = await loadImage(partUrl(part))
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(image, 0, 0)
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = color; ctx.fillRect(0, 0, canvas.width, canvas.height)
  cache.set(key, canvas)
  return canvas
}

// isCurrent lets a newer draw win when part images finish loading out of order.
async function draw(canvas: HTMLCanvasElement, maker: Maker, cache: Tinted, isCurrent = () => true) {
  const images = await Promise.all(maker.layers.map(layer => tint(cache, layer.part, layer.color)))
  if (!isCurrent()) return
  const W = canvas.width
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, W, W)
  ctx.fillStyle = maker.bg; ctx.fillRect(0, 0, W, W)
  maker.layers.forEach((layer, index) => {
    const image = images[index]!
    const box = ZONES[layer.zone].base * layer.scale / 100 * W
    const fit = Math.min(box / image.width, box / image.height)
    const w = image.width * fit, h = image.height * fit
    for (let i = 0; i < layer.count; i++) {
      const angle = (layer.zone === 'inner' || layer.zone === 'outer' ? 360 / layer.count * i : 0) + layer.rotation
      const rad = angle * Math.PI / 180
      const r = layer.radius / 100 * W
      ctx.save()
      ctx.translate(W / 2 + r * Math.sin(rad), W / 2 - r * Math.cos(rad))
      ctx.rotate(rad)
      ctx.drawImage(image, -w / 2, -h / 2, w, h)
      ctx.restore()
    }
  })
}

function Swatches({ colors, value, onPick, label }: { colors: string[]; value: string; onPick: (color: string) => void; label: string }) {
  return <div className="swatches" role="group" aria-label={label}>
    {colors.map(color => <button key={color} type="button" className="swatch" style={{ background: color }}
      aria-label={color} aria-pressed={color.toLowerCase() === value.toLowerCase()} onClick={() => onPick(color)} />)}
  </div>
}

function Slider({ id, label, min, max, step, value, onChange }: {
  id: string; label: string; min: number; max: number; step: number; value: number; onChange: (value: number) => void
}) {
  return <div className="slider-row">
    <label htmlFor={id}>{label}</label>
    <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={event => onChange(Number(event.target.value))} />
  </div>
}

export default function MandalaMaker({ maker, onMaker, presetColors, heading, onHome }: {
  maker: Maker; onMaker: (maker: Maker) => void; presetColors: string[]
  heading: Ref<HTMLHeadingElement>; onHome: () => void
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const cache = useRef<Tinted>(new Map())
  const drawId = useRef(0)
  const [zone, setZone] = useState<Zone>('inner')
  const [selectedId, setSelectedId] = useState<number | null>(maker.layers.at(-1)?.id ?? null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [saved, setSaved] = useState<Saved | null>(null)
  const [error, setError] = useState('')
  const selected = maker.layers.find(layer => layer.id === selectedId)
  const lastColor = selected?.color ?? maker.layers.at(-1)?.color ?? presetColors[0] ?? '#3E6CA8'

  useEffect(() => {
    if (!canvas.current) return
    const id = ++drawId.current
    draw(canvas.current, maker, cache.current, () => id === drawId.current).catch(() => setError('パーツを表示できませんでした。再読み込みしてお試しください。'))
    setSaved(null)
  }, [maker])

  function update(patch: Partial<Layer>) {
    if (!selected) return
    onMaker({ ...maker, layers: maker.layers.map(layer => layer.id === selected.id ? { ...layer, ...patch } : layer) })
  }

  function add(part: PartKey) {
    const layer = newLayer(maker, zone, part, lastColor)
    onMaker({ ...maker, layers: [...maker.layers, layer], nextId: maker.nextId + 1 })
    setSelectedId(layer.id)
  }

  function shift(step: 1 | -1) {
    const index = maker.layers.findIndex(layer => layer.id === selectedId)
    const target = index + step
    if (index < 0 || target < 0 || target >= maker.layers.length) return
    const layers = [...maker.layers]
    ;[layers[index], layers[target]] = [layers[target]!, layers[index]!]
    onMaker({ ...maker, layers })
  }

  async function save() {
    setError('')
    try {
      const out = document.createElement('canvas')
      out.width = out.height = 1200
      await draw(out, maker, cache.current)
      setSaved(await saveCanvas(out, today('mandala-art').file))
    } catch { setError('画像を保存できませんでした。もう一度お試しください。') }
  }

  const index = maker.layers.findIndex(layer => layer.id === selectedId)
  const d = selected ? ZONES[selected.zone] : null

  return <section className="selection maker" aria-labelledby="maker-title">
    <nav className="selection-nav" aria-label="画面の移動">
      <button className="back-button" type="button" onClick={onHome}>← トップへ戻る</button>
      <span className="step-label">曼荼羅をつくる</span>
    </nav>
    <h1 ref={heading} tabIndex={-1} id="maker-title">パーツを選んで、<br />曼荼羅をつくる。</h1>
    <p className="lead">3つくらい置くだけで、形になります。</p>

    <div className="maker-stage">
      <canvas ref={canvas} width={900} height={900} className="maker-canvas" role="img"
        aria-label={maker.layers.length ? `パーツ${maker.layers.length}つの曼荼羅` : 'まだ何も置いていない曼荼羅'} />
      {maker.layers.length === 0 && <div className="maker-empty">
        <p>下からパーツを選ぶと、ここに置かれます。</p>
        <button type="button" className="button-quiet" onClick={() => {
          const next = starter(presetColors)
          onMaker(next); setSelectedId(next.layers.at(-1)!.id)
        }}>お手本から始める</button>
      </div>}
    </div>

    <div className="maker-panel">
      <h2>1. パーツを置く</h2>
      <div className="layout-switch zone-switch" role="group" aria-label="置く場所">
        {(Object.keys(ZONES) as Zone[]).map(item => <button key={item} type="button" aria-pressed={zone === item} onClick={() => setZone(item)}>
          {ZONES[item].label}
        </button>)}
      </div>
      <div className="part-grid" role="group" aria-label={`${ZONES[zone].label}に置くパーツ`}>
        {(zone === 'fill' ? RINGS : MOTIFS).map(part => <button key={part} type="button" className="part-button" onClick={() => add(part)}>
          <span className="part-icon" aria-hidden="true" style={{ maskImage: `url(${partUrl(part)})`, WebkitMaskImage: `url(${partUrl(part)})` }} />
          <span>{PARTS[part]}</span>
        </button>)}
      </div>
    </div>

    {maker.layers.length > 0 && <div className="maker-panel">
      <h2>2. 選んで、整える</h2>
      <div className="layer-chips" role="group" aria-label="置いたパーツ（右ほど手前）">
        {maker.layers.map(layer => <button key={layer.id} type="button" aria-pressed={layer.id === selectedId} onClick={() => setSelectedId(layer.id)}>
          <span className="layer-dot" style={{ background: layer.color }} aria-hidden="true" />{ZONES[layer.zone].label}・{PARTS[layer.part]}
        </button>)}
      </div>
      {selected && d && <div className="layer-editor">
        <p className="hint">色</p>
        {presetColors.length > 0 && <Swatches colors={presetColors} value={selected.color} onPick={color => update({ color })} label="今日の色" />}
        <Swatches colors={TONES} value={selected.color} onPick={color => update({ color })} label="パーツの色" />
        {d.count[2] > d.count[1] && <Slider id="layer-count" label="数" min={d.count[1]} max={d.count[2]} step={1} value={selected.count} onChange={count => update({ count })} />}
        {d.radius[2] > d.radius[1] && <Slider id="layer-radius" label="広がり" min={d.radius[1]} max={d.radius[2]} step={1} value={selected.radius} onChange={radius => update({ radius })} />}
        <Slider id="layer-scale" label="大きさ" min={d.scale[1]} max={d.scale[2]} step={.05} value={selected.scale} onChange={scale => update({ scale })} />
        <Slider id="layer-rotation" label="向き" min={0} max={360} step={1} value={selected.rotation} onChange={rotation => update({ rotation })} />
        <div className="control-row">
          <button type="button" disabled={index >= maker.layers.length - 1} onClick={() => shift(1)}>手前へ</button>
          <button type="button" disabled={index <= 0} onClick={() => shift(-1)}>奥へ</button>
          <button type="button" className="delete-card" onClick={() => {
            onMaker({ ...maker, layers: maker.layers.filter(layer => layer.id !== selected.id) })
            setSelectedId(maker.layers[index - 1]?.id ?? maker.layers[index + 1]?.id ?? null)
          }}>削除</button>
        </div>
      </div>}
    </div>}

    <div className="maker-panel">
      <h2>3. 背景の色</h2>
      <div className="swatches" role="group" aria-label="背景の色">
        {BACKGROUNDS.map(item => <button key={item.color} type="button" className="swatch" style={{ background: item.color }}
          aria-label={item.name} title={item.name} aria-pressed={maker.bg === item.color} onClick={() => onMaker({ ...maker, bg: item.color })} />)}
      </div>
    </div>

    <div className="maker-actions">
      <button type="button" className="button-primary" disabled={!maker.layers.length} onClick={save}>画像で保存</button>
      {saved && <SavedResult saved={saved} title="曼荼羅palette" />}
      {error && <p role="alert">{error}</p>}
      {confirmReset ? <div className="confirm-fresh" role="alertdialog" aria-labelledby="reset-text">
        <p id="reset-text" className="lead">今の作品を消して、はじめから？</p>
        <div className="home-actions">
          <button type="button" className="danger" onClick={() => { onMaker(emptyMaker()); setSelectedId(null); setConfirmReset(false) }}>消して、はじめから</button>
          <button type="button" className="button-quiet" onClick={() => setConfirmReset(false)}>やめる</button>
        </div>
      </div> : maker.layers.length > 0 && <button type="button" className="back-button" onClick={() => setConfirmReset(true)}>はじめから作り直す</button>}
      <p className="hint">作りかけの作品は、このブラウザの中に自動で残ります。</p>
    </div>
  </section>
}
