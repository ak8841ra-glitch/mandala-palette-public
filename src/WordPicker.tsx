import { useEffect, useRef, useState } from 'react'
import type { Ref } from 'react'
import { COLORS, FAMILIES, KEYWORDS, keywordsFor } from './palette'
import type { Theme } from './guide'

// The chip previews every shade of the family, like a slice of the color wheel.
const swatch = (key: string) => {
  const shades = FAMILIES.find(family => family.key === key)!.colors.flatMap(color => color.tiers.map(tier => tier.bg))
  return `conic-gradient(${shades.map((bg, i) => `${bg} ${i / shades.length * 360}deg ${(i + 1) / shades.length * 360}deg`).join(', ')})`
}

// White and black are two halves of the wheel's top slot but open one shared family.
const familyOf = (colorKey: string) => colorKey === 'black' ? 'white' : colorKey

export default function WordPicker({ heading, wheel, theme, picked, onPicked, open, onOpen, backLabel, onBack, doneLabel, onDone }: {
  heading: Ref<HTMLHeadingElement>
  wheel: string
  theme: Theme | null
  picked: string[]
  onPicked: (ids: string[]) => void
  open: string[]
  onOpen: (keys: string[]) => void
  backLabel: string
  onBack: () => void
  doneLabel: string
  onDone: () => void
}) {
  const toggleWord = (id: string) => onPicked(picked.includes(id) ? picked.filter(item => item !== id) : [...picked, id])
  // Newly opened colors go to the top, right under the palette, so they appear where the finger is.
  const toggleColor = (key: string) => onOpen(open.includes(key) ? open.filter(item => item !== key) : [key, ...open])
  const count = (key: string) => picked.filter(id => keywordsFor(FAMILIES.find(family => family.key === key)!.colors[0]!).some(keyword => keyword.id === id)).length

  // The wheel is the palette; once it scrolls out of view, a compact copy stays pinned on top.
  const wheelRef = useRef<HTMLDivElement>(null)
  const [wheelVisible, setWheelVisible] = useState(true)
  useEffect(() => {
    const target = wheelRef.current
    if (!target || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setWheelVisible(entry!.isIntersecting), { threshold: .15 })
    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  return <section className="selection picker" aria-labelledby="picker-title">
    <nav className="selection-nav" aria-label="画面の移動">
      <button className="back-button" type="button" onClick={onBack}>← {backLabel}</button>
      <span className="step-label">02 / 色と言葉を選ぶ</span>
    </nav>
    {theme && theme.id !== 'free' && <p className="theme-badge">テーマ：{theme.label}</p>}
    <h1 ref={heading} tabIndex={-1} id="picker-title">気になる色と言葉は？</h1>
    <p className="lead">{theme?.prompt ? `${theme.prompt}、` : ''}色の輪をタップ。</p>
    <p className="hint">いくつ開いても、何枚選んでも大丈夫です。</p>

    <div ref={wheelRef} className="color-wheel" role="group" aria-label="色を開く・閉じる">
      <img src={wheel} width="2000" height="2000" alt="曼荼羅paletteの色の輪。上から時計回りに白・黒、緑、青、紫、ピンク、赤、オレンジ、黄色。" draggable={false} />
      {COLORS.map(item => {
        const key = familyOf(item.key)
        const name = FAMILIES.find(family => family.key === key)!.name
        return <button className={`wheel-hit wheel-hit--${item.key}`} key={item.key} type="button"
          aria-pressed={open.includes(key)} aria-label={`${name}${count(key) ? `（${count(key)}枚選択中）` : ''}`} title={name}
          onClick={() => toggleColor(key)} />
      })}
      {FAMILIES.filter(family => count(family.key) > 0).map(family =>
        <span key={family.key} className={`wheel-count wheel-count--${family.key}`} aria-hidden="true">{count(family.key)}</span>)}
    </div>

    <div className="palette-bar" data-shown={!wheelVisible} role="group" aria-label="色を開く・閉じる（小さなパレット）" aria-hidden={wheelVisible}>
      {FAMILIES.map(family => <button key={family.key} type="button" className="palette-chip" aria-pressed={open.includes(family.key)}
        tabIndex={wheelVisible ? -1 : 0} aria-label={`${family.name}${count(family.key) ? `（${count(family.key)}枚選択中）` : ''}`} onClick={() => toggleColor(family.key)}>
        <span className="palette-swatch" style={{ background: swatch(family.key) }} aria-hidden="true" />
        <span className="palette-name" aria-hidden="true">{family.name}</span>
        {count(family.key) > 0 && <span className="palette-count" aria-hidden="true">{count(family.key)}</span>}
      </button>)}
    </div>

    {open.length === 0 && <p className="hint picker-empty">色の輪をタップすると、言葉が開きます。</p>}
    {open.map(key => {
      const family = FAMILIES.find(item => item.key === key)!
      return <div key={key} className="word-panel">
        <div className="word-panel-head">
          <h2>{family.name}</h2>
          <button type="button" className="back-button" onClick={() => toggleColor(key)} aria-label={`${family.name}を閉じる`}>閉じる</button>
        </div>
        <div className="keyword-grid" role="group" aria-label={`${family.name}の言葉`}>
          {keywordsFor(family.colors[0]!).map(item => (
            <button key={item.id} className="keyword-choice" type="button" aria-pressed={picked.includes(item.id)}
              style={{ background: item.bg, color: item.ink }} onClick={() => toggleWord(item.id)}>
              {item.word}<span className="selection-check" aria-hidden="true">{picked.includes(item.id) ? '✓' : ''}</span>
            </button>
          ))}
        </div>
      </div>
    })}

    <div className="picked-tray" role="region" aria-label="選んだ言葉">
      {picked.length > 0 && <ul className="picked-list">
        {picked.map(id => {
          const keyword = KEYWORDS.get(id)!
          return <li key={id}><button type="button" style={{ background: keyword.bg, color: keyword.ink }}
            aria-label={`「${keyword.word}」を外す`} onClick={() => toggleWord(id)}>{keyword.word}<span aria-hidden="true">×</span></button></li>
        })}
      </ul>}
      <button type="button" className="tray-done" disabled={!picked.length} onClick={onDone}>
        {picked.length ? `${picked.length}枚を${doneLabel}` : '言葉を選んでください'}<span aria-hidden="true">→</span>
      </button>
    </div>
  </section>
}
