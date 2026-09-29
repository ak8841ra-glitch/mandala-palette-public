import { useEffect, useRef, useState } from 'react'
import type { ReactNode, Ref } from 'react'

// The home screen as a museum floor guide: the guide up top lets returning visitors enter in one tap;
// scrolling rides the elevator floor by floor, and each floor's doors open onto a scene from that room.

export type RoomId = 'look' | 'make'
interface Floor {
  floor: string; room: string; name: string; lead: string
  steps?: readonly string[]; meta?: string; enter?: RoomId
}
const FLOORS: readonly Floor[] = [
  { floor: '1F', room: '色と言葉の部屋', name: '自分を眺める', enter: 'look', lead: '色と言葉を選んで置き、今の気分を眺める。',
    steps: ['今日のテーマを選ぶ（決めなくてもOK）', '色の輪から、気になる言葉を選ぶ', '曼荼羅に置いて、眺める'], meta: '約3分・書かなくても大丈夫' },
  { floor: '2F', room: '曼荼羅のアトリエ', name: '自分でつくる', enter: 'make', lead: 'パーツと色を選んで、曼荼羅アートをつくる。',
    steps: ['パーツを選ぶ（おまかせでもOK）', '色・数・大きさを整える', '画像で保存する'], meta: '約3分・絵心はいりません' },
  { floor: '3F', room: 'ギャラリー', name: 'みんなの作品', lead: '公開された作品を、ゆっくり鑑賞できるフロア。' },
  { floor: '4F', room: 'わたしの展示室', name: '作品を収蔵する', lead: 'つくった作品を、日付ごとに飾っておけるフロア。' },
]

// Enamel dots and parts that drift around the logo; positions are % of the hero.
const DRIFT = [
  { x: 6, y: 18, size: 26, color: '#EF4060' }, { x: 88, y: 12, size: 20, color: '#43A55E' },
  { x: 92, y: 62, size: 30, color: '#3E6CA8' }, { x: 4, y: 70, size: 22, color: '#F2E024' },
  { x: 20, y: 94, size: 16, color: '#8C4FAE' }, { x: 78, y: 92, size: 18, color: '#F2941C' },
  { x: 14, y: 44, size: 12, color: '#EC6E88' }, { x: 84, y: 38, size: 12, color: '#C7C7C7' },
]
const DRIFT_PARTS = [{ x: 76, y: 2, part: 'spark' }, { x: 12, y: 2, part: 'petal' }, { x: 94, y: 86, part: 'lotus' }]

