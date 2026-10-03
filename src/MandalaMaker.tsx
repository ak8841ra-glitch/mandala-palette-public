import { useEffect, useRef, useState } from 'react'
import type { Ref } from 'react'
import { FAMILIES } from './palette'
import { SavedResult, loadImage, saveCanvas, today } from './save'
import type { Saved } from './save'
import { CHARCOAL, IVORY, omakase } from './omakase'
import type { Layer, Maker, PartKey, Preset, Zone } from './omakase'

// Parts come from the 楽描き曼荼羅 part artwork: single-color shapes on transparency, recolored on draw.
const PARTS: Record<PartKey, string> = {
  dot: '点', spiral: '渦巻き', spiral_tail: '渦巻き（尾つき）', petal: '花びら', lotus: '蓮', spark: 'きらめき',
  ring_center: '花のメダリオン', ring_petal: '花びらの輪', ring_lotus: '蓮の輪', ring_outer: '外側の輪', dot_ring: '点の輪', ring_plain: 'シンプルな輪',
}
const MOTIFS: PartKey[] = ['petal', 'lotus', 'dot', 'spiral', 'spiral_tail', 'spark']
const RINGS: PartKey[] = ['ring_plain', 'ring_petal', 'ring_lotus', 'ring_outer', 'ring_center', 'dot_ring']
const partUrl = (part: PartKey) => `${import.meta.env.BASE_URL}assets/parts/${part}.png`

const ZONES: Record<Zone, { label: string; count: [number, number, number]; scale: [number, number, number]; radius: [number, number, number]; base: number }> = {
  // [default, min, max]; radius and base size are % of the canvas
  center: { label: '中心', count: [1, 1, 1], scale: [1, .2, 2.2], radius: [0, 0, 0], base: 34 },
  inner: { label: '内側', count: [6, 2, 16], scale: [.8, .3, 1.5], radius: [22, 8, 32], base: 20 },
  outer: { label: '外側', count: [12, 3, 32], scale: [.5, .2, 1.2], radius: [42, 30, 48], base: 13 },
  fill: { label: '全体を囲む', count: [1, 1, 1], scale: [1, .1, 1.5], radius: [0, 0, 0], base: 94 },
}

export type { Maker }
export const emptyMaker = (): Maker => ({ bg: IVORY, layers: [], nextId: 1 })

// Every tone of every color, in color-wheel order.
const TONES = FAMILIES.flatMap(family => family.colors.flatMap(color => color.tiers.map(tier => tier.bg)))
const BACKGROUNDS = [
  { color: IVORY, name: 'アイボリー' }, { color: '#FFFFFF', name: '白' }, { color: CHARCOAL, name: 'チャコール' },
  { color: '#14213D', name: '紺' }, { color: '#0A0A0A', name: '黒' },
  ...FAMILIES.slice(1).map(family => ({ color: family.colors[0]!.tiers[0]!.bg, name: `淡い${family.name}` })),
]

