import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { PlacedCard } from './MandalaField'
import { AREAS, REACTIONS, TRIANGLE_SPOTS, hitokoto, placeOf } from './guide'
import type { Guide, Notes, Reaction, ReactionKey, Theme } from './guide'
import { SavedResult, loadImage, saveCanvas, today } from './save'
import type { Saved } from './save'
import Steps from './Steps'

// Match the site fonts and the ivory / charcoal palette in style.css.
const font = '"Zen Kaku Gothic New", "Hiragino Sans", "Yu Gothic", sans-serif'
const serif = '"Zen Old Mincho", "Yu Mincho", "Hiragino Mincho ProN", serif'
// Card diameters as a share of the field, matching MandalaField.
const DIAMETER = { small: .20, medium: .28, large: .36 } as const
const PAPER = '#FFFDF8', INK = '#3A3639', INK_SOFT = '#6E6868', LINE = '#E6DED2'

function lines(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const result: string[] = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const char of Array.from(paragraph)) {
      if (line && ctx.measureText(line + char).width > width) { result.push(line); line = '' }
      line += char
    }
    result.push(line)
  }
  return result
}

// Cards whose center sits near a triangle vertex count as placed in that spot.
function wordsAt(cards: PlacedCard[], spot: typeof TRIANGLE_SPOTS[number]) {
  return cards.filter(card => Math.hypot(card.x - spot.x, card.y - spot.y) < .16).map(card => card.word)
}

