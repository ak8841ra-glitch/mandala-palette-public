import { useEffect } from 'react'

export function today(prefix = 'mandala-palette') {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return {
    label: `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`,
    file: `${prefix}-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.png`,
  }
}

export interface Saved { url: string; file: File }

// A real PNG file (not a data: URL) opens reliably on phones and in-app browsers.
export async function saveCanvas(canvas: HTMLCanvasElement, filename: string): Promise<Saved> {
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(result => result ? resolve(result) : reject(new Error('toBlob failed')), 'image/png'))
  const file = new File([blob], filename, { type: 'image/png' })
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url; link.download = filename
  document.body.append(link); link.click(); link.remove()
  return { url, file }
}

export async function loadImage(src: string) {
  const image = new Image()
  image.src = src
  await image.decode()
  return image
}

export function SavedResult({ saved, title }: { saved: Saved; title: string }) {
  useEffect(() => () => URL.revokeObjectURL(saved.url), [saved])
  const canShare = typeof navigator.canShare === 'function' && navigator.canShare({ files: [saved.file] })
  return <div className="saved-result" role="status">
    <p className="lead">保存しました。</p>
    <p className="hint">開けないときは、下の画像を長押し（パソコンは右クリック）で保存できます。</p>
    <img src={saved.url} alt="保存した作品の画像" />
    <div className="saved-actions">
      <a href={saved.url} download={saved.file.name}>もう一度ダウンロード</a>
      {canShare && <button type="button" className="button-quiet" onClick={() => navigator.share({ files: [saved.file], title }).catch(() => {})}>
        写真に保存・共有
      </button>}
    </div>
  </div>
}
