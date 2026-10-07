import { useCallback, useEffect, useRef, useState } from 'react'
import { PART_MAP, type PartId } from './data/parts'
import { QUIZ } from './data/info'
import { Viewer } from './three/Viewer'
import { FLOW_STEPS } from './three/flow'
import { SearchBox } from './components/SearchBox'
import { InfoPanel } from './components/InfoPanel'
import { RefsModal } from './components/RefsModal'
import { Fallback } from './components/Fallback'
import { Icon } from './components/Icon'

type Quiz = { index: number; status: 'ask' | 'wrong' | 'right' | 'done'; picked?: PartId }

function webglAvailable() {
  if (new URLSearchParams(location.search).has('nowebgl')) return false
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

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
  const [selected, setSelected] = useState<PartId | null>(null)
  const [inside, setInside] = useState(false)
  const [step, setStep] = useState<number | null>(null)
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [refsOpen, setRefsOpen] = useState(false)
  const [hint, setHint] = useState(true)
  const quizRef = useRef<Quiz | null>(null)
  quizRef.current = quiz

  const handlePick = useCallback((id: PartId | null) => {
    const v = viewer.current
    const q = quizRef.current
    if (q && (q.status === 'ask' || q.status === 'wrong')) {
      if (!id) return
      const target = QUIZ[q.index].target
      v?.select(id)
      setSelected(id)
      setQuiz({ ...q, status: id === target ? 'right' : 'wrong', picked: id })
      return
    }
    if (q) return
    v?.select(id)
    setSelected(id)
  }, [])

  useEffect(() => {
    if (!hostRef.current || !labelRef.current) return
    try {
      viewer.current = new Viewer(hostRef.current, labelRef.current, {
        onSelect: handlePick,
        onFlushStep: setStep,
        onModeChange: setInside,
        onInteract: () => setHint(false),
      })
    } catch (e) {
      console.error(e)
      onFail()
    }
    return () => {
      viewer.current?.dispose()
      viewer.current = null
    }
  }, [handlePick, onFail])

  useEffect(() => {
    const t = setTimeout(() => setHint(false), 7000)
    return () => clearTimeout(t)
  }, [])

  // 説明パネルや上のカードに隠れない位置に模型が来るよう、ビューアーに余白を伝える
  const showPanel = !!selected && !quiz
  const showTopCard = step !== null || !!quiz
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
  }, [showPanel, showTopCard, selected, step, quiz])

  useEffect(() => {
    viewer.current?.setLabelsVisible(!quiz || quiz.status === 'done')
  }, [quiz])

  const choose = (id: PartId) => {
    if (quiz) return
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

  const startQuiz = () => {
    const v = viewer.current
    if (!v) return
    if (step !== null) v.stopFlush()
    close()
    v.setInside(false)
    v.resetView()
    setQuiz({ index: 0, status: 'ask' })
    setHint(false)
  }

  const nextQuiz = () => {
    if (!quiz) return
    viewer.current?.select(null)
    setSelected(null)
    if (quiz.index + 1 >= QUIZ.length) setQuiz({ index: quiz.index, status: 'done' })
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
        <div className="brand" data-label-block aria-label="トイレのしくみ 3D">
          <span className="brand-mark" aria-hidden>
            <Icon name="drop" />
          </span>
          <span className="brand-text">
            トイレのしくみ<small>3D模型</small>
          </span>
        </div>
        {!quiz && <SearchBox onChoose={choose} />}
      </header>

      {step !== null && (
        <div className="caption" role="status" ref={cardRef} data-label-block>
          <div className="caption-step">
            {FLOW_STEPS.map((_, i) => (
              <i key={i} className={i <= step ? 'on' : ''} />
            ))}
          </div>
          <p>{FLOW_STEPS[step].text}</p>
          <div className="legend">
            <span>
              <b className="clean" />
              きれいな水
            </span>
            <span>
              <b className="used" />
              流したあとの水
            </span>
          </div>
        </div>
      )}

      {quiz && <QuizCard cardRef={cardRef} quiz={quiz} onNext={nextQuiz} onEnd={endQuiz} onRetry={() => setQuiz({ ...quiz, status: 'ask' })} />}

      {showPanel && selected && (
        <InfoPanel ref={panelRef} id={selected} onClose={close} onJump={choose} />
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
        <button className={`primary ${step !== null ? 'active' : ''}`} onClick={flush} disabled={!!quiz}>
          <Icon name={step !== null ? 'stop' : 'flush'} />
          <span>{step !== null ? '止める' : '水を流す'}</span>
        </button>
        <button onClick={quiz ? endQuiz : startQuiz} className={quiz ? 'active' : ''}>
          <Icon name="quiz" />
          <span>{quiz ? 'クイズをやめる' : '部品クイズ'}</span>
        </button>
      </nav>

      <footer className="note" data-label-block>
        <span>代表的な構造の学習用模型。実際の機種とは異なります。</span>
        <button onClick={() => setRefsOpen(true)}>参考資料・省略点</button>
      </footer>

      {refsOpen && <RefsModal onClose={() => setRefsOpen(false)} />}
    </div>
  )
}

function QuizCard({
  cardRef,
  quiz,
  onNext,
  onEnd,
  onRetry,
}: {
  cardRef: React.RefObject<HTMLDivElement | null>
  quiz: Quiz
  onNext: () => void
  onEnd: () => void
  onRetry: () => void
}) {
  const q = QUIZ[quiz.index]
  if (quiz.status === 'done')
    return (
      <div className="quiz" ref={cardRef} data-label-block>
        <p className="quiz-q">3問ぜんぶ見つけられました！</p>
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
        部品クイズ {quiz.index + 1} / {QUIZ.length}
      </p>
      <p className="quiz-q">{q.prompt}</p>
      {quiz.status === 'right' && (
        <>
          <p className="quiz-a ok">
            <b>正解！</b> {PART_MAP[q.target].role}
          </p>
          <div className="quiz-actions">
            <button className="primary" onClick={onNext}>
              {quiz.index + 1 >= QUIZ.length ? '結果を見る' : '次の問題'}
            </button>
          </div>
        </>
      )}
      {quiz.status === 'wrong' && quiz.picked && (
        <>
          <p className="quiz-a">
            それは「{PART_MAP[quiz.picked].name}」。<br />
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
