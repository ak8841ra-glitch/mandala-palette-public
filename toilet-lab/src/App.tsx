import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Part, PartId, Stage as StageDef } from './stages/types'
import { pickLost, stageByKey } from './stages'
import { Viewer, type LostEvent } from './three/Viewer'
import { SearchBox } from './components/SearchBox'
import { InfoPanel } from './components/InfoPanel'
import { RefsModal } from './components/RefsModal'
import { Fallback } from './components/Fallback'
import { Icon } from './components/Icon'
import { GameCard, StageSelect, type Game } from './components/Game'

type Quiz = { index: number; status: 'ask' | 'wrong' | 'right' | 'done'; picked?: PartId }
type Pending = 'lost' | 'quiz' | null

function webglAvailable() {
  if (new URLSearchParams(location.search).has('nowebgl')) return false
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`

export default function App() {
  const [gl] = useState(webglAvailable)
  const [glFailed, setGlFailed] = useState(false)
  if (!gl || glFailed) return <Fallback />
  return <Stage onFail={() => setGlFailed(true)} />
}

function Stage({ onFail }: { onFail: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const viewer = useRef<Viewer | null>(null)
  const [stageKey, setStageKey] = useState('toilet')
  const stage = stageByKey(stageKey)
  const parts = useMemo(() => Object.fromEntries(stage.parts.map((p) => [p.id, p])) as Record<PartId, Part>, [stage])
  const [selected, setSelected] = useState<PartId | null>(null)
  const [inside, setInside] = useState(false)
  const [step, setStep] = useState<number | null>(null)
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [refsOpen, setRefsOpen] = useState(false)
  const [hint, setHint] = useState(true)
  const [game, setGame] = useState<Game | null>(null)
  const [stagesOpen, setStagesOpen] = useState(false)
  const quizRef = useRef<Quiz | null>(null)
  quizRef.current = quiz
  const gameRef = useRef<Game | null>(null)
  gameRef.current = game
  const stageRef = useRef<StageDef>(stage)
  stageRef.current = stage
  // ステージを切り替えたあと、新しい模型ができてから始めること
  const pending = useRef<Pending>(null)

  const handlePick = useCallback((id: PartId | null) => {
    const v = viewer.current
    const q = quizRef.current
    if (q && (q.status === 'ask' || q.status === 'wrong')) {
      if (!id) return
      const target = stageRef.current.quiz[q.index].target
      v?.select(id)
      setSelected(id)
      setQuiz({ ...q, status: id === target ? 'right' : 'wrong', picked: id })
      return
    }
    if (q || gameRef.current) return
    v?.select(id)
    setSelected(id)
  }, [])

  // 迷子パーツの進みぐあい（3D側からの知らせ）
  const handleLost = useCallback((e: LostEvent) => {
    const g = gameRef.current
    if (!g) return
    if (e.type === 'grab') setGame({ ...g, status: 'holding' })
    else if (e.type === 'wrong') setGame({ ...g, status: 'wrong', near: e.near, misses: g.misses + 1 })
    else if (e.type === 'returning') setGame({ ...g, status: 'returning' })
    else if (e.type === 'placed') {
      setGame({ ...g, status: 'flushing' })
      // 戻れたら、ちゃんと働けるか動かして見せる
      setTimeout(() => viewer.current?.startFlush(), 500)
    }
  }, [])

  const handleFlushDone = useCallback(() => {
    const g = gameRef.current
    if (g && g.status === 'flushing') {
      setGame({ ...g, status: 'cleared' })
      viewer.current?.resetView()
    }
  }, [])

  const beginLost = (v: Viewer, st: StageDef, except?: PartId) => {
    const lost = pickLost(st, except)
    setQuiz(null)
    setSelected(null)
    setGame({ part: lost.id, status: 'find', misses: 0 })
    v.startLost(lost.id)
  }

  const beginQuiz = (v: Viewer) => {
    setGame(null)
    setSelected(null)
    v.endLost()
    v.stopFlush()
    v.select(null)
    v.setInside(false)
    v.resetView()
    setQuiz({ index: 0, status: 'ask' })
  }

  useEffect(() => {
    if (!hostRef.current || !labelRef.current) return
    let v: Viewer
    try {
      v = new Viewer(hostRef.current, labelRef.current, stage, {
        onSelect: handlePick,
        onFlushStep: setStep,
        onFlushDone: handleFlushDone,
        onModeChange: setInside,
        onInteract: () => setHint(false),
        onLost: handleLost,
      })
    } catch (e) {
      console.error(e)
      onFail()
      return
    }
    viewer.current = v
    const p = pending.current
    pending.current = null
    if (p === 'lost') beginLost(v, stage)
    else if (p === 'quiz') beginQuiz(v)
    return () => {
      v.dispose()
      viewer.current = null
    }
    // beginLost / beginQuiz は state の setter だけを使うので、ステージが変わったときだけ作り直す
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, handlePick, handleLost, handleFlushDone, onFail])

  useEffect(() => {
    const t = setTimeout(() => setHint(false), 7000)
    return () => clearTimeout(t)
  }, [])

  // 説明パネルや上のカードに隠れない位置に模型が来るよう、ビューアーに余白を伝える
  const playing = !!quiz || !!game
  const showGameCard = !!game && game.status !== 'flushing'
  const showPanel = !!selected && !playing
  const showTopCard = step !== null || !!quiz || showGameCard
  useEffect(() => {
    const v = viewer.current
    if (!v) return
    const update = () => {
      const wide = window.innerWidth >= 760
      const panel = showPanel ? panelRef.current?.getBoundingClientRect() : undefined
      const card = showTopCard ? cardRef.current?.getBoundingClientRect() : undefined
      const top = card ? Math.max(0, card.bottom - 60) : 0
      if (!panel) v.setInsets(0, 0, top)
      else if (wide) v.setInsets(panel.width + 24, 0, top)
      else v.setInsets(0, Math.max(0, window.innerHeight - panel.top - 80), top)
    }
    update()
    const ro = new ResizeObserver(update)
    if (showPanel && panelRef.current) ro.observe(panelRef.current)
    if (showTopCard && cardRef.current) ro.observe(cardRef.current)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [showPanel, showTopCard, selected, step, quiz, game, stage])

  useEffect(() => {
    const hideForQuiz = !!quiz && quiz.status !== 'done'
    const hideForGame = !!game && game.status !== 'cleared'
    viewer.current?.setLabelsVisible(!hideForQuiz && !hideForGame)
  }, [quiz, game, stage])

  const choose = (id: PartId) => {
    if (playing) return
    viewer.current?.select(id, { fly: true })
    setSelected(id)
    setHint(false)
  }

  const close = () => {
    viewer.current?.select(null)
    setSelected(null)
  }

  const toggleInside = () => viewer.current?.setInside(!inside)

  const flush = () => {
    const v = viewer.current
    if (!v) return
    if (step !== null) v.stopFlush()
    else {
      close()
      v.startFlush()
    }
    setHint(false)
  }

  // 別のステージへ移る（模型を作り直す）。then はできあがったあとに始めること
  const switchStage = (key: string, then: Pending = null) => {
    setStagesOpen(false)
    setHint(false)
    if (key === stageKey) {
      const v = viewer.current
      if (!v) return
      if (then === 'lost') beginLost(v, stage, game?.part)
      else if (then === 'quiz') beginQuiz(v)
      return
    }
    pending.current = then
    setSelected(null)
    setGame(null)
    setQuiz(null)
    setStep(null)
    setInside(false)
    setStageKey(key)
  }

  const endGame = () => {
    viewer.current?.endLost()
    viewer.current?.stopFlush()
    viewer.current?.select(null)
    setSelected(null)
    setGame(null)
  }

  const nextQuiz = () => {
    if (!quiz) return
    viewer.current?.select(null)
    setSelected(null)
    if (quiz.index + 1 >= stage.quiz.length) setQuiz({ index: quiz.index, status: 'done' })
    else setQuiz({ index: quiz.index + 1, status: 'ask' })
  }

  const endQuiz = () => {
    viewer.current?.select(null)
    setSelected(null)
    setQuiz(null)
  }

  return (
    <div className="app">
      <div className="stage" ref={hostRef}>
        <div className="labels" ref={labelRef} />
      </div>

      <header className="top">
        <button className="brand" data-label-block aria-label={`${stage.brand}（ステージを選ぶ）`} onClick={() => setStagesOpen(true)}>
          <span className="brand-mark" aria-hidden>
            <Icon name={stage.flow.actionIcon === 'flush' ? 'drop' : stage.flow.actionIcon} />
          </span>
          <span className="brand-text">
            {stage.brand}
            <small>3D模型</small>
          </span>
        </button>
        {!playing && <SearchBox key={stage.key} parts={stage.parts} example={stage.searchExample} onChoose={choose} />}
      </header>

      {step !== null && !showGameCard && (
        <div className="caption" role="status" ref={cardRef} data-label-block>
          <div className="caption-step">
            {stage.flow.steps.map((_, i) => (
              <i key={i} className={i <= step ? 'on' : ''} />
            ))}
          </div>
          <p>{stage.flow.steps[step].text}</p>
          <div className="legend">
            {stage.flow.legend.map((l) => (
              <span key={l.label}>
                <b
                  className={l.kind === 'drop' ? 'drop' : ''}
                  style={l.kind === 'drop' ? { background: hex(l.color) } : { borderBottomColor: hex(l.color) }}
                />
                {l.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {game && showGameCard && (
        <GameCard
          cardRef={cardRef}
          stage={stage}
          game={game}
          onAgain={() => switchStage(stage.key, 'lost')}
          onNext={(key) => switchStage(key, 'lost')}
          onStages={() => {
            endGame()
            setStagesOpen(true)
          }}
        />
      )}

      {quiz && (
        <QuizCard
          cardRef={cardRef}
          stage={stage}
          parts={parts}
          quiz={quiz}
          onNext={nextQuiz}
          onEnd={endQuiz}
          onRetry={() => setQuiz({ ...quiz, status: 'ask' })}
        />
      )}

      {showPanel && selected && parts[selected] && (
        <InfoPanel ref={panelRef} id={selected} parts={parts} onClose={close} onJump={choose} />
      )}

      {hint && (
        <div className="hint" aria-hidden data-label-block>
          <span className="wide-only">ドラッグで回転・ホイールで拡大・部品をクリックで説明</span>
          <span className="narrow-only">ドラッグで回転・ピンチで拡大・部品をタップ</span>
        </div>
      )}

      <nav className="toolbar" aria-label="操作" data-label-block>
        <button onClick={() => viewer.current?.resetView()} title="カメラを最初の位置に戻す">
          <Icon name="home" />
          <span>全体に戻る</span>
        </button>
        <button className={inside ? 'active' : ''} onClick={toggleInside} aria-pressed={inside}>
          <Icon name={inside ? 'eye' : 'layers'} />
          <span>{inside ? '外側を見る' : '内部を見る'}</span>
        </button>
        <button className={`primary ${step !== null ? 'active' : ''}`} onClick={flush} disabled={playing}>
          <Icon name={step !== null ? 'stop' : stage.flow.actionIcon} />
          <span>{step !== null ? '止める' : stage.flow.action}</span>
        </button>
        <button
          onClick={quiz ? endQuiz : game ? endGame : () => setStagesOpen(true)}
          className={playing ? 'active' : ''}
        >
          <Icon name={playing ? 'close' : 'play'} />
          <span>{quiz ? 'クイズをやめる' : game ? 'ゲームをやめる' : 'あそぶ'}</span>
        </button>
      </nav>

      <footer className="note" data-label-block>
        <span>代表的な構造の学習用模型。実際の機種とは異なります。</span>
        <button onClick={() => setRefsOpen(true)}>参考資料・省略点</button>
      </footer>

      {refsOpen && <RefsModal stage={stage} onClose={() => setRefsOpen(false)} />}
      {stagesOpen && (
        <StageSelect
          current={stage.key}
          onClose={() => setStagesOpen(false)}
          onView={(key) => switchStage(key)}
          onLost={(key) => switchStage(key, 'lost')}
          onQuiz={(key) => switchStage(key, 'quiz')}
        />
      )}
    </div>
  )
}

function QuizCard({
  cardRef,
  stage,
  parts,
  quiz,
  onNext,
  onEnd,
  onRetry,
}: {
  cardRef: React.RefObject<HTMLDivElement | null>
  stage: StageDef
  parts: Record<PartId, Part>
  quiz: Quiz
  onNext: () => void
  onEnd: () => void
  onRetry: () => void
}) {
  const total = stage.quiz.length
  const q = stage.quiz[quiz.index]
  if (quiz.status === 'done')
    return (
      <div className="quiz" ref={cardRef} data-label-block>
        <p className="quiz-q">{total}問ぜんぶ見つけられました！</p>
        <p className="quiz-a">ほかの部品もタップして、つながりをたどってみましょう。</p>
        <div className="quiz-actions">
          <button className="primary" onClick={onEnd}>
            おわる
          </button>
        </div>
      </div>
    )
  return (
    <div className="quiz" role="status" ref={cardRef} data-label-block>
      <p className="quiz-count">
        部品クイズ（{stage.name}） {quiz.index + 1} / {total}
      </p>
      <p className="quiz-q">{q.prompt}</p>
      {quiz.status === 'right' && (
        <>
          <p className="quiz-a ok">
            <b>正解！</b> {parts[q.target].role}
          </p>
          <div className="quiz-actions">
            <button className="primary" onClick={onNext}>
              {quiz.index + 1 >= total ? '結果を見る' : '次の問題'}
            </button>
          </div>
        </>
      )}
      {quiz.status === 'wrong' && quiz.picked && (
        <>
          <p className="quiz-a">
            それは「{parts[quiz.picked].name}」。<br />
            ヒント：{q.hint}
          </p>
          <div className="quiz-actions">
            <button onClick={onRetry}>もう一度さがす</button>
          </div>
        </>
      )}
      {quiz.status === 'ask' && <p className="quiz-sub">回したり、「内部を見る」に切り替えたりして探してみよう。</p>}
    </div>
  )
}