export default function Home({ heading, logo, parts, scenes, onEnter, notice }: {
  heading: Ref<HTMLHeadingElement>; logo: string; parts: string
  scenes: Record<RoomId, ReactNode>; onEnter: (room: RoomId) => void; notice: ReactNode
}) {
  const floorRefs = useRef<(HTMLElement | null)[]>([])
  const [current, setCurrent] = useState(0)
  const [opened, setOpened] = useState<boolean[]>(() => FLOORS.map(() => false))

  // Light up the floor in view, and open its doors the first time it arrives.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') { setOpened(FLOORS.map(() => true)); return }
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const index = floorRefs.current.indexOf(entry.target as HTMLElement)
        setCurrent(index)
        setOpened(previous => previous.map((open, i) => open || i === index))
      }
    }, { rootMargin: '-35% 0px -45% 0px' })
    floorRefs.current.forEach(element => element && observer.observe(element))
    return () => observer.disconnect()
  }, [])

  const goTo = (index: number) => floorRefs.current[Math.max(0, Math.min(FLOORS.length - 1, index))]?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return <section className="museum" aria-labelledby="title">
    <div className="hero">
      <div className="drift" aria-hidden="true">
        {DRIFT.map((dot, i) => <i key={i} className="drift-dot" style={{ left: `${dot.x}%`, top: `${dot.y}%`, width: dot.size, background: dot.color, animationDelay: `${-i * 1.7}s` }} />)}
        {DRIFT_PARTS.map((item, i) => <i key={item.part} className="drift-part" style={{ left: `${item.x}%`, top: `${item.y}%`, maskImage: `url(${parts}${item.part}.png)`, WebkitMaskImage: `url(${parts}${item.part}.png)`, animationDelay: `${-i * 2.3}s` }} />)}
      </div>
      <img className="home-logo" src={logo} width="1000" height="1000" alt="" draggable={false} />
      <h1 ref={heading} tabIndex={-1} id="title" className="visually-hidden">曼荼羅palette</h1>
    </div>

    <nav className="floor-guide" aria-labelledby="floor-guide-title">
      <h2 id="floor-guide-title"><span>FLOOR GUIDE</span>フロアガイド</h2>
      <div className="floor-guide-grid">
        {FLOORS.map((floor, index) => floor.enter
          ? <button key={floor.floor} type="button" className="guide-card" onClick={() => onEnter(floor.enter!)}>
            <span className="floor-badge">{floor.floor}</span>
            <span className="guide-room">{floor.room}</span>
            <span className="guide-name">{floor.name}</span>
          </button>
          : <button key={floor.floor} type="button" className="guide-card is-soon" onClick={() => goTo(index)}>
            <span className="floor-badge">{floor.floor}</span>
            <span className="guide-room">{floor.room}</span>
            <span className="guide-name">準備中</span>
          </button>)}
      </div>
      {notice}
      <button type="button" className="back-button tour" onClick={() => goTo(0)}>フロアをめぐって、中を見てみる<span aria-hidden="true">↓</span></button>
    </nav>

    <div className="floors">
      {/* Elevator indicator: pinned while riding through the floors. */}
      <div className="elevator" role="group" aria-label="フロアを移動">
        <button type="button" className="elevator-step" aria-label="上の階へ" disabled={current === 0} onClick={() => goTo(current - 1)}>↑</button>
        {FLOORS.map((floor, index) => <button key={floor.floor} type="button" className="elevator-floor" aria-current={index === current ? 'true' : undefined}
          aria-label={`${floor.floor} ${floor.room}`} onClick={() => goTo(index)}>{floor.floor}</button>)}
        <button type="button" className="elevator-step" aria-label="下の階へ" disabled={current === FLOORS.length - 1} onClick={() => goTo(current + 1)}>↓</button>
      </div>

      {FLOORS.map((floor, index) => <article key={floor.floor} ref={element => { floorRefs.current[index] = element }}
        className={`floor${opened[index] ? ' is-open' : ''}${floor.enter ? '' : ' is-soon'}`} aria-labelledby={`floor-${index}-name`}>
        <div className="floor-head">
          <span className="floor-badge floor-badge--large">{floor.floor}</span>
          <span><span className="guide-room">{floor.room}</span><h2 id={`floor-${index}-name`} className="floor-name">{floor.name}</h2></span>
        </div>
        <div className="floor-window" aria-hidden="true">
          {floor.enter && scenes[floor.enter]}
          <span className="floor-door floor-door--left" />
          <span className="floor-door floor-door--right" />
          {!floor.enter && <span className="soon-plate">準備中</span>}
        </div>
        <p className="lead">{floor.lead}</p>
        {floor.steps && <ol className="room-steps">{floor.steps.map(step => <li key={step}>{step}</li>)}</ol>}
        {floor.meta && <p className="room-meta">{floor.meta}</p>}
        {floor.enter
          ? <button type="button" className="button-primary room-enter" onClick={() => onEnter(floor.enter!)}>{floor.room}に入る<span aria-hidden="true">→</span></button>
          : <p className="hint">このフロアは、ただいま準備中です。</p>}
      </article>)}
    </div>
    <p className="hint home-note">無料・登録なし。入力した内容は、外部に送られません。</p>
  </section>
}
