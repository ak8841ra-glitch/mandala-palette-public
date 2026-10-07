import { useId, useMemo, useRef, useState } from 'react'
import type { PartId } from '../data/parts'
import { searchParts } from '../search'
import { Icon } from './Icon'

export function SearchBox({ onChoose }: { onChoose: (id: PartId) => void }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const listId = useId()
  const hits = useMemo(() => searchParts(q), [q])

  const pick = (id: PartId) => {
    onChoose(id)
    setQ('')
    setOpen(false)
    input.current?.blur()
  }

  return (
    <div className="search" data-label-block>
      <Icon name="search" />
      <input
        ref={input}
        value={q}
        placeholder="部品をさがす（例：水を止める）"
        aria-label="部品の名前や言い換えでさがす"
        role="combobox"
        aria-expanded={open && hits.length > 0}
        aria-controls={listId}
        enterKeyHint="search"
        onChange={(e) => {
          setQ(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((a) => Math.min(a + 1, hits.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => Math.max(a - 1, 0))
          } else if (e.key === 'Enter' && hits[active]) {
            pick(hits[active].part.id)
          } else if (e.key === 'Escape') {
            setQ('')
            input.current?.blur()
          }
        }}
      />
      {q && (
        <button className="search-clear" aria-label="入力を消す" onMouseDown={(e) => e.preventDefault()} onClick={() => setQ('')}>
          <Icon name="close" />
        </button>
      )}
      {open && q && (
        <ul className="search-list" id={listId} role="listbox">
          {hits.length === 0 && <li className="empty">見つかりませんでした。別の言い方でためしてね</li>}
          {hits.map((h, i) => (
            <li
              key={h.part.id}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'active' : ''}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(h.part.id)}
              onMouseEnter={() => setActive(i)}
            >
              <b>{h.part.name}</b>
              {h.matched && <span className="alias">「{h.matched}」</span>}
              <small>{h.part.group}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
