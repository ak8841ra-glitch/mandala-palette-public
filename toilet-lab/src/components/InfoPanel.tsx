import { forwardRef, useEffect, useState } from 'react'
import { PART_MAP, type PartId } from '../data/parts'
import { Icon } from './Icon'

type Props = { id: PartId; onClose: () => void; onJump: (id: PartId) => void }

export const InfoPanel = forwardRef<HTMLDivElement, Props>(function InfoPanel({ id, onClose, onJump }, ref) {
  const p = PART_MAP[id]
  const [more, setMore] = useState(false)
  useEffect(() => setMore(false), [id])

  return (
    <aside className="panel" data-label-block ref={ref} aria-label={`${p.name}の説明`}>
      <div className="panel-head">
        <span className="chip">{p.group}</span>
        <button className="icon-btn" onClick={onClose} aria-label="説明を閉じる">
          <Icon name="close" />
        </button>
      </div>
      <h2>{p.name}</h2>
      <p className="aka">
        よくある呼び方：{p.aliases.join('・')}
      </p>
      <p className="role">{p.role}</p>

      <h3>つながり</h3>
      <ul className="links">
        {p.links.map((l) => (
          <li key={l.to + l.text}>
            <button onClick={() => onJump(l.to)}>
              <b>{PART_MAP[l.to].name}</b>
              <span>{l.text}</span>
              <Icon name="arrow" />
            </button>
          </li>
        ))}
      </ul>

      <button className="more" onClick={() => setMore(!more)} aria-expanded={more}>
        {more ? '閉じる' : '詳しく'}
        <Icon name={more ? 'up' : 'down'} />
      </button>
      {more && (
        <div className="detail">
          {p.detail.map((d) => (
            <p key={d}>{d}</p>
          ))}
          {p.terms && (
            <dl>
              {p.terms.map((t) => (
                <div key={t.word}>
                  <dt>{t.word}</dt>
                  <dd>{t.meaning}</dd>
                </div>
              ))}
            </dl>
          )}
          {p.inside && <p className="caution">※内部は学習用の透かし表示です。実物の分解・修理をすすめるものではありません。</p>}
        </div>
      )}
    </aside>
  )
})
