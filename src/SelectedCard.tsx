import { useEffect, useRef, useState } from 'react'
import type { Keyword } from './palette'

export default function SelectedCard({ keyword, originalWord, onChange, onPlace }: {
  keyword: Keyword
  originalWord: string
  onChange: (keyword: Keyword) => void
  onPlace: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(keyword.word)
  const input = useRef<HTMLInputElement>(null)
  const card = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (editing) { input.current?.focus(); input.current?.select() }
  }, [editing])

  function finish() {
    setEditing(false)
    card.current?.focus()
  }

  return <>
    <p>選んだ言葉</p>
    <button ref={card} className="selected-card" type="button"
      style={{ background: keyword.bg, color: keyword.ink }}
      aria-label={`「${keyword.word}」を書き換える`} aria-expanded={editing}
      onClick={() => { setDraft(keyword.word); setEditing(true) }}>
      {keyword.word}
    </button>
    {editing ? <form className="word-editor" onSubmit={event => {
      event.preventDefault()
      if (!draft.trim()) return
      onChange({ ...keyword, word: draft.trim() })
      finish()
    }}>
      <label htmlFor="card-word">カードに書く言葉</label>
      <input ref={input} id="card-word" value={draft} maxLength={20}
        aria-describedby="word-help" onChange={event => setDraft(event.target.value)}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing) {
            if (event.key === 'Enter') event.preventDefault()
            return
          }
          if (event.key === 'Escape') { event.preventDefault(); finish() }
        }} />
      <p id="word-help">20文字まで。空欄では確定できません。</p>
      <div className="editor-actions">
        <button type="submit" disabled={!draft.trim()}>この言葉にする</button>
        <button type="button" onClick={finish}>キャンセル</button>
      </div>
    </form> : <p>丸いカードを押すと、自分の言葉に書き換えられます。</p>}
    {keyword.word !== originalWord && <button className="restore-word" type="button" onClick={() => {
      onChange({ ...keyword, word: originalWord })
      setDraft(originalWord)
      finish()
    }}>元の「{originalWord}」に戻す</button>}
    {!editing && <div className="place-action"><button type="button" onClick={onPlace}>このカードを置く <span aria-hidden="true">→</span></button></div>}
  </>
}