function newLayer(maker: Maker, zone: Zone, part: PartKey, color: string): Layer {
  const d = ZONES[zone]
  return { id: maker.nextId, zone, part, count: d.count[0], scale: d.scale[0], radius: d.radius[0], rotation: 0, color }
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
// highlightId fades the other layers, so a chip tap shows which part it means.
async function draw(canvas: HTMLCanvasElement, maker: Maker, cache: Tinted, isCurrent = () => true, highlightId: number | null = null) {
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
    ctx.globalAlpha = highlightId === null || highlightId === layer.id ? 1 : .15
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
  ctx.globalAlpha = 1
}

function Swatches({ colors, value, onPick, label, custom }: { colors: string[]; value: string; onPick: (color: string) => void; label: string; custom?: string }) {
  const known = colors.some(color => color.toLowerCase() === value.toLowerCase())
  return <div className="swatches" role="group" aria-label={label}>
    {colors.map(color => <button key={color} type="button" className="swatch" style={{ background: color }}
      aria-label={color} aria-pressed={color.toLowerCase() === value.toLowerCase()} onClick={() => onPick(color)} />)}
    {custom && <label className={`swatch swatch-custom${known ? '' : ' is-picked'}`} title="好きな色を選ぶ"
      style={known ? undefined : { background: value }}>
      <span className="visually-hidden">{custom}</span>
      <input type="color" value={value} onChange={event => onPick(event.target.value)} />
    </label>}
  </div>
}

const partIcon = (part: PartKey, color = 'currentColor') => <span className="part-icon" aria-hidden="true"
  style={{ background: color, maskImage: `url(${partUrl(part)})`, WebkitMaskImage: `url(${partUrl(part)})` }} />

function Slider({ id, label, min, max, step, value, onChange }: {
  id: string; label: string; min: number; max: number; step: number; value: number; onChange: (value: number) => void
}) {
  return <div className="slider-row">
    <label htmlFor={id}>{label}</label>
    <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={event => onChange(Number(event.target.value))} />
  </div>
}

export default function MandalaMaker({ maker, onMaker: setMaker, presets, heading, onHome }: {
  maker: Maker; onMaker: (maker: Maker) => void; presets: Preset[]
  heading: Ref<HTMLHeadingElement>; onHome: () => void
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const cache = useRef<Tinted>(new Map())
  const drawId = useRef(0)
  const [zone, setZone] = useState<Zone>('inner')
  const [selectedId, setSelectedId] = useState<number | null>(maker.layers.at(-1)?.id ?? null)
  const [confirm, setConfirm] = useState<'reset' | 'omakase' | null>(null)
  // Every おまかせ shown in this visit, so a design seen earlier can be brought back.
  const [history, setHistory] = useState<{ list: Maker[]; pos: number }>({ list: [], pos: -1 })
  // What a confirmed おまかせ replacement will do: a fresh design, or a step through the history.
  const [pending, setPending] = useState<() => void>(() => () => {})
  const [highlightId, setHighlightId] = useState<number | null>(null)
  const presetColors = presets.map(preset => preset.color)
  // Any hand edit ends the おまかせ state, so a new おまかせ then asks before replacing the work.
  const onMaker = (next: Maker) => setMaker({ ...next, auto: false })
  const [saved, setSaved] = useState<Saved | null>(null)
  const [error, setError] = useState('')
  const selected = maker.layers.find(layer => layer.id === selectedId)
  const lastColor = selected?.color ?? maker.layers.at(-1)?.color ?? presetColors[0] ?? '#3E6CA8'

  useEffect(() => {
    if (!canvas.current) return
    const id = ++drawId.current
    draw(canvas.current, maker, cache.current, () => id === drawId.current, highlightId).catch(() => setError('パーツを表示できませんでした。再読み込みしてお試しください。'))
  }, [maker, highlightId])
  useEffect(() => setSaved(null), [maker])
  useEffect(() => {
    if (highlightId === null) return
    const timer = setTimeout(() => setHighlightId(null), 900)
    return () => clearTimeout(timer)
  }, [highlightId])

  function show(next: Maker) {
    setMaker(next); setSelectedId(null); setConfirm(null)
  }
  function runOmakase() {
    const next = omakase(presets)
    setHistory(({ list, pos }) => {
      const kept = [...list.slice(0, pos + 1), next].slice(-20)
      return { list: kept, pos: kept.length - 1 }
    })
    show(next)
  }
  function step(by: -1 | 1) {
    const pos = history.pos + by
    const next = history.list[pos]
    if (!next) return
    setHistory({ ...history, pos })
    show({ ...next, auto: true })
  }
  // Hand-edited work is never replaced without asking.
  const guarded = (action: () => void) => () => {
    if (maker.auto) action()
    else { setPending(() => action); setConfirm('omakase') }
  }

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

    <div className="maker-stage">
      <canvas ref={canvas} width={900} height={900} className="maker-canvas" role="img"
        aria-label={maker.layers.length ? `パーツ${maker.layers.length}つの曼荼羅` : 'まだ何も置いていない曼荼羅'} />
      {maker.layers.length === 0 && <div className="maker-empty">
        <p>{presets.length ? '選んだ色と大きさから、ひとつ作ってみる？' : 'パーツを選ぶか、おまかせで。'}</p>
        <button type="button" className="button-primary" onClick={runOmakase}>おまかせで作る</button>
      </div>}
    </div>
    {maker.layers.length > 0 && (confirm === 'omakase' ? <div className="confirm-fresh" role="alertdialog" aria-labelledby="omakase-text">
      <p id="omakase-text" className="lead">今の作品を、別のおまかせに置き換えますか？</p>
      <div className="home-actions">
        <button type="button" className="danger" onClick={() => pending()}>置き換える</button>
        <button type="button" className="button-quiet" onClick={() => setConfirm(null)}>やめる</button>
      </div>
    </div> : <div className="maker-shuffle">
      <div className="shuffle-row">
        <button type="button" className="button-quiet" disabled={history.pos <= 0} onClick={guarded(() => step(-1))} aria-label="ひとつ前のおまかせに戻る">←</button>
        <button type="button" className="button-quiet" onClick={guarded(runOmakase)}>別のおまかせ</button>
        <button type="button" className="button-quiet" disabled={history.pos >= history.list.length - 1} onClick={guarded(() => step(1))} aria-label="次のおまかせへ">→</button>
      </div>
    </div>)}

    <div className="maker-panel">
      <h2>1. パーツを置く</h2>
      <div className="layout-switch zone-switch" role="group" aria-label="置く場所">
        {(Object.keys(ZONES) as Zone[]).map(item => <button key={item} type="button" aria-pressed={zone === item} onClick={() => setZone(item)}>
          {ZONES[item].label}
        </button>)}
      </div>
      <div className="part-grid" role="group" aria-label={`${ZONES[zone].label}に置くパーツ`}>
        {(zone === 'fill' ? RINGS : MOTIFS).map(part => <button key={part} type="button" className="part-button" onClick={() => add(part)}>
          {partIcon(part)}
          <span>{PARTS[part]}</span>
        </button>)}
      </div>
    </div>

    {maker.layers.length > 0 && <div className="maker-panel">
      <h2>2. 選んで、整える</h2>
      <div className="layer-chips" role="group" aria-label="置いたパーツ（下ほど手前）">
        {maker.layers.map(layer => <button key={layer.id} type="button" className="layer-chip" aria-pressed={layer.id === selectedId}
          onClick={() => { setSelectedId(layer.id); setHighlightId(layer.id) }}>
          <span className="layer-thumb" style={{ background: maker.bg }}>{partIcon(layer.part, layer.color)}</span>
          <span className="layer-name">{PARTS[layer.part]}<small>{ZONES[layer.zone].label}{layer.count > 1 ? `・${layer.count}こ` : ''}</small></span>
        </button>)}
      </div>
      {selected && d && <div className="layer-editor">
        <p className="hint">色</p>
        {presetColors.length > 0 && <Swatches colors={presetColors} value={selected.color} onPick={color => update({ color })} label="今日の色" />}
        <Swatches colors={TONES} value={selected.color} onPick={color => update({ color })} label="パーツの色" custom="好きな色を選ぶ" />
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
      <Swatches colors={BACKGROUNDS.map(item => item.color)} value={maker.bg} onPick={bg => onMaker({ ...maker, bg })} label="背景の色" custom="好きな背景色を選ぶ" />
    </div>

    <div className="maker-actions">
      <button type="button" className="button-primary" disabled={!maker.layers.length} onClick={save}>画像で保存</button>
      {saved && <SavedResult saved={saved} title="曼荼羅palette" />}
      {error && <p role="alert">{error}</p>}
      {confirm === 'reset' ? <div className="confirm-fresh" role="alertdialog" aria-labelledby="reset-text">
        <p id="reset-text" className="lead">今の作品を消して、はじめから？</p>
        <div className="home-actions">
          <button type="button" className="danger" onClick={() => { setMaker(emptyMaker()); setSelectedId(null); setConfirm(null) }}>消して、はじめから</button>
          <button type="button" className="button-quiet" onClick={() => setConfirm(null)}>やめる</button>
        </div>
      </div> : maker.layers.length > 0 && <button type="button" className="back-button" onClick={() => setConfirm('reset')}>はじめから作り直す</button>}
      <p className="hint">作りかけの作品は、このブラウザの中に自動で残ります。</p>
    </div>
  </section>
}
