import { useEffect } from 'react'
import { MODEL_SCOPE, SIMPLIFICATIONS, SOURCES } from '../data/info'
import { Icon } from './Icon'

export function RefsBody() {
  return (
    <>
      <section>
        <h3>この模型について</h3>
        <p>
          一般的な床置き・タンク式トイレの<b>代表的な構造を簡略化した学習用模型</b>です。特定メーカーの製品ではなく、実際の機種とは形や部品が異なります。修理や分解の手順を案内するものではありません。
        </p>
        <ul>
          {MODEL_SCOPE.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3>省略・簡略化した点</h3>
        <ul>
          {SIMPLIFICATIONS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3>参考資料</h3>
        <ul className="sources">
          {SOURCES.map((s) => (
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

export function RefsModal({ onClose }: { onClose: () => void }) {
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
        <RefsBody />
      </div>
    </div>
  )
}
