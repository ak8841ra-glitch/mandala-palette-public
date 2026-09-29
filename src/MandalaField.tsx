import { useRef, useState } from 'react'
import type { Dispatch, SetStateAction, PointerEvent } from 'react'
import type { Keyword } from './palette'
import type { Layout, Theme } from './guide'

export interface PlacedCard extends Keyword {
  instanceId: string
  colorId: string
  colorName: string
  x: number
  y: number
  size?: 'small' | 'medium' | 'large'
  z: number
}

const sizes = { small: { label: '小', diameter: .20 }, medium: { label: '中', diameter: .28 }, large: { label: '大', diameter: .36 } } as const
// Reserve room for the largest size so resizing never moves the center.
const clamp = (value: number) => Math.max(.18, Math.min(.82, value))

export default function MandalaField({ cards, setCards, onAdd, artwork, onChangeField, onComplete, layout, onLayout, theme }: {
  layout: Layout
  onLayout: (layout: Layout) => void
  theme: Theme | null
  onComplete: () => void
  artwork: string
  onChangeField: () => void
  cards: PlacedCard[]
  setCards: Dispatch<SetStateAction<PlacedCard[]>>
  onAdd: () => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deleted, setDeleted] = useState<{ card: PlacedCard; index: number } | null>(null)
  const undoButton = useRef<HTMLButtonElement>(null)
  const selected = cards.find(card => card.instanceId === selectedId)
  const field = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: string; pointer: number; dx: number; dy: number } | null>(null)

  function front(id: string) {
    setCards(previous => previous.map(card => card.instanceId === id
      ? { ...card, z: Math.max(...previous.map(item => item.z)) + 1 } : card))
  }

  function start(event: PointerEvent<HTMLButtonElement>, card: PlacedCard) {
    if (event.button !== 0 || drag.current) return
    setSelectedId(card.instanceId)
    const rect = field.current!.getBoundingClientRect()
    drag.current = { id: card.instanceId, pointer: event.pointerId,
      dx: (event.clientX - rect.left) / rect.width - card.x,
      dy: (event.clientY - rect.top) / rect.height - card.y }
    event.currentTarget.setPointerCapture(event.pointerId)
    front(card.instanceId)
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    const active = drag.current
    if (!active || active.pointer !== event.pointerId) return
    const rect = field.current!.getBoundingClientRect()
    const x = clamp((event.clientX - rect.left) / rect.width - active.dx)
    const y = clamp((event.clientY - rect.top) / rect.height - active.dy)
    setCards(previous => previous.map(card => card.instanceId === active.id ? { ...card, x, y } : card))
  }

  return <section className="selection field-section" aria-labelledby="field-title"
    onPointerDown={event => { if (!(event.target as HTMLElement).closest('.placed-card, .card-size-controls')) setSelectedId(null) }}
    onKeyDown={event => { if (event.key === 'Escape') setSelectedId(null) }}>
    <p className="eyebrow">MAKE YOUR OWN SPACE</p>
    <h1 id="field-title" tabIndex={-1}>心のままに、置いてみる。</h1>
    {theme && theme.id !== 'free' && <p className="theme-badge">テーマ：{theme.label}</p>}
    <p className="description" id="field-help">{layout === 'distance'
      ? <>自分に近いと感じるものは中心へ、遠いと感じるものは外側へ。<br />重ねても、何度動かしても大丈夫です。</>
      : <>丸いカードを、好きな場所へ動かしてみてください。<br />重ねても、何度動かしても大丈夫です。</>}</p>
    <div className="layout-switch" role="group" aria-label="置き方">
      <button type="button" aria-pressed={layout === 'distance'} onClick={() => onLayout('distance')}>距離で置く</button>
      <button type="button" aria-pressed={layout === 'free'} onClick={() => onLayout('free')}>自由に置く</button>
    </div>
    <div ref={field} className="mandala-field" role="group" aria-label="曼荼羅フィールド" aria-describedby="field-help">
      <img className="field-art" src={artwork} alt="" draggable={false} />
      {layout === 'distance' && <svg className="distance-guide" viewBox="0 0 100 100" aria-hidden="true">
        {[14, 28, 42].map(r => <circle key={r} cx="50" cy="50" r={r} />)}
        <text x="50" y="51.5">自分に近い</text>
        <text x="50" y="97">自分から遠い</text>
      </svg>}
      {cards.map(card => <button key={card.instanceId} id={`card-${card.instanceId}`} type="button" className="placed-card"
        aria-pressed={selectedId === card.instanceId}
        aria-label={`${card.word}（${card.colorName}・${cards.indexOf(card) + 1}枚目）を移動`}
        style={{ width: `${sizes[card.size ?? 'medium'].diameter * 100}%`, fontSize: `clamp(11px, ${card.size === 'small' ? 2.4 : card.size === 'large' ? 3.6 : 3}cqw, 24px)`, left: `${card.x * 100}%`, top: `${card.y * 100}%`, zIndex: card.z, background: card.bg, color: card.ink }}
        onPointerDown={event => start(event, card)} onPointerMove={move}
        onPointerUp={() => { drag.current = null }}
        onPointerCancel={() => { drag.current = null }}
        onLostPointerCapture={() => { drag.current = null }}
        onClick={() => setSelectedId(card.instanceId)}
        onFocus={() => { setSelectedId(card.instanceId); front(card.instanceId) }}
        onKeyDown={event => {
          const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key]
          if (!direction) return
          event.preventDefault()
          const step = event.shiftKey ? .05 : .01
          setCards(previous => previous.map(item => item.instanceId === card.instanceId
            ? { ...item, x: clamp(item.x + direction[0]! * step), y: clamp(item.y + direction[1]! * step) } : item))
        }}><span>{card.word}</span></button>)}
    </div>
    <div className="card-size-space">
      {selected && <div className="card-size-controls" role="group" aria-label={`「${selected.word}」の操作`}>
        <span>カードの大きさ</span>
        {(Object.keys(sizes) as Array<keyof typeof sizes>).map(size => <button type="button" key={size}
          aria-pressed={(selected.size ?? 'medium') === size}
          onClick={() => setCards(previous => previous.map(card => card.instanceId === selectedId ? { ...card, size } : card))}>
          {sizes[size].label}
        </button>)}
        <button type="button" className="delete-card" aria-label={`「${selected.word}」を削除`} onClick={() => {
          setDeleted({ card: selected, index: cards.findIndex(card => card.instanceId === selected.instanceId) })
          setCards(previous => previous.filter(card => card.instanceId !== selected.instanceId))
          setSelectedId(null)
          drag.current = null
          requestAnimationFrame(() => undoButton.current?.focus({ preventScroll: true }))
        }}>削除</button>
      </div>}
    </div>
    <div className="delete-feedback" role="status">
      {deleted && <><span>「{deleted.card.word}」を削除しました。</span>
        <button ref={undoButton} type="button" className="back-button" onClick={() => {
          const restored = deleted.card
          setCards(previous => {
            if (previous.some(card => card.instanceId === restored.instanceId)) return previous
            const next = [...previous]
            next.splice(Math.min(deleted.index, next.length), 0, restored)
            return next
          })
          setDeleted(null)
          setSelectedId(restored.instanceId)
          requestAnimationFrame(() => document.getElementById(`card-${restored.instanceId}`)?.focus({ preventScroll: true }))
        }}>元に戻す</button></>}
    </div>
    <p className="field-meaning">大きさ＝大切さ　位置＝自分との距離　色＝感覚<br /><span>決まりではありません。言葉以外でも、意味を表してみてください。</span></p>
    <p className="field-hint">カードを選ぶと、大きさの変更や削除ができます。<br />指やマウスでドラッグできます。キーボードではカードを選び、矢印キーで移動できます。</p>
    <div className="field-actions"><button type="button" onClick={onAdd}>もう1枚追加 <span aria-hidden="true">＋</span></button>
    <button type="button" className="back-button" onClick={onChangeField}>フィールドを選び直す</button></div>
    <div className="place-action"><button type="button" disabled={!cards.length} onClick={onComplete}>完成 →</button></div>
    <p className="preview-note">再読み込みすると配置はリセットされます。</p>
  </section>
}
