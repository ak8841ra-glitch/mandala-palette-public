import { useEffect, useRef, useState } from 'react'
import { KEYWORDS } from './palette'
import WordPicker from './WordPicker'
import MandalaField from './MandalaField'
import Reflection from './Reflection'
import type { PlacedCard } from './MandalaField'
import { FIELDS as fields, THEMES, emptyNotes } from './guide'
import type { Field, Notes, Theme } from './guide'

const descriptions = ['小花が三角形に広がる模様', '小花が横一列に続く模様', '小花が円状に広がる模様']

type Screen = 'home' | 'theme' | 'pick' | 'fields' | 'field' | 'reflection'

// The draft lives only in this browser, so an interrupted session can resume after a reload.
const DRAFT_KEY = 'mandala-palette:draft'
interface Draft {
  screen: Screen; themeId: string | null; field: Field | null; cards: PlacedCard[]; picked: string[]
  open: string[]; notes: Notes; showGuide: boolean; showWords: boolean
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
  const [resumeScreen, setResumeScreen] = useState<Screen | null>(draft.screen && draft.screen !== 'home' ? draft.screen : null)
  function goHome() {
    if (screen !== 'home') setResumeScreen(screen)
    setScreen('home')
  }
  const [theme, setTheme] = useState<Theme | null>(THEMES.find(item => item.id === draft.themeId) ?? null)
  const [showGuide, setShowGuide] = useState(draft.showGuide ?? true)
  const [notes, setNotes] = useState<Notes>(draft.notes ?? emptyNotes())
  const [showWords, setShowWords] = useState(draft.showWords ?? true)
  const [selectedField, setSelectedField] = useState<Field | null>(draft.field ?? null)
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
      field: selectedField, cards, picked, open, notes, showGuide, showWords }
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(saved)) } catch { /* storage may be unavailable; the app still works */ }
  }, [screen, resumeScreen, theme, selectedField, cards, picked, open, notes, showGuide, showWords])

  const hasProgress = cards.length > 0 || picked.length > 0 || hasNotes(notes)

  function startFresh() {
    setCards([])
    setPicked([])
    setOpen([])
    setSelectedField(null)
    setNotes(emptyNotes())
    setTheme(null)
    setShowGuide(true)
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
        <div className="mandala" aria-hidden="true">
          <svg viewBox="0 0 400 400" fill="none">
            <circle cx="200" cy="200" r="180" />
            <circle cx="200" cy="200" r="166" />
            <circle cx="200" cy="200" r="112" />
            {Array.from({ length: 12 }, (_, i) => (
              <ellipse key={i} cx="200" cy="143" rx="40" ry="103" transform={`rotate(${i * 30} 200 200)`} />
            ))}
            <circle cx="200" cy="200" r="36" />
          </svg>
        </div>
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
      </section> : screen === 'fields' ? <section className="selection field-selection" aria-labelledby="field-choice-title">
        <nav className="selection-nav" aria-label="画面の移動">
          <button className="back-button" type="button" onClick={() => {
            if (selectedField) setScreen('field')
            else setScreen('pick')
          }}>← {selectedField ? '配置に戻る' : '言葉に戻る'}</button>
          <span className="step-label">03 / フィールドを選ぶ</span>
        </nav>
        <h1 ref={heading} tabIndex={-1} id="field-choice-title">どの模様に、置いてみる？</h1>
        <p className="lead">気になる模様をひとつ。</p>
        <p className="hint">どの模様でも、自由に置けます。</p>
        <div className="field-options">
          {fields.map((field, index) => <button key={field} type="button" className="field-option"
            aria-label={`${descriptions[index]}を選ぶ`} aria-pressed={selectedField === field}
            onClick={() => { setSelectedField(field); if (picked.length) placePicked(); setScreen('field') }}>
            <img src={`${import.meta.env.BASE_URL}assets/field-${field}.svg`} alt={descriptions[index]} draggable={false} />
          </button>)}
        </div>
      </section> : screen === 'reflection' ? <Reflection cards={cards} artwork={`${import.meta.env.BASE_URL}assets/field-${selectedField ?? 'triangle'}.svg`} field={selectedField ?? 'triangle'} theme={theme} notes={notes} onNotes={setNotes} showWords={showWords} onShowWords={setShowWords} onBack={() => setScreen('field')} onHome={goHome} /> : screen === 'field' ? <MandalaField field={selectedField ?? 'triangle'} showGuide={showGuide} onShowGuide={setShowGuide} theme={theme} onComplete={() => setScreen('reflection')} artwork={`${import.meta.env.BASE_URL}assets/field-${selectedField ?? 'triangle'}.svg`} onChangeField={() => setScreen('fields')} cards={cards} setCards={setCards} onAdd={() => setScreen('pick')} /> : screen === 'theme' ? <section className="selection" aria-labelledby="theme-title">
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
        doneLabel={cards.length ? '追加する' : '並べる'} onDone={() => {
          if (selectedField) { placePicked(); setScreen('field') } else setScreen('fields')
        }} />}
      <footer><span>曼荼羅palette</span><span>色を選ぶ。言葉を置く。自分を眺める。</span></footer>
    </main>
  )
}
