import { PART_MAP, type PartId } from '../data/parts'
import { STAGES, TOILET_LOST } from '../data/game'
import { Icon } from './Icon'

export type Game = {
  part: PartId
  status: 'find' | 'holding' | 'wrong' | 'returning' | 'flushing' | 'cleared'
  near?: PartId | null
  misses: number
}

export function GameCard({
  cardRef,
  game,
  onAgain,
  onStages,
}: {
  cardRef: React.RefObject<HTMLDivElement | null>
  game: Game
  onAgain: () => void
  onStages: () => void
}) {
  const lost = TOILET_LOST.find((l) => l.id === game.part)!
  const name = PART_MAP[game.part].name

  if (game.status === 'cleared') {
    const next = STAGES.find((s) => !s.ready)
    return (
      <div className="quiz game" ref={cardRef} data-label-block role="status">
        <p className="quiz-count">トイレステージ クリア！</p>
        <p className="quiz-q">おかえり、{name}！</p>
        <p className="quiz-a ok">
          <b>{name}</b>：{PART_MAP[game.part].role}
        </p>
        {next && (
          <p className="quiz-sub">
            次のステージ「{next.name}」は準備中です。
          </p>
        )}
        <div className="quiz-actions">
          <button onClick={onStages}>ステージを選ぶ</button>
          <button className="primary" onClick={onAgain}>
            別の子でもう一回
          </button>
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
    const there = game.near && game.near !== game.part ? `そこは「${PART_MAP[game.near].name}」の場所みたい。` : ''
    say = `ここじゃないみたい…${there}`
    sub = `ヒント：${lost.hints[Math.min(game.misses, 2) - 1] ?? lost.hints[0]}`
  } else if (game.status === 'returning') {
    say = 'ここだ！ありがとう！'
    sub = 'ちゃんと働けるか、水を流してみよう。'
  }

  return (
    <div className="quiz game" ref={cardRef} data-label-block role="status">
      <p className="quiz-count">迷子パーツをもどそう ― トイレ</p>
      <div className="speech">
        <span className="speech-name">{name}</span>
        <p>{say}</p>
      </div>
      <p className={game.status === 'wrong' ? 'quiz-a' : 'quiz-sub'}>{sub}</p>
    </div>
  )
}

export function StageSelect({
  onClose,
  onLost,
  onQuiz,
}: {
  onClose: () => void
  onLost: () => void
  onQuiz: () => void
}) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal stages" role="dialog" aria-modal="true" aria-label="あそぶ" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <h2>あそぶ</h2>
          <button className="icon-btn" onClick={onClose} aria-label="閉じる">
            <Icon name="close" />
          </button>
        </div>
        <p className="small">迷子になった部品を、元の場所に戻してあげよう。ステージをクリアすると次の設備へ進めます。</p>
        <ol className="stage-list">
          {STAGES.map((s, i) => (
            <li key={s.key} className={s.ready ? '' : 'locked'}>
              <span className="stage-no">{i + 1}</span>
              <div className="stage-body">
                <b>{s.name}</b>
                <small>{s.sub}</small>
              </div>
              {s.ready ? (
                <div className="stage-actions">
                  <button className="primary" onClick={onLost}>
                    迷子パーツ
                  </button>
                  <button onClick={onQuiz}>部品クイズ</button>
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
