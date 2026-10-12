import type { LostPart, QuizQuestion, Source } from '../types'

// 参考にした公開資料（部品の名称・役割・つながりの確認に使用）
export const SOURCES: Source[] = [
  {
    title: '経済産業省「ガス用品・ガス工作物の技術基準等の解釈」参考資料',
    url: 'https://www.meti.go.jp/policy/consumer/seian/gasji/contents/kubun_kaisyaku_sanko_tg.pdf',
    note: '点火方式と、炎が消えたときにガスを止める安全装置',
  },
  {
    title: '特開昭60-44755「ガス瞬間式給湯機」',
    url: 'https://patents.google.com/patent/JPS6044755A/ja',
    note: '瞬間式給湯機の基本構成（熱交換器・バーナー・ガス弁による温度制御）',
  },
  {
    title: '特許 JP4547518B2「燃焼制御装置」',
    url: 'https://patents.google.com/patent/JP4547518B2/ja',
    note: '燃焼ファンによる空気の供給と風量の検知',
  },
  {
    title: '鳥取ガス「給湯器の凍結予防」',
    url: 'https://www.tottorigas.co.jp/wp/wp-content/uploads/touketsu.pdf',
    note: '水抜き・給水元栓・ガス栓、凍結しやすい場所',
  },
  {
    title: '泉佐野市 公開資料（ノーリツ ふろ給湯器 取扱説明書）',
    url: 'https://www.city.izumisano.lg.jp/material/files/group/11/4_bath_kyu-to-ki_noritz.pdf',
    note: '長期間使わないときの水抜きの考え方',
  },
]

export const MODEL_SCOPE: string[] = [
  '屋外の外壁にかける「屋外壁掛形」のガス給湯器 1台',
  '給湯専用（蛇口・シャワーへお湯を送る）。お風呂の追いだき機能は対象外',
  'お湯を使うときだけ温める「瞬間式」。お湯をためるタンクはない',
  '一般的な燃焼のしくみ（燃焼ファンで空気を送る、ふつうの熱効率のタイプ）',
]

export const SIMPLIFICATIONS: string[] = [
  '形はすべて基本図形の組み合わせで、寸法は目安です。特定メーカー・機種の再現ではありません。',
  '熱交換器は、曲がった管とフィンの集まりを箱と1本の管で表しています。お湯の通り道は矢印で示しています。',
  '排気の熱を再利用する二次熱交換器（エコジョーズなど）、ドレン排水、凍結予防ヒーター、各種の安全装置（過熱防止など）は省略しています。',
  'お風呂の追いだき配管、混合水栓の水側の配管、ガスメーターは省略しています。',
  'ガス配管・電気・燃焼部の点検や修理の方法は扱いません。ガスのにおいなど異常を感じたら、機器を使わずガス会社へ連絡します。',
]

export const QUIZ: QuizQuestion[] = [
  { target: 'gasCock', prompt: 'ガス栓を見つけてタップしよう', hint: '給湯器の下の、黄色い管の途中にあるよ。' },
  { target: 'hx', prompt: '熱交換器を見つけてタップしよう', hint: '「内部を見る」にして、バーナーのすぐ上を見てみよう。' },
  { target: 'flowSensor', prompt: '水量センサーを見つけてタップしよう', hint: '給湯器の中、水が入ってくる入口のすぐ上だよ。' },
]

// 「迷子パーツをもどそう」で迷子になる候補
export const GAS_LOST: LostPart[] = [
  {
    id: 'burner',
    line: 'ぼく、バーナー。ガスと空気を混ぜて燃やして、熱交換器を温めるんだ。',
    hints: ['給湯器の中、まん中より少し上にいたよ。', '熱交換器のすぐ下、燃焼ファンのすぐ上が、ぼくの席！'],
  },
  {
    id: 'fan',
    line: 'ぼく、燃焼ファン。くるくる回って、火がよく燃えるように空気を送るんだ。',
    hints: ['給湯器の中の、下のほうにいたよ。', 'バーナーのすぐ下。水量センサーのとなりあたり！'],
  },
  {
    id: 'hx',
    line: 'わたし、熱交換器。中を通る水に炎の熱を伝えて、お湯にするの。',
    hints: ['給湯器の中の、上のほうにいたよ。', 'バーナーの上で、排気口の下。銅色の管がくねくねしている場所！'],
  },
  {
    id: 'waterValve',
    line: 'ぼく、給水元栓。給湯器に入る水を、止めたり通したりするよ。',
    hints: ['給湯器の下の、配管の途中にいたよ。', '一番右の、水が来る管の途中。青い丸いハンドルがぼく！'],
  },
  {
    id: 'exhaust',
    line: 'ぼく、排気口。燃えたあとのガスを、外へ出す出口なんだ。',
    hints: ['給湯器の前の面にいたよ。', '前の面の、いちばん上のほう！'],
  },
]
