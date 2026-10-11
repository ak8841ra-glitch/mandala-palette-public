import type { PartId, Stage } from '../stages/types'
import { STAGES, nextStage } from '../stages'
import { Icon } from './Icon'

export type Game = {
  part: PartId
  status: 'find' | 'holding' | 'wrong' | 'returning' | 'flushing' | 'cleared'
  near?: PartId | null
  misses: number
}

export function GameCard({
  cardRef,
  stage,
  game,
  onAgain,
  onNext,
  onStages,
}: {
  cardRef: React.RefObject<HTMLDivElement | null>
  stage: Stage
  game: Game
  onAgain: () => void
  onNext: (key: string) => void
  onStages: () => void
}) {
  const byId = Object.fromEntries(stage.parts.map((p) => [p.id, p]))
  const lost = stage.lost.find((l) => l.id === game.part)!
  const name = byId[game.part].name

  if (game.status === 'cleared') {
    const next = nextStage(stage.key)
    return (
      <div className="quiz game" ref={cardRef} data-label-block role="status">
        <p className="quiz-count">{stage.name}ステージ クリア！</p>
        <p className="quiz-q">おかえり、{name}！</p>
        <p className="quiz-a ok">
          <b>{name}</b>：{byId[game.part].role}
        </p>
        {next && !next.ready && <p className="quiz-sub">次のステージ「{next.name}」は準備中です。</p>}
        <div className="quiz-actions">
          <button onClick={onStages}>ステージを選ぶ</button>
          <button className={next?.ready ? '' : 'primary'} onClick={onAgain}>
            別の子でもう一回
          </button>
          {next?.ready && (
            <button className="primary" onClick={() => onNext(next.key)}>
              次のステージ：{next.name}へ
            </button>
          )}
        </div>
      </div>
    )
  }

  let say = lost.line
  let sub = 'この子を元の場所まで運んであげよう。ドラッグで運ぶか、元の場所をタップしてね。'
  if (game.status === 'holding') {
    say = 'よろしくね！元の席はどこだったかな…'
    sub = '元の場所をタップしてね。'
  } else if (game.status === 'wrong') {
    const there = game.near && game.near !== game.part ? `そこは「${byId[game.near].name}」の場所みたい。` : ''
    say = `ここじゃないみたい…${there}`
    sub = `ヒント：${lost.hints[Math.min(game.misses, 2) - 1] ?? lost.hints[0]}`
  } else if (game.status === 'returning') {
    say = 'ここだ！ありがとう！'
    sub = `ちゃんと働けるか、${stage.flow.action === '水を流す' ? '水を流して' : '動かして'}みよう。`
  }

  return (
    <div className="quiz game" ref={cardRef} data-label-block role="status">
      <p className="quiz-count">迷子パーツをもどそう ― {stage.name}</p>
      <div className="speech">
        <span className="speech-name">{name}</span>
        <p>{say}</p>
      </div>
      <p className={game.status === 'wrong' ? 'quiz-a' : 'quiz-sub'}>{sub}</p>
    </div>
  )
}

export function StageSelect({
  current,
  onClose,
  onView,
  onLost,
  onQuiz,
}: {
  current: string
  onClose: () => void
  onView: (key: string) => void
  onLost: (key: string) => void
  onQuiz: (key: string) => void
}) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal stages" role="dialog" aria-modal="true" aria-label="あそぶ" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <h2>ステージ</h2>
          <button className="icon-btn" onClick={onClose} aria-label="閉じる">
            <Icon name="close" />
          </button>
        </div>
        <p className="small">迷子になった部品を、元の場所に戻してあげよう。ステージをクリアすると次の設備へ進めます。</p>
        <ol className="stage-list">
          {STAGES.map((s, i) => (
            <li key={s.key} className={`${s.ready ? '' : 'locked'} ${s.key === current ? 'current' : ''}`}>
              <span className="stage-no">{i + 1}</span>
              <div className="stage-body">
                <b>
                  {s.name}
                  {s.key === current && <em>表示中</em>}
                </b>
                <small>{s.sub}</small>
              </div>
              {s.ready ? (
                <div className="stage-actions">
                  <button className="primary" onClick={() => onLost(s.key)}>
                    迷子パーツ
                  </button>
                  <button onClick={() => onQuiz(s.key)}>部品クイズ</button>
                  {s.key !== current && <button onClick={() => onView(s.key)}>模型を見る</button>}
                </div>
              ) : (
                <span className="stage-lock">
                  <Icon name="lock" />
                  準備中
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