export default function Reflection({ cards, artwork, guide, theme, notes, onNotes, showWords, onShowWords, onBack, onHome, onMake }: {
  cards: PlacedCard[]; artwork: string; guide: Guide; theme: Theme | null; notes: Notes; onNotes: (notes: Notes) => void
  showWords: boolean; onShowWords: (show: boolean) => void; onBack: () => void; onHome: () => void; onMake: () => void
}) {
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState<Saved | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setPreview(''); setError('')
    async function render() {
      await document.fonts.ready
      const art = await loadImage(artwork)
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 1200
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = PAPER; ctx.fillRect(0, 0, 1200, 1200)
      ctx.drawImage(art, 0, 0, 1200, 1200)
      for (const card of [...cards].sort((a, b) => a.z - b.z)) {
        const diameter = { small: 240, medium: 336, large: 432 }[card.size ?? 'medium']
        const x = card.x * 1200, y = card.y * 1200
        ctx.save()
        ctx.shadowColor = '#00000030'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4
        ctx.fillStyle = card.bg; ctx.beginPath(); ctx.arc(x, y, diameter / 2, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
        if (showWords) {
          const size = { small: 29, medium: 36, large: 43 }[card.size ?? 'medium']
          ctx.font = `${size}px ${font}`; ctx.fillStyle = card.ink
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          const wrapped = lines(ctx, card.word, diameter * .72)
          wrapped.forEach((line, i) => ctx.fillText(line, x, y + (i - (wrapped.length - 1) / 2) * size * 1.3))
        }
      }
      if (!cancelled) setPreview(canvas.toDataURL('image/png'))
    }
    render().catch(() => { if (!cancelled) setError('作品を表示できませんでした。配置に戻って、もう一度お試しください。') })
    return () => { cancelled = true }
  }, [cards, artwork, showWords])

  // Any edit makes the previously saved image stale.
  useEffect(() => { setSaved(null) }, [notes, preview])

  const reactions = notes.reactions ?? {}
  const focused = cards.find(card => card.instanceId === focusId)
  const focusedReaction: Reaction = focused ? reactions[focused.instanceId] ?? {} : {}
  // Today's lines: one for each card that got at least one tap, in the order they were placed.
  const todayLines = cards.filter(card => Object.keys(reactions[card.instanceId] ?? {}).length)
    .map(card => hitokoto(card.word, placeOf(guide, card), reactions[card.instanceId]!))
  const memo = notes.answers.memo ?? ''

  function react(key: ReactionKey, id: string) {
    if (!focused) return
    const next = { ...focusedReaction, [key]: focusedReaction[key] === id ? undefined : id }
    for (const k of Object.keys(next) as ReactionKey[]) if (!next[k]) delete next[k]
    const all = { ...reactions, [focused.instanceId]: next }
    if (!Object.keys(next).length) delete all[focused.instanceId]
    onNotes({ ...notes, reactions: all })
  }

  // Under the guide-free field, the center label moves aside when a card already sits there.
  const areas = (AREAS[guide] ?? []).map(area => area.name === 'まん中' && cards.some(card => Math.hypot(card.x - .5, card.y - .5) < .3) ? { ...area, y: .95 } : area)
  // Each row appears once the row above has been touched.
  const shownRows = REACTIONS.filter((_, i) => i === 0 || REACTIONS.slice(0, i).every(row => focusedReaction[row.key]))
  const done = REACTIONS.every(row => focusedReaction[row.key])

  async function save() {
    if (!preview || busy) return
    setBusy(true); setError('')
    try {
      const date = today()
      const measure = document.createElement('canvas').getContext('2d')!
      measure.font = `44px ${serif}`
      const titleLines = notes.title.trim() ? lines(measure, notes.title.trim(), 1200) : []
      measure.font = `25px ${font}`
      const spots = guide === 'triangle' ? [{
        asked: ['三角形の3つの場所'],
        answer: TRIANGLE_SPOTS.map(spot => {
          const words = wordsAt(cards, spot)
          return `${spot.number} ${spot.name}${words.length ? `：${words.join('、')}` : ''}`
        }).flatMap(line => { measure.font = `28px ${font}`; return lines(measure, line, 1080) }),
      }] : []
      measure.font = `28px ${font}`
      const blocks = [...spots,
        ...todayLines.length ? [{ asked: ['今日のひとこと'], answer: todayLines.flatMap(line => lines(measure, line, 1080)) }] : [],
        ...memo.trim() ? [{ asked: ['メモ'], answer: lines(measure, memo.trim(), 1080) }] : []]
      const artTop = 100 + titleLines.length * 60 + (titleLines.length ? 20 : 0)
      const textTop = artTop + 1200 + 40
      const textHeight = (theme && theme.id !== 'free' ? 50 : 0)
        + blocks.reduce((sum, block) => sum + block.asked.length * 36 + 16 + block.answer.length * 44 + 36, 0)
      const canvas = document.createElement('canvas')
      canvas.width = 1320; canvas.height = textTop + (textHeight ? textHeight + 40 : 20)
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = PAPER; ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = INK_SOFT; ctx.font = `26px ${font}`
      ctx.fillText('曼荼羅palette', 60, 56)
      ctx.textAlign = 'right'; ctx.fillText(date.label, 1260, 56); ctx.textAlign = 'left'
      ctx.fillStyle = INK; ctx.font = `44px ${serif}`
      titleLines.forEach((line, i) => ctx.fillText(line, 60, 130 + i * 60))
      ctx.drawImage(await loadImage(preview), 60, artTop, 1200, 1200)
      let y = textTop
      if (textHeight) { ctx.strokeStyle = LINE; ctx.beginPath(); ctx.moveTo(120, y); ctx.lineTo(1200, y); ctx.stroke() }
      y += 55
      if (theme && theme.id !== 'free') {
        ctx.fillStyle = INK_SOFT; ctx.font = `25px ${font}`; ctx.fillText(`テーマ：${theme.label}`, 120, y); y += 50
      }
      for (const block of blocks) {
        ctx.fillStyle = INK_SOFT; ctx.font = `25px ${font}`
        block.asked.forEach(line => { ctx.fillText(line, 120, y); y += 36 })
        y += 16
        ctx.fillStyle = INK; ctx.font = `28px ${font}`
        block.answer.forEach(line => { ctx.fillText(line, 120, y); y += 44 })
        y += 36
      }
      setSaved(await saveCanvas(canvas, date.file))
    } catch { setError('画像を保存できませんでした。もう一度お試しください。') }
    finally { setBusy(false) }
  }

  return <section className="selection reflection" aria-labelledby="reflection-title">
    <nav className="selection-nav" aria-label="画面の移動">
      <button className="back-button" type="button" onClick={onBack}>← 配置を調整する</button>
      <Steps at={4} />
    </nav>
    <h1 id="reflection-title" tabIndex={-1}>できあがった、今日のpalette。</h1>
    {theme && theme.id !== 'free' && <p className="theme-badge">テーマ：{theme.label}</p>}
    {/* The artwork comes first; the guide's names rest lightly on it, and the rest follows a moment later.
        Tapping a card brings it forward and lets the others fade, like a finger pointing at it in a session. */}
    <div className={`completed-art${focusId || todayLines.length ? '' : ' is-inviting'}`} aria-busy={!preview && !error}>
      {preview ? <img src={preview} alt={showWords ? 'キーワードを表示した完成した曼荼羅' : '色と配置だけを表示した完成した曼荼羅'} /> : <p>作品を準備しています…</p>}
      {preview && focused && <span className="focus-veil" aria-hidden="true"
        style={{ '--x': `${focused.x * 100}%`, '--y': `${focused.y * 100}%`, '--r': DIAMETER[focused.size ?? 'medium'] * 50 } as CSSProperties} />}
      {preview && guide === 'triangle' && TRIANGLE_SPOTS.map(spot => <span key={spot.number} className="spot-name"
        style={{ left: `${spot.x * 100}%`, top: `${(spot.y > .5 ? spot.y + .15 : spot.y - .15) * 100}%` }}>
        {spot.number} {spot.name}
      </span>)}
      {preview && areas.map(area => <span key={area.name} className="spot-name" style={{ left: `${area.x * 100}%`, top: `${area.y * 100}%` }}>
        {area.name}{area.note && <small>：{area.note}</small>}
      </span>)}
      {preview && [...cards].sort((a, b) => a.z - b.z).map(card => {
        const size = DIAMETER[card.size ?? 'medium'] * 100
        return <button key={card.instanceId} type="button" className="card-hit" aria-pressed={card.instanceId === focusId}
          aria-label={`「${card.word}」を見る`} style={{ left: `${card.x * 100}%`, top: `${card.y * 100}%`, width: `${size}%` }}
          onClick={() => setFocusId(card.instanceId === focusId ? null : card.instanceId)} />
      })}
    </div>
    <div className="after-art">
    <button type="button" className="back-button words-toggle" aria-pressed={!showWords} onClick={() => onShowWords(!showWords)}>
      {showWords ? 'キーワードを隠す' : 'キーワードを表示する'}
    </button>
    <div className="focus" aria-live="polite">
      <p className="focus-ask">{!focused ? 'どれが気になる？' : done ? 'ほかに気になるのは？' : `「${focused.word}」は、どう？`}</p>
      {focused && shownRows.map(row => <div key={row.key} className="reaction-row" role="group">
        {row.options.map(option => <button key={option.id} type="button" aria-pressed={focusedReaction[row.key] === option.id}
          onClick={() => react(row.key, option.id)}>{option.label}</button>)}
      </div>)}
    </div>
    {todayLines.length > 0 && <div className="hitokoto">
      <h2>今日のひとこと</h2>
      {todayLines.map(line => <p key={line}>{line}</p>)}
    </div>}

    <div className="story-editor">
      <details className="more-questions" open={Boolean(memo)}>
        <summary>ひとこと書く</summary>
        <div className="answer">
          <textarea id="memo" aria-label="ひとこと" rows={3} maxLength={2000} value={memo} placeholder="浮かんだことを、そのままに。"
            onChange={event => onNotes({ ...notes, answers: { ...notes.answers, memo: event.target.value } })} />
        </div>
      </details>
      <div className="answer">
        <label htmlFor="art-title">タイトルをつけるなら？</label>
        <input id="art-title" maxLength={30} value={notes.title} placeholder="たとえば「静かな朝の決意」"
          onChange={event => onNotes({ ...notes, title: event.target.value })} />
      </div>
    </div>
    <button type="button" className="button-primary" disabled={!preview || busy} onClick={save}>{busy ? '画像を作っています…' : '作品を画像で保存'}</button>
    {saved && <SavedResult saved={saved} title={notes.title.trim() || '曼荼羅palette'} />}
    <div className="next-step"><button type="button" className="button-quiet" onClick={onMake}>この色で曼荼羅をつくる<span aria-hidden="true">→</span></button></div>
    <div className="return-home-action"><button type="button" className="back-button" onClick={onHome}>トップへ戻る</button></div>
    </div>
    {error && <p role="alert">{error}</p>}
  </section>
}
