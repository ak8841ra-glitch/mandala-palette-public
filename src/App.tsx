import { useEffect, useRef, useState } from 'react'
import { KEYWORDS } from './palette'
import WordPicker from './WordPicker'
import Home from './Home'
import Steps from './Steps'
import type { RoomId } from './Home'
import MandalaField from './MandalaField'
import Reflection from './Reflection'
import MandalaMaker, { emptyMaker } from './MandalaMaker'
import type { Maker } from './MandalaMaker'
import type { Preset } from './omakase'
import type { PlacedCard } from './MandalaField'
import { GUIDES, THEMES, emptyNotes } from './guide'
import type { Guide, Notes, Theme } from './guide'

const artwork = `${import.meta.env.BASE_URL}assets/field-mandala.svg`
const logo = `${import.meta.env.BASE_URL}assets/logo-palette.jpg`

type Screen = 'home' | 'theme' | 'pick' | 'field' | 'reflection' | 'make'
const SCREENS: readonly Screen[] = ['home', 'theme', 'pick', 'field', 'reflection', 'make']

// The draft lives only in this browser, so an interrupted session can resume after a reload.
const DRAFT_KEY = 'mandala-palette:draft'
interface Draft {
  screen: Screen; themeId: string | null; guide: Guide; cards: PlacedCard[]; picked: string[]
  open: string[]; notes: Notes; showWords: boolean; maker: Maker
}
function loadDraft(): Partial<Draft> {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}') as Partial<Draft> } catch { return {} }
}

// Each card's color counts by its size, so larger cards lead the おまかせ design.
const SIZE_WEIGHT = { small: 1, medium: 2, large: 3 } as const
function presetsFrom(cards: PlacedCard[]): Preset[] {
  const weights = new Map<string, number>()
  for (const card of cards) weights.set(card.bg, (weights.get(card.bg) ?? 0) + SIZE_WEIGHT[card.size ?? 'medium'])
  return [...weights].map(([color, weight]) => ({ color, weight })).sort((a, b) => b.weight - a.weight)
}

const hasNotes = (notes: Notes) => Boolean(notes.title.trim() || Object.values(notes.answers).some(answer => answer.trim()) || Object.keys(notes.reactions ?? {}).length)

// New cards start on a ring around the center, so each one can be seen and grabbed.
function ring(count: number, index: number) {
  if (count === 1) return { x: .5, y: .5 }
  const angle = -Math.PI / 2 + index * 2 * Math.PI / count
  const radius = count > 4 ? .28 : .22
  return { x: .5 + Math.cos(angle) * radius, y: .5 + Math.sin(angle) * radius }
}

