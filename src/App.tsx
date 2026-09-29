import { useEffect, useRef, useState } from 'react'
import { KEYWORDS } from './palette'
import WordPicker from './WordPicker'
import MandalaField from './MandalaField'
import Reflection from './Reflection'
import type { PlacedCard } from './MandalaField'
import { GUIDES, THEMES, emptyNotes } from './guide'
import type { Guide, Notes, Theme } from './guide'

const artwork = `${import.meta.env.BASE_URL}assets/field-mandala.svg`
const wheel = `${import.meta.env.BASE_URL}assets/color-wheel.png`

type Screen = 'home' | 'theme' | 'pick' | 'field' | 'reflection'
const SCREENS: readonly Screen[] = ['home', 'theme', 'pick', 'field', 'reflection']

// The draft lives only in this browser, so an interrupted session can resume after a reload.
const DRAFT_KEY = 'mandala-palette:draft'
interface Draft {
  screen: Screen; themeId: string | null; guide: Guide; cards: PlacedCard[]; picked: string[]
  open: string[]; notes: Notes; showWords: boolean
}
function loadDraft(): Partial<Draft> {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}') as Partial<Draft> } catch { return {} }
}

const hasNotes = (notes: Notes) => Boolean(notes.title.trim() || Object.values(notes.answers).some(answer => answer.trim()))

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
      guide, cards, picked, open, notes, showWords }
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(saved)) } catch { /* storage may be unavailable; the app still works */ }
  }, [screen, resumeScreen, theme, guide, cards, picked, open, notes, showWords])

  const hasProgress = cards.length > 0 || picked.length > 0 || hasNotes(notes)

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
      {screen === 'home' ? <section className="intro" aria-labelledby="title">
        <img className="home-wheel" src={wheel} width="2000" height="2000" alt="" draggable={false} />
        <p className="eyebrow">A MOMENT FOR YOURSELF</p>
        <h1 ref={heading} tabIndex={-1} id="title">色と言葉で、<br />今の自分に出会う。</h1>
        <p className="lead">色と言葉を選んで、置いて、眺める。</p>
        <p className="hint">正解はありません。</p>
        {confirmFresh ? <div className="confirm-fresh" role="alertdialog" aria-labelledby="confirm-fresh-text">
          <p id="confirm-fresh-text" className="lead">今の作品を消して、はじめから作りますか？</p>
          <p className="hint">残したい作品は、「つづきから」で戻って画像保存できます。</p>
          <div className="home-actions">
            <button type="button" className="danger" onClick={startFresh}>消して、はじめから</button>
            <button type="button" onClick={() => setConfirmFresh(false)}>やめる</button>
          </div>
        </div> : <div className="home-actions">
          {resumeScreen && <button type="button" onClick={() => setScreen(resumeScreen)}>
            つづきから<span aria-hidden="true">→</span>
          </button>}
          <button type="button" onClick={() => hasProgress ? setConfirmFresh(true) : startFresh()}>はじめから<span aria-hidden="true">↗</span></button>
        </div>}
        <p className="hint home-note">約5分・無料・登録なし。<br />入力した内容は、外部に送られません。</p>
      </section> : screen === 'reflection' ? <Reflection cards={cards} artwork={artwork} guide={guide} theme={theme} notes={notes} onNotes={setNotes} showWords={showWords} onShowWords={setShowWords} onBack={() => setScreen('field')} onHome={goHome} /> : screen === 'field' ? <MandalaField guide={guide} onGuide={setGuide} theme={theme} onComplete={() => setScreen('reflection')} artwork={artwork} cards={cards} setCards={setCards} onAdd={() => setScreen('pick')} /> : screen === 'theme' ? <section className="selection" aria-labelledby="theme-title">
        <nav className="selection-nav" aria-label="画面の移動">
          <button className="back-button" type="button" onClick={() => setScreen(cards.length ? 'field' : 'home')}>
            ← {cards.length ? '配置に戻る' : 'トップへ戻る'}
          </button>
          <span className="step-label">01 / テーマを選ぶ</span>
        </nav>
        <p className="eyebrow">CHOOSE YOUR THEME</p>
        <h1 ref={heading} tabIndex={-1} id="theme-title">今日は、何について<br />眺めてみる？</h1>
        <p className="lead">決めずに始めても大丈夫。</p>
        <div className="theme-grid" role="group" aria-label="テーマを1つ選ぶ">
          {THEMES.map(item => <button key={item.id} type="button" className="theme-choice"
            aria-pressed={theme?.id === item.id}
            onClick={() => { setTheme(item); setScreen(cards.length ? 'field' : 'pick') }}>
            {item.label}
          </button>)}
        </div>
      </section> : <WordPicker heading={heading} theme={theme} picked={picked} onPicked={setPicked} open={open} onOpen={setOpen}
        backLabel={cards.length ? '配置に戻る' : 'テーマを選び直す'} onBack={() => setScreen(cards.length ? 'field' : 'theme')}
        wheel={wheel} doneLabel={cards.length ? '追加する' : '並べる'} onDone={() => { placePicked(); setScreen('field') }} />}
      <footer><span>曼荼羅palette</span><span>色を選ぶ。言葉を置く。自分を眺める。</span></footer>
    </main>
  )
}
