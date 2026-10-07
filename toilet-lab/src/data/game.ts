import type { PartId } from './parts'

// 「迷子パーツをもどそう」ゲームのデータ。
// 1ステージ＝1つの設備。ステージごとに、迷子になる部品の候補から1つが選ばれる。

export type LostPart = {
  id: PartId
  line: string // 迷子の子のセリフ（自己紹介と仕事）
  hints: [string, string] // 1回目・2回目以降のまちがいで出すヒント
}

export type StageInfo = {
  key: string
  name: string
  sub: string
  ready: boolean
}

export const STAGES: StageInfo[] = [
  { key: 'toilet', name: 'トイレ', sub: 'タンク式の洋式トイレ', ready: true },
  { key: 'faucet', name: '水栓', sub: 'キッチン・洗面の蛇口', ready: false },
  { key: 'breaker', name: 'ブレーカー', sub: '分電盤のしくみ', ready: false },
  { key: 'aircon', name: 'エアコン', sub: '室内機と室外機', ready: false },
]

export const TOILET_LOST: LostPart[] = [
  {
    id: 'floatBall',
    line: 'ぼく、浮き球。水に浮かんで、水の高さをボールタップに知らせるのが仕事なんだ。',
    hints: ['タンクの中の、水面のあたりにいたよ。', 'ボールタップから横にのびている腕の先が、ぼくの席！'],
  },
  {
    id: 'floatValve',
    line: 'わたし、フロートバルブ。タンクの底の穴にふたをして、水をためておく係なの。',
    hints: ['タンクの中の、いちばん底にいたよ。', '鎖の下のはしをたどってみて。そこがわたしの席。'],
  },
  {
    id: 'lever',
    line: 'おれ、洗浄レバー。回されると、タンクの中の鎖を引っぱって水を流すんだ。',
    hints: ['タンクの外側の、正面の上のほうにいたよ。', '鎖の上のはしの近く。タンクの左前の角あたり！'],
  },
  {
    id: 'stopValve',
    line: 'ぼく、止水栓。トイレに行く水を止めたり、勢いを調整したりするよ。',
    hints: ['壁から出ている、低いところにいたよ。', '給水ホースの下のはしをたどってみて。'],
  },
  {
    id: 'refillTube',
    line: 'ぼく、補助水管。細い体で、流したあとの便器に水を少し届けるんだ。',
    hints: ['タンクの中の、上のほうにいたよ。', 'ボールタップの頭と、オーバーフロー管の口をつなぐ場所！'],
  },
]

export function pickLost(except?: PartId): LostPart {
  const pool = TOILET_LOST.filter((p) => p.id !== except)
  return pool[Math.floor(Math.random() * pool.length)]
}
