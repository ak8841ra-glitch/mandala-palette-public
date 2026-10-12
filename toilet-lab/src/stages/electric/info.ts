import type { LostPart, QuizQuestion, Source } from '../types'

// 参考にした公開資料（部品の名称・役割・つながりの確認に使用）
export const SOURCES: Source[] = [
  {
    title: '三菱電機 電気温水器 取扱説明書（例：t410z019h31）',
    url: 'https://dl.mitsubishielectric.co.jp/dl/ldg/wink/ssl/wink_doc/m_contents/wink/MA_IM/t410z019h31.pdf',
    note: '逃し弁と排水口の確認、減圧弁の設定、温水器専用止水栓と漏電遮断器',
  },
  {
    title: '日立 電気温水器 取扱説明書（BE-FS46DWD 系）',
    url: 'https://kadenfan.hitachi.co.jp/support/hot/item/docs/be-fs46dwd_a.pdf',
    note: '貯湯タンク・混合弁・排水まわりの構成',
  },
  {
    title: '実用新案 JP2534583Y2「電気温水器」',
    url: 'https://patents.google.com/patent/JP2534583Y2/ja',
    note: 'タンク底部のヒーターで貯湯タンクの水を加熱する構造',
  },
  {
    title: '実用新案 JPH0634446Y2「先止式電気温水器の膨張水排水路」',
    url: 'https://patents.google.com/patent/JPH0634446Y2/ja',
    note: '加熱で膨張した水の排水',
  },
  {
    title: 'メンテナンス用語集「電気温水器」（mec-h.com）',
    url: 'https://www.mec-h.com/words/detail?n=784',
    note: '電気温水器の基本的なしくみ',
  },
]

export const MODEL_SCOPE: string[] = [
  '屋内に置く、床置きの「貯湯式」電気温水器 1台（タンクの水を電気ヒーターで温めるタイプ）',
  '水道の圧力を下げて給水する「減圧式」。お風呂の自動湯はり機能は対象外',
  '夜にまとめて沸かし、ためたお湯を昼に使う運転のしかた',
  'ヒートポンプで温める「エコキュート」は、しくみが違うため対象外',
]

export const SIMPLIFICATIONS: string[] = [
  '形はすべて基本図形の組み合わせで、寸法は目安です。特定メーカー・機種の再現ではありません。',
  'タンクの中のお湯と水の境目は、2色の層で表しています。実際は少しずつ温度が変わります。',
  '保温材、ヒーターの温度調節や空だき防止などの安全装置、配管の逆止弁、ストレーナーは省略しています。',
  '給湯配管と給水配管の位置は一例です。逃し弁の取り付け位置も機種によって違います。',
  '電気の配線・工事、排水や点検の具体的な手順は扱いません。電気温水器の電気工事は資格が必要です。',
]

export const QUIZ: QuizQuestion[] = [
  { target: 'relief', prompt: '逃し弁を見つけてタップしよう', hint: '本体のいちばん上にあるよ。排水口へのびる細い管をたどってみよう。' },
  { target: 'reducer', prompt: '減圧弁を見つけてタップしよう', hint: '本体の右下、水が入ってくる管の途中にあるよ。' },
  { target: 'breaker', prompt: '漏電遮断器を見つけてタップしよう', hint: '本体の前の、下のほうにあるよ。' },
]

// 「迷子パーツをもどそう」で迷子になる候補
export const ELECTRIC_LOST: LostPart[] = [
  {
    id: 'heater',
    line: 'ぼく、ヒーター。夜のあいだに、タンクの水をじっくり温めるんだ。',
    hints: ['本体の中の、下のほうにいたよ。', 'タンクの下のほうに、前から差し込まれていたよ！'],
  },
  {
    id: 'reducer',
    line: 'わたし、減圧弁。水道の水の押す力を弱めて、タンクを守っているの。',
    hints: ['本体の外の、右下にいたよ。', '床から来る水の管が、本体に入る手前の途中！'],
  },
  {
    id: 'relief',
    line: 'ぼく、逃し弁。タンクの圧力が上がりすぎたら、少し水を逃がしてタンクを守るんだ。',
    hints: ['本体のてっぺんにいたよ。', '排水口から上へのびる細い管の、いちばん上のはし！'],
  },
  {
    id: 'mixer',
    line: 'ぼく、混合弁。熱いお湯に水を混ぜて、ちょうどいい温度にするんだ。',
    hints: ['本体の中の、いちばん下の部屋にいたよ。', '給湯配管が本体から出ていく、すぐ内側！'],
  },
  {
    id: 'drainOutlet',
    line: 'ぼく、排水口。逃し弁から出た水を受け止めて、流しているよ。',
    hints: ['床の上にいたよ。', '本体の右前、逃し弁からの細い管が下りてくる先！'],
  },
]
