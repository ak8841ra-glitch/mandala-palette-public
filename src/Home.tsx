import { useEffect, useState } from 'react'
import type { ReactNode, Ref } from 'react'
import { recordRoomChoice } from './analytics'

// The home screen as a museum floor map, drawn from above: you come in at the entrance,
// the two open rooms stand side by side, and the corridor runs on to rooms still being built.
// Each open room shows its own screens through the doorway, so you can see what is inside before stepping in.

export type RoomId = 'look' | 'make'
interface Room { id: RoomId; description: readonly [string, string]; name: readonly [string, string]; images: readonly string[] }
// Screenshots of the real screens (public/assets/tour): the room's first screen, then its steps.
const ROOMS: readonly Room[] = [
  { id: 'look', name: ['色と言葉で、', '今の気分を眺める'], description: ['気になる色を選んで、', 'しっくりくる言葉を探す。'], images: ['look-cover.jpg', 'look-1.jpg', 'look-2.jpg', 'look-3.jpg'] },
  { id: 'make', name: ['曼荼羅アートを', 'つくる'], description: ['好きな色と模様を選んで、', '自分だけの一枚に。'], images: ['make-cover.jpg', 'make-1.jpg', 'make-2.jpg', 'make-3.jpg'] },
]
// New areas are added here, past the open rooms.
const COMING = ['ギャラリー'] as const

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

export default function Home({ heading, logo, tour, onEnter, onCreator, notice }: {
  heading: Ref<HTMLHeadingElement>; logo: string; tour: string
  onEnter: (room: RoomId) => void; onCreator: () => void; notice: ReactNode
}) {
  // One clock for both rooms; the second room runs half a beat behind so they don't change together.
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (reducedMotion()) return
    const timer = setInterval(() => setTick(value => value + 1), 1400)
    return () => clearInterval(timer)
  }, [])

  return <section className="museum" aria-labelledby="title">
    <div className="hero">
      <img className="home-logo" src={logo} width="1000" height="1000" alt="" draggable={false} />
      <h1 ref={heading} tabIndex={-1} id="title" className="museum-title">曼荼羅palette</h1>
      <p className="palette-philosophy">
        気になる色を選び、今の自分を眺める。<br />
        自分だけの曼荼羅アートをつくる。<br />
        あなたの感覚や気持ちを大切にする場所。
      </p>
    </div>
    {notice}

    <nav className="map" aria-label="館内マップ">
      <p className="map-entrance"><span>入口</span></p>
      <ul className="map-rooms">
        {ROOMS.map((room, index) => {
          const shown = Math.floor((tick + index) / 2) % room.images.length
          return <li key={room.id}>
            <button type="button" className="map-room" onClick={() => {
              recordRoomChoice(room.id)
              onEnter(room.id)
            }}>
              <span className="map-view" aria-hidden="true">
                {room.images.map((image, i) => <img key={image} className={i === shown ? 'is-shown' : ''} src={tour + image} alt="" draggable={false} />)}
              </span>
              <span className="map-name">{room.name[0]}<br />{room.name[1]}</span>
              <span className="map-label">{room.description[0]}<br />{room.description[1]}</span>
            </button>
          </li>
        })}
      </ul>
      <ul className="map-coming" aria-label="奥の展示室">
        <li>
          <button type="button" className="map-creator" onClick={onCreator}>
            <img src={`${tour}../creator/asuka-icon.png`} alt="" draggable={false} />
            <span><strong>つくったひと</strong><small>作者の展示室</small></span>
          </button>
        </li>
        {COMING.map(name => <li key={name}><span className="map-label">{name}</span><small>準備中</small></li>)}
      </ul>
    </nav>
    <p className="hint home-note">無料・登録なし。入力した内容は、外部に送られません。</p>
    <p className="hint home-note">訪問状況と入口の選択は Google Analytics で計測します。</p>
  </section>
}
