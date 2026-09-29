import { useEffect, useState } from 'react'
import type { PlacedCard } from './MandalaField'
import { QUESTIONS, TRIANGLE_SPOTS, fullQuestion } from './guide'
import type { Field, Notes, Theme } from './guide'

const font = '"Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif'
const serif = '"Yu Mincho", "Hiragino Mincho ProN", serif'

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

async function loadImage(src: string) {
  const image = new Image()
  image.src = src
  await image.decode()
  return image
}

function today() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return {
    label: `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`,
    file: `mandala-palette-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.png`,
  }
}

// A real PNG file (not a data: URL) opens reliably on phones and in-app browsers.
const toBlob = (canvas: HTMLCanvasElement) => new Promise<Blob>((resolve, reject) =>
  canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/png'))

// Cards whose center sits near a triangle vertex count as placed in that spot.
function wordsAt(cards: PlacedCard[], spot: typeof TRIANGLE_SPOTS[number]) {
  return cards.filter(card => Math.hypot(card.x - spot.x, card.y - spot.y) < .16).map(card => card.word)
}

export default function Reflection({ cards, artwork, field, theme, notes, onNotes, showWords, onShowWords, onBack, onHome }: {
  cards: PlacedCard[]; artwork: string; field: Field; theme: Theme | null; notes: Notes; onNotes: (notes: Notes) => void
  showWords: boolean; onShowWords: (show: boolean) => void; onBack: () => void; onHome: () => void
}) {
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState<{ url: string; file: File } | null>(null)

  useEffect(() => {
    let cancelled = false
    setPreview(''); setError('')
    async function render() {
      await document.fonts.ready
      const art = await loadImage(artwork)
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 1200
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 1200, 1200)
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
  useEffect(() => () => { if (saved) URL.revokeObjectURL(saved.url) }, [saved])
  useEffect(() => { setSaved(null) }, [notes, preview])

  const questions = QUESTIONS.filter(question => !question.field || question.field === field)
  const answered = questions.filter(question => notes.questionIds.includes(question.id) && notes.answers[question.id]?.trim())

  function toggleQuestion(id: string) {
    const questionIds = notes.questionIds.includes(id)
      ? notes.questionIds.filter(item => item !== id)
      : questions.map(question => question.id).filter(item => item === id || notes.questionIds.includes(item))
    onNotes({ ...notes, questionIds })
  }

  async function save() {
    if (!preview || busy) return
    setBusy(true); setError('')
    try {
      const date = today()
      const measure = document.createElement('canvas').getContext('2d')!
      measure.font = `44px ${serif}`
      const titleLines = notes.title.trim() ? lines(measure, notes.title.trim(), 1200) : []
      measure.font = `25px ${font}`
      const spots = field === 'triangle' ? [{
        asked: ['三角形の3つの場所'],
        answer: TRIANGLE_SPOTS.map(spot => {
          const words = wordsAt(cards, spot)
          return `${spot.number} ${spot.name}${words.length ? `：${words.join('、')}` : ''}`
        }).flatMap(line => { measure.font = `28px ${font}`; return lines(measure, line, 1080) }),
      }] : []
      const blocks = [...spots, ...answered.map(question => {
        measure.font = `25px ${font}`
        const asked = lines(measure, fullQuestion(question), 1080)
        measure.font = `28px ${font}`
        return { asked, answer: lines(measure, notes.answers[question.id]!.trim(), 1080) }
      })]
      const artTop = 100 + titleLines.length * 60 + (titleLines.length ? 20 : 0)
      const textTop = artTop + 1200 + 40
      const textHeight = (theme && theme.id !== 'free' ? 50 : 0)
        + blocks.reduce((sum, block) => sum + block.asked.length * 36 + 16 + block.answer.length * 44 + 36, 0)
      const canvas = document.createElement('canvas')
      canvas.width = 1320; canvas.height = textTop + (textHeight ? textHeight + 40 : 20)
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#665774'; ctx.font = `26px ${font}`
      ctx.fillText('曼荼羅palette', 60, 56)
      ctx.textAlign = 'right'; ctx.fillText(date.label, 1260, 56); ctx.textAlign = 'left'
      ctx.fillStyle = '#34313c'; ctx.font = `44px ${serif}`
      titleLines.forEach((line, i) => ctx.fillText(line, 60, 130 + i * 60))
      ctx.drawImage(await loadImage(preview), 60, artTop, 1200, 1200)
      let y = textTop
      if (textHeight) { ctx.strokeStyle = '#ddd5e3'; ctx.beginPath(); ctx.moveTo(120, y); ctx.lineTo(1200, y); ctx.stroke() }
      y += 55
      if (theme && theme.id !== 'free') {
        ctx.fillStyle = '#665774'; ctx.font = `25px ${font}`; ctx.fillText(`テーマ：${theme.label}`, 120, y); y += 50
      }
      for (const block of blocks) {
        ctx.fillStyle = '#665774'; ctx.font = `25px ${font}`
        block.asked.forEach(line => { ctx.fillText(line, 120, y); y += 36 })
        y += 16
        ctx.fillStyle = '#34313c'; ctx.font = `28px ${font}`
        block.answer.forEach(line => { ctx.fillText(line, 120, y); y += 44 })
        y += 36
      }
      const file = new File([await toBlob(canvas)], date.file, { type: 'image/png' })
      const url = URL.createObjectURL(file)
      setSaved({ url, file })
      const link = document.createElement('a')
      link.href = url; link.download = date.file
      document.body.append(link); link.click(); link.remove()
    } catch { setError('画像を保存できませんでした。もう一度お試しください。') }
    finally { setBusy(false) }
  }

  const canShare = saved && typeof navigator.canShare === 'function' && navigator.canShare({ files: [saved.file] })

  return <section className="selection reflection" aria-labelledby="reflection-title">
    <button className="back-button" type="button" onClick={onBack}>← 配置を調整する</button>
    <h1 id="reflection-title" tabIndex={-1}>できあがった、今のあなた。</h1>
    {theme && theme.id !== 'free' && <p className="theme-badge">テーマ：{theme.label}</p>}
    <div className="completed-art" aria-busy={!preview && !error}>
      {preview ? <img src={preview} alt={showWords ? 'キーワードを表示した完成した曼荼羅' : '色と配置だけを表示した完成した曼荼羅'} /> : <p>作品を準備しています…</p>}
    </div>
    <button type="button" aria-pressed={!showWords} onClick={() => onShowWords(!showWords)}>
      {showWords ? 'キーワードを隠す' : 'キーワードを表示する'}
    </button>

    {field === 'triangle' && <div className="spot-meanings">
      <h2>三角形の3つの場所</h2>
      <p className="lead">{theme && theme.id !== 'free' ? `「${theme.label}」に重ねて` : 'こんな見方も'}、眺めてみると…</p>
      <p className="hint">何の姿として見るかは、あなた次第。当てはまらなくても大丈夫です。</p>
      <ul>
        {TRIANGLE_SPOTS.map(spot => {
          const words = wordsAt(cards, spot)
          return <li key={spot.number}>
            <span className="spot-number" aria-hidden="true">{spot.number}</span>
            <span><strong>{spot.name}</strong><small>{spot.where}・{spot.note}</small>
              {words.length > 0 && <span className="spot-words">{words.join('、')}</span>}</span>
          </li>
        })}
      </ul>
    </div>}

    <div className="story-editor">
      <h2>眺めて、問いかけてみる</h2>
      <p className="lead">気になる問いだけ、選んでみる。</p>
      <p className="hint">ひと言でも、答えずに眺めるだけでも大丈夫です。</p>
      <div className="question-choices" role="group" aria-label="答える問いを選ぶ">
        {questions.map(question => <button key={question.id} type="button" aria-pressed={notes.questionIds.includes(question.id)}
          onClick={() => toggleQuestion(question.id)}>
          <span aria-hidden="true">{notes.questionIds.includes(question.id) ? '✓' : '＋'}</span>{question.text}
        </button>)}
      </div>
      {questions.filter(question => notes.questionIds.includes(question.id)).map(question => <div className="answer" key={question.id}>
        <label htmlFor={`answer-${question.id}`}>{question.text}{question.sub && <small>{question.sub}</small>}</label>
        <textarea id={`answer-${question.id}`} rows={question.id === 'story' ? 6 : 3} maxLength={2000}
          value={notes.answers[question.id] ?? ''} placeholder="浮かんだことを、そのままに。"
          onChange={event => onNotes({ ...notes, answers: { ...notes.answers, [question.id]: event.target.value } })} />
      </div>)}
      <div className="answer">
        <label htmlFor="art-title">タイトルをつけるなら？<small>なくても大丈夫です</small></label>
        <input id="art-title" maxLength={30} value={notes.title} placeholder="たとえば「静かな朝の決意」"
          onChange={event => onNotes({ ...notes, title: event.target.value })} />
      </div>
      <p className="hint">保存画像には、タイトル・答え・今のキーワード表示が入ります。</p>
    </div>

    <button type="button" disabled={!preview || busy} onClick={save}>{busy ? '画像を作っています…' : '作品を画像で保存'}</button>
    {saved && <div className="saved-result" role="status">
      <p className="lead">保存しました。</p>
      <p className="hint">開けないときは、下の画像を長押し（パソコンは右クリック）で保存できます。</p>
      <img src={saved.url} alt="保存した作品の画像" />
      <div className="saved-actions">
        <a href={saved.url} download={saved.file.name}>もう一度ダウンロード</a>
        {canShare && <button type="button" onClick={() => navigator.share({ files: [saved.file], title: notes.title.trim() || '曼荼羅palette' }).catch(() => {})}>
          写真に保存・共有
        </button>}
      </div>
    </div>}
    <div className="return-home-action"><button type="button" onClick={onHome}>トップへ戻る</button></div>
    {error && <p role="alert">{error}</p>}
    <p className="hint">再読み込みすると消えます。残したいときは画像で保存を。</p>
  </section>
}
