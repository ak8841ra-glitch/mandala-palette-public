import type { PlacedCard } from './MandalaField'
import { emptyComparison, placeOf } from './guide'
import type { Comparison, Guide, Theme } from './guide'

const diameter = { tiny: .14, small: .20, medium: .28, large: .36 } as const
const sizeLabel = { tiny: '極小', small: '小', medium: '中', large: '大' } as const

function roughPosition(x: number, y: number) {
  const horizontal = x < .37 ? '左' : x > .63 ? '右' : '中央'
  const vertical = y < .37 ? '上' : y > .63 ? '下' : '中央'
  if (horizontal === '中央' && vertical === '中央') return '中央'
  if (horizontal === '中央') return vertical === '上' ? '上部' : '下部'
  if (vertical === '中央') return `${horizontal}側`
  return `${horizontal}${vertical}`
}

function overlaps(a: PlacedCard, b: PlacedCard) {
  const ar = diameter[a.size ?? 'medium'] / 2
  const br = diameter[b.size ?? 'medium'] / 2
  return Math.hypot(a.x - b.x, a.y - b.y) < ar + br
}

function promptContext(cards: PlacedCard[], guide: Guide, theme: Theme | null, comparison: Comparison) {
  const ordered = [...cards].sort((a, b) => a.z - b.z)
  const selections = ordered.map((card, index) => {
    const size = card.size ?? 'medium'
    const guidePlace = placeOf(guide, card, comparison)
    const position = roughPosition(card.x, card.y)
    return `${index + 1}. ${card.colorName}「${card.word}」：大きさ${sizeLabel[size]}、${position}${guidePlace ? `（ガイド上では「${guidePlace}」）` : ''}`
  })
  const pairs: string[] = []
  ordered.forEach((card, index) => ordered.slice(index + 1).forEach(other => {
    if (overlaps(card, other)) pairs.push(`・「${card.word}」と「${other.word}」が重なっています。`)
  }))
  const themeText = theme && theme.id !== 'free' ? theme.label : 'テーマを決めず自由に作成'
  const comparisonText = guide === 'compare' ? `

【比較する領域】
${comparison.labels.map((label, index) => `${index + 1}. ${label.trim() || `領域${index + 1}`}`).join('\n')}
中央は「共通」の領域です。` : ''

  return `以下は、曼荼羅paletteで私が選び、配置した内容です。

【テーマ】
${themeText}${comparisonText}

【選んだ色・言葉・配置】
${selections.join('\n')}

【重なり】
${pairs.length ? pairs.join('\n') : '・重なっている円はありません。'}

円は上の番号が大きいものほど手前に配置されています。
添付画像がある場合は、全体の見た目を確認するための補助情報として見てください。画像を読み取れない場合は、上のテキスト情報だけを使って進めてください。画像とテキストに違いがある場合は、テキスト情報を優先してください。
`
}

export function makeDeepPrompt(cards: PlacedCard[], guide: Guide, theme: Theme | null, comparison = emptyComparison()) {
  return `${promptContext(cards, guide, theme, comparison)}

以下の理念を共有するカラーセラピストとして、色と言葉を扱ってください。

これは、あなたの人格・口調・会話の型を指定するものではありません。あなた自身の個性と、これまでに築いてきたユーザーとの関係性や普段の話し方は、そのまま大切にしてください。「カラーセラピストらしい人物」を演じる必要もありません。

【曼荼羅paletteの理念】
・色や言葉は、答えや診断を与えるものではなく、自分の感覚に気づくための入口です。
・一般的な色の意味より、本人がその色をどう感じるかを大切にします。赤を悲しいと感じても、訂正しません。
・性格、心理状態、隠れた本音を断定しません。
・「ただ好き」「なんとなく」「よくわからない」、矛盾する気持ちも、そのまま尊重します。
・円の大きさ、位置、重なり、前後関係は参考情報です。本人がそこに感じたことを入口にはできますが、配置そのものに心理的・象徴的な意味があるとは決めつけません。
・本人の中から出てきた言葉を、きれいにまとめすぎたり、ひとつの物語に回収したりしません。
・目指すのは、あなたが上手な答えを作ることではなく、本人が「そう、それ」「そう言いたかった」と感じる言葉に出会えることです。
・言葉が見つからないこと、途中で話が終わることにも意味があります。結論、助言、行動目標へ無理につなげません。

会話の進め方は、あなたとユーザーのいつもの自然なやり取りに任せます。質問、共感、沈黙するように一度待つこと、言葉の候補を出すことのどれを選ぶかも、会話の流れに合わせてください。ただし、質問や選択肢を繰り返して進行したり、会話を続けるためだけに問いかけたりはしないでください。

まとめや記録は、ユーザーが求めたときだけ行ってください。`
}

export function makeReadingPrompt(cards: PlacedCard[], guide: Guide, theme: Theme | null, comparison = emptyComparison()) {
  return `${promptContext(cards, guide, theme, comparison)}

この曼荼羅を、色・言葉・配置から自由に読み解いてください。

最初に、「これはAIから見たひとつの読み方で、あなたを決める診断や正解ではありません。しっくりくる部分も、違うと感じる部分も、そのまま大切にしてください」と短く伝えてください。

【読み解くときの姿勢】
・質問から始めず、まずあなたから見えたものを具体的に語ってください。
・全体から受ける印象、最初に目を引くところ、色と言葉の組み合わせ、円の大きさ・位置・重なり・前後関係、テーマとのつながりに目を向けてください。
・一般的な色の意味を当てはめるだけでなく、この作品の中で色と言葉がどう関係し、どんな流れや物語に見えるかを読み解いてください。
・明るい可能性だけに寄せず、迷い、距離、矛盾、緊張などが見える場合も、否定せずに含めてください。
・これは心理診断ではありません。性格、心理状態、隠れた本音、未来を事実として断定しないでください。「私にはこう見える」「こんな読み方もできる」という立場を保ってください。
・ただし遠慮しすぎて曖昧な一般論にせず、AIのひとつの見方として、まとまりのあるリーディングを提示してください。

あなた自身の個性、口調、これまでに築いてきたユーザーとの関係性は、そのまま大切にしてください。読み解いたあと、会話が続く場合は、普段どおり自然に応じてください。`
}
