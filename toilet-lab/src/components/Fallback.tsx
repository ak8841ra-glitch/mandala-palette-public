import { READY } from '../stages'
import { RefsBody } from './RefsModal'

// WebGL（3D表示）が使えない環境向け：部品一覧と説明を読めるページ
export function Fallback() {
  return (
    <div className="fallback">
      <header>
        <h1>設備のしくみ（部品一覧）</h1>
        <p className="warn">
          この端末・ブラウザでは3D表示（WebGL）が使えないため、部品の一覧と説明を表示しています。
        </p>
        <nav className="fallback-nav">
          {READY.map((st) => (
            <a key={st.key} href={`#stage-${st.key}`}>
              {st.name}
            </a>
          ))}
        </nav>
      </header>
      {READY.map((st) => {
        const byId = Object.fromEntries(st.parts.map((p) => [p.id, p]))
        return (
          <article key={st.key} id={`stage-${st.key}`}>
            <h1>{st.brand}</h1>
            <section className="flow-text">
              <h2>動きの順番（{st.flow.action}）</h2>
              <ol>
                {st.plainFlow.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ol>
            </section>
            {st.groups.map((g) => (
              <section key={g}>
                <h2>{g}</h2>
                {st.parts
                  .filter((p) => p.group === g)
                  .map((p) => (
                    <details key={p.id} id={`${st.key}-${p.id}`}>
                      <summary>
                        <b>{p.name}</b> <span>{p.role}</span>
                      </summary>
                      <p className="aka">よくある呼び方：{p.aliases.join('・')}</p>
                      <h3>つながり</h3>
                      <ul>
                        {p.links.map((l) => (
                          <li key={l.text}>
                            <a href={`#${st.key}-${l.to}`}>{byId[l.to].name}</a>：{l.text}
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
              <RefsBody stage={st} />
            </section>
          </article>
        )
      })}
    </div>
  )
}
