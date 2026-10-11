import { useEffect } from 'react'
import type { Stage } from '../stages/types'
import { Icon } from './Icon'

export function RefsBody({ stage }: { stage: Stage }) {
  const { scope, simplifications, sources } = stage.info
  return (
    <>
      <section>
        <h3>この模型について</h3>
        <p>
          この{stage.name}は、<b>代表的な構造を簡略化した学習用模型</b>です。特定メーカーの製品ではなく、実際の機種とは形や部品が異なります。修理や分解の手順を案内するものではありません。
        </p>
        <ul>
          {scope.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3>省略・簡略化した点</h3>
        <ul>
          {simplifications.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3>参考資料</h3>
        <ul className="sources">
          {sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer noopener">
                {s.title}
              </a>
              <small>{s.note}</small>
            </li>
          ))}
        </ul>
        <p className="small">部品の呼び方はメーカーや地域で異なることがあります。</p>
      </section>
    </>
  )
}

export function RefsModal({ stage, onClose }: { stage: Stage; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="参考資料と省略点" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <h2>参考資料・省略点</h2>
          <button className="icon-btn" onClick={onClose} aria-label="閉じる">
            <Icon name="close" />
          </button>
        </div>
        <RefsBody stage={stage} />
      </div>
    </div>
  )
}
