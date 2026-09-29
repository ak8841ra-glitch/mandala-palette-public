import { useEffect, useRef, useState } from 'react'
import { COLORS, keywordsFor } from './palette'
import type { Keyword, PaletteColor } from './palette'
import SelectedCard from './SelectedCard'
import MandalaField from './MandalaField'
import Reflection from './Reflection'
import type { PlacedCard } from './MandalaField'
import { FIELDS as fields, THEMES, emptyNotes } from './guide'
import type { Field, Notes, Theme } from './guide'

const descriptions = ['小花が三角形に広がる模様', '小花が横一列に続く模様', '小花が円状に広がる模様']

const hasNotes = (notes: Notes) => Boolean(notes.title.trim() || Object.values(notes.answers).some(answer => answer.trim()))

export default function App() {
  const [screen, setScreen] = useState<'home' | 'theme' | 'colors' | 'keywords' | 'fields' | 'field' | 'reflection'>('home')
  const resumeScreen = useRef<typeof screen | null>(null)
  function goHome() {
    if (screen !== 'home') resumeScreen.current = screen
    setScreen('home')
  }
  const [theme, setTheme] = useState<Theme | null>(null)
  const [showGuide, setShowGuide] = useState(true)
  const [notes, setNotes] = useState<Notes>(emptyNotes)
  const [showWords, setShowWords] = useState(true)
  const [selectedField, setSelectedField] = useState<Field | null>(null)
  const [cards, setCards] = useState<PlacedCard[]>([])
  const [color, setColor] = useState<PaletteColor | null>(null)
  const [keyword, setKeyword] = useState<Keyword | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const initialRender = useRef(true)

  useEffect(() => {
    if (initialRender.current) { initialRender.current = false; return }
    heading.current?.focus({ preventScroll: true })
    if (screen === 'field') document.getElementById('field-title')?.focus({ preventScroll: true })
    if (screen === 'reflection') document.getElementById('reflection-title')?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [screen])

  function startFresh() {
    if ((cards.length > 0 || color || keyword || hasNotes(notes)) && !window.confirm('今の作品と入力した文章を消して、はじめから作りますか？残したい作品は、先に「つづきから」で戻って画像保存してください。')) return
    setCards([])
    setColor(null)
    setKeyword(null)
    setSelectedField(null)
    setNotes(emptyNotes())
    setTheme(null)
    setShowGuide(true)
    setShowWords(true)
    resumeScreen.current = null
    setScreen('theme')
  }

  function selectColor(nextColor: PaletteColor) {
    if (color?.key !== nextColor.key) setKeyword(null)
    setColor(nextColor)
    setScreen('keywords')
  }

  function placeCard() {
    if (!keyword || !color) return
    const instanceId = crypto.randomUUID()
    setCards(previous => [...previous, {
      ...keyword, instanceId, colorId: color.key, colorName: color.name,
      x: .42 + (previous.length % 4) * .05, y: .42 + (previous.length % 4) * .05,
      z: Math.max(0, ...previous.map(card => card.z)) + 1,
    }])
    setScreen(selectedField ? 'field' : 'fields')
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
        <div className="home-actions">
          <button type="button" onClick={startFresh}>はじめから<span aria-hidden="true">↗</span></button>
          {resumeScreen.current && <button type="button" onClick={() => setScreen(resumeScreen.current ?? 'colors')}>
            つづきから<span aria-hidden="true">→</span>
          </button>}
        </div>
      </section> : screen === 'fields' ? <section className="selection field-selection" aria-labelledby="field-choice-title">
        <nav className="selection-nav" aria-label="画面の移動">
          <button className="back-button" type="button" onClick={() => {
            if (selectedField) setScreen('field')
            else { setCards(previous => previous.slice(0, -1)); setScreen('keywords') }
          }}>← {selectedField ? '配置に戻る' : 'カードに戻る'}</button>
          <span className="step-label">04 / フィールドを選ぶ</span>
        </nav>
        <h1 ref={heading} tabIndex={-1} id="field-choice-title">どの模様に、置いてみる？</h1>
        <p className="lead">気になる模様をひとつ。</p>
        <p className="hint">どの模様でも、自由に置けます。</p>
        <div className="field-options">
          {fields.map((field, index) => <button key={field} type="button" className="field-option"
            aria-label={`${descriptions[index]}を選ぶ`} aria-pressed={selectedField === field}
            onClick={() => { setSelectedField(field); setScreen('field') }}>
            <img src={`${import.meta.env.BASE_URL}assets/field-${field}.svg`} alt={descriptions[index]} draggable={false} />
          </button>)}
        </div>
      </section> : screen === 'reflection' ? <Reflection cards={cards} artwork={`${import.meta.env.BASE_URL}assets/field-${selectedField ?? 'triangle'}.svg`} field={selectedField ?? 'triangle'} theme={theme} notes={notes} onNotes={setNotes} showWords={showWords} onShowWords={setShowWords} onBack={() => setScreen('field')} onHome={goHome} /> : screen === 'field' ? <MandalaField field={selectedField ?? 'triangle'} showGuide={showGuide} onShowGuide={setShowGuide} theme={theme} onComplete={() => setScreen('reflection')} artwork={`${import.meta.env.BASE_URL}assets/field-${selectedField ?? 'triangle'}.svg`} onChangeField={() => setScreen('fields')} cards={cards} setCards={setCards} onAdd={() => {
        setColor(null); setKeyword(null); setScreen('colors')
      }} /> : screen === 'theme' ? <section className="selection" aria-labelledby="theme-title">
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
            onClick={() => { setTheme(item); setScreen(cards.length ? 'field' : 'colors') }}>
            {item.label}
          </button>)}
        </div>
      </section> : <section className="selection" aria-labelledby="selection-title">
        <nav className="selection-nav" aria-label="画面の移動">
          <button className="back-button" type="button" onClick={() => setScreen(screen === 'colors' ? (cards.length ? 'field' : 'theme') : 'colors')}>
            ← {screen === 'colors' ? (cards.length ? '配置に戻る' : 'テーマを選び直す') : '色を選び直す'}
          </button>
          <span className="step-label">{screen === 'colors' ? '02 / 色を選ぶ' : '03 / 言葉を選ぶ'}</span>
        </nav>
        <p className="eyebrow">{screen === 'colors' ? 'CHOOSE YOUR COLOR' : 'FIND YOUR WORD'}</p>
        {theme && theme.id !== 'free' && <p className="theme-badge">テーマ：{theme.label}</p>}
        <h1 ref={heading} tabIndex={-1} id="selection-title">
          {screen === 'colors' ? '今、気になる色は？' : '今、心にとまる言葉は？'}
        </h1>
        <p className="lead">{screen === 'colors' ? `${theme?.prompt ? `${theme.prompt}、` : ''}直感でひとつ。` : '気になる言葉をひとつ。'}</p>
        {screen === 'colors' ? (
          <div className="color-wheel" role="group" aria-label="色を1つ選ぶ">
            <img src={`${import.meta.env.BASE_URL}assets/color-wheel.png`} width="2000" height="2000" alt="曼荼羅paletteの色の輪。上から時計回りに白・黒、緑、青、紫、ピンク、赤、オレンジ、黄色。" draggable={false} />
            {COLORS.map(item => (
              <button className={`wheel-hit wheel-hit--${item.key}`} key={item.key} type="button"
                aria-label={item.name} title={item.name}
                onClick={() => selectColor(item)} />
            ))}
          </div>
        ) : color && (
          <>
            <p className="chosen-color">選んだ色：{color.name}</p>
            <div className="keyword-grid" role="group" aria-label={`${color.name}のキーワードを1つ選ぶ`}>
              {keywordsFor(color).map(item => (
                <button key={item.id} className="keyword-choice" type="button" aria-pressed={keyword?.id === item.id}
                  style={{ background: item.bg, color: item.ink }} onClick={() => setKeyword(item)}>
                  {item.word}<span className="selection-check" aria-hidden="true">{keyword?.id === item.id ? '✓' : ''}</span>
                </button>
              ))}
            </div>
            <div className="selection-summary">
              {keyword ? <SelectedCard key={keyword.id} keyword={keyword}
                originalWord={keywordsFor(color).find(item => item.id === keyword.id)!.word}
                onChange={setKeyword} onPlace={placeCard} /> : <p className="hint">選んだ言葉が、ここに表示されます。</p>}
            </div>
          </>
        )}
      </section>}
      <footer><span>曼荼羅palette</span><span>色を選ぶ。言葉を置く。自分を眺める。</span></footer>
    </main>
  )
}
