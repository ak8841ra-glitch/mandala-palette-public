// Where you are in the look-at-yourself flow, shown as dots instead of numbered words.
const STEPS = ['テーマ', '色と言葉', '置いて眺める', 'できあがり'] as const

export default function Steps({ at }: { at: 1 | 2 | 3 | 4 }) {
  return <span className="step-dots" role="img" aria-label={`${STEPS.length}つのうち${at}つめ：${STEPS[at - 1]}`}>
    {STEPS.map((step, i) => <i key={step} data-on={i < at || undefined} />)}
  </span>
}
