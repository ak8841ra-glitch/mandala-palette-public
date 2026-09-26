import { useEffect, useState } from 'react'
import type { PlacedCard } from './MandalaField'

const question = 'この曼荼羅を眺めていると、どんなストーリーが浮かびますか？'
const font = '"Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif'

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

export default function Reflection({ cards, artwork, story, onStory, showWords, onShowWords, onBack }: {
  cards: PlacedCard[]; artwork: string; story: string; onStory: (text: string) => void
  showWords: boolean; onShowWords: (show: boolean) => void; onBack: () => void
}) {
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [download, setDownload] = useState('')

  useEffect(() => {
    let cancelled = false
    setPreview(''); setError(''); setDownload('')
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

  async function save() {
    if (!preview || busy) return
    setBusy(true); setError('')
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      ctx.font = `28px ${font}`
      const paragraphs = lines(ctx, story.trim(), 1080)
      canvas.width = 1320; canvas.height = 1510 + paragraphs.length * 44
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#665774'; ctx.font = `26px ${font}`
      ctx.fillText('曼荼羅palette', 60, 56)
      ctx.drawImage(await loadImage(preview), 60, 90, 1200, 1200)
      ctx.strokeStyle = '#ddd5e3'; ctx.beginPath(); ctx.moveTo(120, 1330); ctx.lineTo(1200, 1330); ctx.stroke()
      ctx.fillStyle = '#665774'; ctx.font = `25px ${font}`
      lines(ctx, question, 1080).forEach((line, i) => ctx.fillText(line, 120, 1385 + i * 36))
      ctx.fillStyle = '#34313c'; ctx.font = `28px ${font}`
      paragraphs.forEach((line, i) => ctx.fillText(line, 120, 1460 + i * 44))
      const url = canvas.toDataURL('image/png')
      setDownload(url)
      const link = document.createElement('a')
      link.href = url; link.download = 'mandala-story.png'; link.click()
    } catch { setError('画像を保存できませんでした。もう一度お試しください。') }
    finally { setBusy(false) }
  }

  return <section className="selection reflection" aria-labelledby="reflection-title">
    <button className="back-button" type="button" onClick={onBack}>← 配置を調整する</button>
    <h1 id="reflection-title" tabIndex={-1}>できあがった、今のあなた。</h1>
    <div className="completed-art" aria-busy={!preview && !error}>
      {preview ? <img src={preview} alt={showWords ? 'キーワードを表示した完成した曼荼羅' : '色と配置だけを表示した完成した曼荼羅'} /> : <p>作品を準備しています…</p>}
    </div>
    <button type="button" aria-pressed={!showWords} onClick={() => onShowWords(!showWords)}>
      {showWords ? 'キーワードを隠す' : 'キーワードを表示する'}
    </button>
    <div className="story-editor">
      <label htmlFor="story">{question}</label>
      <textarea id="story" rows={7} maxLength={2000} value={story} onChange={event => { onStory(event.target.value); setDownload('') }} placeholder="浮かんだことを、あなたの言葉で。" aria-describedby="story-help" />
      <p id="story-help">{story.length} / 2000文字。保存画像には、今のキーワード表示状態が反映されます。</p>
    </div>
    <button type="button" disabled={!preview || !story.trim() || busy} onClick={save}>{busy ? '画像を作っています…' : '曼荼羅とストーリーを画像で保存'}</button>
    <p role="status">{download && <a href={download} download="mandala-story.png">保存画像をダウンロード</a>}</p>
    {error && <p role="alert">{error}</p>}
    <p className="preview-note">入力内容は再読み込みすると消えます。書き終えたら画像で保存してください。</p>
  </section>
}
