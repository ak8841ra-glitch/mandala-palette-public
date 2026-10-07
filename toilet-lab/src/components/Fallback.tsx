import { PARTS, PART_MAP } from '../data/parts'
import { RefsBody } from './RefsModal'

const GROUPS = ['便器まわり', 'タンクの外側', 'タンクの中', '給水（きれいな水）', '排水（流したあとの水）'] as const

// WebGL（3D表示）が使えない環境向け：部品一覧と説明を読めるページ
export function Fallback() {
  return (
    <div className="fallback">
      <header>
        <h1>トイレのしくみ（部品一覧）</h1>
        <p className="warn">
          この端末・ブラウザでは3D表示（WebGL）が使えないため、部品の一覧と説明を表示しています。
        </p>
      </header>
      <section className="flow-text">
        <h2>水の流れ（かんたんな順番）</h2>
        <ol>
          <li>洗浄レバーを回すと、鎖がフロートバルブを引き上げる</li>
          <li>タンクの水が便器のフチから流れ込む</li>
          <li>水と汚れが排水トラップを越えて、床下の排水管へ</li>
          <li>水位と一緒に浮き球が下がり、ボールタップが開いて給水</li>
          <li>給水の一部は補助水管→オーバーフロー管→便器へ。封水が元に戻る</li>
          <li>浮き球が上がりきると給水が止まる</li>
        </ol>
      </section>
      {GROUPS.map((g) => (
        <section key={g}>
          <h2>{g}</h2>
          {PARTS.filter((p) => p.group === g).map((p) => (
            <details key={p.id} id={p.id}>
              <summary>
                <b>{p.name}</b> <span>{p.role}</span>
              </summary>
              <p className="aka">よくある呼び方：{p.aliases.join('・')}</p>
              <h3>つながり</h3>
              <ul>
                {p.links.map((l) => (
                  <li key={l.text}>
                    <a href={`#${l.to}`}>{PART_MAP[l.to].name}</a>：{l.text}
                  </li>
                ))}
              </ul>
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
            </details>
          ))}
        </section>
      ))}
      <section className="refs">
        <RefsBody />
      </section>
    </div>
  )
}
