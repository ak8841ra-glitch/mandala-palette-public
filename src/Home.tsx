import { useEffect, useRef, useState } from 'react'
import type { ReactNode, Ref } from 'react'

// The home screen as a museum floor guide: the guide up top lets returning visitors enter in one tap;
// scrolling rides the elevator floor by floor. Each floor's doors swing open onto a wide view of the
// experience: the room's first screen, then its steps, one at a time.

export type RoomId = 'look' | 'make'
interface Step { label: string; image: string }
interface Floor {
  floor: string; room: string; name: string; lead: string
  cover?: string; steps?: readonly Step[]; meta?: string; enter?: RoomId
}
// Covers and step images are screenshots of the real screens (public/assets/tour).
const FLOORS: readonly Floor[] = [
  { floor: '1F', room: '色と言葉の部屋', name: '自分を眺める', enter: 'look', lead: '色と言葉で、今の気分をかたちに。', cover: 'look-cover.jpg',
    steps: [{ label: '色を選ぶ', image: 'look-1.jpg' }, { label: '言葉を選ぶ', image: 'look-2.jpg' }, { label: '並べて眺める', image: 'look-3.jpg' }],
    meta: '約3分・書かなくても大丈夫' },
  { floor: '2F', room: '曼荼羅のアトリエ', name: '自分でつくる', enter: 'make', lead: 'パーツを組み合わせて、自分だけの曼荼羅に。', cover: 'make-cover.jpg',
    steps: [{ label: 'パーツを選ぶ', image: 'make-1.jpg' }, { label: '色や形を整える', image: 'make-2.jpg' }, { label: '作品を保存', image: 'make-3.jpg' }],
    meta: '約3分・おまかせでもOK・絵心はいりません' },
  { floor: '3F', room: 'ギャラリー', name: 'みんなの作品', lead: '公開された作品を、ゆっくり鑑賞できるフロア。' },
  { floor: '4F', room: 'わたしの展示室', name: '作品を収蔵する', lead: 'つくった作品を、日付ごとに飾っておけるフロア。' },
]

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

export default function Home({ heading, logo, tour, onEnter, notice }: {
  heading: Ref<HTMLHeadingElement>; logo: string; tour: string
  onEnter: (room: RoomId) => void; notice: ReactNode
}) {
  const floorRefs = useRef<(HTMLElement | null)[]>([])
  const [current, setCurrent] = useState(0)
  const [opened, setOpened] = useState<boolean[]>(() => FLOORS.map(() => false))
  // Slide 0 is the room's first screen; slides 1–3 are the steps.
  const [slides, setSlides] = useState<number[]>(() => FLOORS.map(() => 0))
  const [paused, setPaused] = useState<boolean[]>(() => FLOORS.map(() => false))
  const showSlide = (floor: number, slide: number) => setSlides(previous => previous.map((value, i) => i === floor ? slide : value))

  // Only the floor in view plays its slideshow, starting once its doors have opened.
  useEffect(() => {
    const steps = FLOORS[current]?.steps
    if (!steps || !opened[current] || paused[current] || reducedMotion()) return
    const timer = setInterval(() => setSlides(previous => previous.map((value, i) => i === current ? (value + 1) % (steps.length + 1) : value)), 2600)
    return () => clearInterval(timer)
  }, [current, opened, paused])

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
      <img className="home-logo" src={logo} width="1000" height="1000" alt="" draggable={false} />
      <p className="museum-kicker">MANDALA PALETTE MUSEUM</p>
      <h1 ref={heading} tabIndex={-1} id="title" className="museum-title">曼荼羅palette<span>美術館</span></h1>
      <p className="museum-lead">色と言葉、曼荼羅の作品に出会うミュージアム。<br />気になるフロアへ、どうぞ。</p>
    </div>

    <nav className="floor-guide" aria-labelledby="floor-guide-title">
      <h2 id="floor-guide-title"><span>館内案内</span>FLOOR GUIDE</h2>
      <p className="guide-hint">フロアを押すと、すぐに始まります</p>
      <div className="floor-guide-grid">
        {FLOORS.map((floor, index) => floor.enter
          ? <button key={floor.floor} type="button" className="guide-card" onClick={() => onEnter(floor.enter!)}>
            <span className="floor-badge">{floor.floor}</span>
            <span className="guide-room">{floor.room}</span>
            <span className="guide-name">{floor.name}</span>
            <span className="guide-go">すぐ入る<span aria-hidden="true">→</span></span>
          </button>
          : <button key={floor.floor} type="button" className="guide-card is-soon" onClick={() => goTo(index)}>
            <span className="floor-badge">{floor.floor}</span>
            <span className="guide-room">{floor.room}</span>
            <span className="guide-name">準備中</span>
          </button>)}
      </div>
      {notice}
      <button type="button" className="back-button tour" onClick={() => goTo(0)}>はじめての方は、フロアをめぐって中をのぞく<span aria-hidden="true">↓</span></button>
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
          {floor.cover && <img className={`slide slide--cover${slides[index] === 0 ? ' is-shown' : ''}`} src={tour + floor.cover} alt="" draggable={false} />}
          {floor.steps?.map((step, i) => <span key={step.label} className={`slide slide--step${slides[index] === i + 1 ? ' is-shown' : ''}`}>
            <span className="slide-label"><b>{i + 1}</b>{step.label}</span>
            <img src={tour + step.image} alt="" draggable={false} />
          </span>)}
          <span className="floor-door floor-door--left" />
          <span className="floor-door floor-door--right" />
          {!floor.enter && <span className="soon-plate">準備中</span>}
        </div>
        <p className="lead floor-lead">{floor.lead}</p>
        {floor.steps && <ol className="step-tabs" aria-label="体験の流れ">
          {floor.steps.map((step, i) => <li key={step.label}>
            <button type="button" aria-pressed={slides[index] === i + 1} onClick={() => { showSlide(index, i + 1); setPaused(previous => previous.map((value, f) => f === index || value)) }}>
              <b>{i + 1}</b>{step.label}
            </button>
          </li>)}
        </ol>}
        {floor.meta && <p className="room-meta">{floor.meta}</p>}
        {floor.enter
          ? <button type="button" className="button-primary room-enter" onClick={() => onEnter(floor.enter!)}>{floor.room}に入る<span aria-hidden="true">→</span></button>
          : <p className="hint">このフロアは、ただいま準備中です。</p>}
      </article>)}
    </div>
    <p className="hint home-note">無料・登録なし。入力した内容は、外部に送られません。</p>
  </section>
}