export default function App() {
  const [draft] = useState(loadDraft)
  const [screen, setScreen] = useState<Screen>('home')
  // Drafts from older versions may name screens that no longer exist.
  const [resumeScreen, setResumeScreen] = useState<Screen | null>(draft.screen && draft.screen !== 'home'
    ? SCREENS.includes(draft.screen) ? draft.screen : draft.cards?.length ? 'field' : 'pick' : null)
  function goHome() {
    if (screen !== 'home') setResumeScreen(screen)
    setScreen('home')
  }
  const [theme, setTheme] = useState<Theme | null>(THEMES.find(item => item.id === draft.themeId) ?? null)
  const [guide, setGuide] = useState<Guide>(GUIDES.includes(draft.guide as Guide) ? draft.guide! : 'triangle')
  const [notes, setNotes] = useState<Notes>(draft.notes ?? emptyNotes())
  const [showWords, setShowWords] = useState(draft.showWords ?? true)
  const [cards, setCards] = useState<PlacedCard[]>(draft.cards ?? [])
  const [picked, setPicked] = useState<string[]>((draft.picked ?? []).filter(id => KEYWORDS.has(id)))
  const [open, setOpen] = useState<string[]>(draft.open ?? [])
  const [maker, setMaker] = useState<Maker>(draft.maker?.layers ? draft.maker : emptyMaker())
  const [presets, setPresets] = useState<Preset[]>([])
  const [confirmFresh, setConfirmFresh] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const initialRender = useRef(true)

  useEffect(() => {
    if (initialRender.current) { initialRender.current = false; return }
    heading.current?.focus({ preventScroll: true })
    if (screen === 'field') document.getElementById('field-title')?.focus({ preventScroll: true })
    if (screen === 'reflection') document.getElementById('reflection-title')?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [screen])

  useEffect(() => {
    const saved: Draft = { screen: screen === 'home' ? resumeScreen ?? 'home' : screen, themeId: theme?.id ?? null,
      guide, cards, picked, open, notes, showWords, maker }
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(saved)) } catch { /* storage may be unavailable; the app still works */ }
  }, [screen, resumeScreen, theme, guide, cards, picked, open, notes, showWords, maker])

  const hasProgress = cards.length > 0 || picked.length > 0 || hasNotes(notes)

  function enter(room: RoomId) {
    if (room === 'make') { setPresets([]); setScreen('make') } else if (hasProgress) { setConfirmFresh(true); window.scrollTo({ top: 0 }) } else startFresh()
  }

  function startFresh() {
    setCards([])
    setPicked([])
    setOpen([])
    setNotes(emptyNotes())
    setTheme(null)
    setGuide('triangle')
    setShowWords(true)
    setConfirmFresh(false)
    setResumeScreen(null)
    setScreen('theme')
  }

  function placePicked() {
    setCards(previous => {
      const top = Math.max(0, ...previous.map(card => card.z))
      return [...previous, ...picked.map((id, index) => ({
        ...KEYWORDS.get(id)!, instanceId: crypto.randomUUID(), ...ring(picked.length, index),
        size: picked.length > 4 ? 'small' as const : 'medium' as const, z: top + index + 1,
      }))]
    })
    setPicked([])
    setOpen([])
  }

  return (
    <main className="page">
      <header><button type="button" className="brand brand-home" aria-label="曼荼羅palette：トップへ戻る" onClick={goHome}>曼荼羅<span>palette</span></button></header>
      {screen === 'home' ? <Home heading={heading} logo={logo} tour={`${import.meta.env.BASE_URL}assets/tour/`} onEnter={enter}
        notice={confirmFresh ? <div className="confirm-fresh" role="alertdialog" aria-labelledby="confirm-fresh-text">
          <p id="confirm-fresh-text" className="lead">前回の途中の作品があります。</p>
          <p className="hint">はじめからにすると、途中の作品は消えます。</p>
          <div className="home-actions">
            <button type="button" className="button-primary" onClick={() => { setConfirmFresh(false); setScreen(resumeScreen && resumeScreen !== 'make' ? resumeScreen : cards.length ? 'field' : 'pick') }}>つづきから</button>
            <button type="button" className="danger" onClick={startFresh}>消して、はじめから</button>
          </div>
          <button type="button" className="back-button" onClick={() => setConfirmFresh(false)}>やめる</button>
        </div> : resumeScreen && <button type="button" className="back-button resume" onClick={() => setScreen(resumeScreen)}>
          前回のつづきから<span aria-hidden="true">→</span>
        </button>} />
      : screen === 'reflection' ? <Reflection cards={cards} artwork={artwork} guide={guide} theme={theme} notes={notes} onNotes={setNotes} showWords={showWords} onShowWords={setShowWords} onBack={() => setScreen('field')} onHome={goHome}
        onMake={() => { setPresets(presetsFrom(cards)); setMaker(emptyMaker()); setScreen('make') }} /> : screen === 'make'
        ? <MandalaMaker maker={maker} onMaker={setMaker} presets={presets} heading={heading} onHome={goHome} /> : screen === 'field' ? <MandalaField guide={guide} onGuide={setGuide} theme={theme} onComplete={() => setScreen('reflection')} artwork={artwork} cards={cards} setCards={setCards} onAdd={() => setScreen('pick')} /> : screen === 'theme' ? <section className="selection" aria-labelledby="theme-title">
        <nav className="selection-nav" aria-label="画面の移動">
          <button className="back-button" type="button" onClick={() => setScreen(cards.length ? 'field' : 'home')}>
            ← {cards.length ? '配置に戻る' : 'トップへ戻る'}
          </button>
          <Steps at={1} />
        </nav>
        <h1 ref={heading} tabIndex={-1} id="theme-title">今日は、何について<br />眺めてみる？</h1>
        <div className="theme-grid" role="group" aria-label="テーマを1つ選ぶ">
          {THEMES.map(item => <button key={item.id} type="button" className="theme-choice"
            aria-pressed={theme?.id === item.id}
            onClick={() => { setTheme(item); setScreen(cards.length ? 'field' : 'pick') }}>
            {item.label}
          </button>)}
        </div>
      </section> : <WordPicker heading={heading} theme={theme} picked={picked} onPicked={setPicked} open={open} onOpen={setOpen}
        backLabel={cards.length ? '配置に戻る' : 'テーマを選び直す'} onBack={() => setScreen(cards.length ? 'field' : 'theme')}
        wheel={logo} doneLabel={cards.length ? '追加する' : '並べる'} onDone={() => { placePicked(); setScreen('field') }} />}
      <footer><span>曼荼羅palette</span><span>色を選ぶ。言葉を置く。自分を眺める。</span></footer>
    </main>
  )
}
