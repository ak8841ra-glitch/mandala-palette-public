import type { PartId } from './parts'

// 参考にした公開資料（部品の名称・役割・つながりの確認に使用）
export const SOURCES: { title: string; url: string; note: string }[] = [
  {
    title: 'TOTO「トイレのしくみ」',
    url: 'https://jp.toto.com/support/tips/toilet/kaiteki/shikumi/',
    note: 'タンク式トイレの水の流れと部品構成',
  },
  {
    title: 'TOTO「タンク内の鎖とフロートバルブの点検・交換をしましょう」',
    url: 'https://jp.toto.com/support/repair/toilet/floatvalve/',
    note: 'フロートバルブ・鎖・オーバーフロー管の位置と役割',
  },
  {
    title: '東京ガス 暮らしのコラム「トイレタンクの水がたまらない？」',
    url: 'https://home.tokyo-gas.co.jp/column/restroom/0033/',
    note: 'ボールタップ・浮き球による給水の仕組み',
  },
  {
    title: 'ALSOK「トイレの水漏れ」解説記事',
    url: 'https://www.alsok.co.jp/person/recommend/2307/',
    note: '止水栓・ボールタップ・ゴムフロートの役割',
  },
  {
    title: 'スムタノ「トイレタンクの部品の名称」',
    url: 'https://www.sunrefre.jp/sumutano/wc/9057/',
    note: 'タンク内部品の一般的な呼び方（ボールタップ・フロートバルブなど）',
  },
  {
    title: '実用新案 JPH0720225Y2「便器洗浄タンク装置における補助水給水構造」',
    url: 'https://patents.google.com/patent/JPH0720225Y2/ja',
    note: '補助水管からオーバーフロー管を通じて封水を補う構造',
  },
]

// 模型で選んだ代表構造
export const MODEL_SCOPE: string[] = [
  '床置き・タンク式（密結形ロータンク）の洋式便器 1台',
  'タンク上部の手洗いなし',
  '浮き球式ボールタップ ＋ 鎖つきフロートバルブ',
  '壁から給水（壁給水）・床へ排水（床排水）',
  '便器は「洗い落とし式」を想定した簡略な排水路',
]

// 模型で省略・簡略化した点
export const SIMPLIFICATIONS: string[] = [
  '形はすべて基本図形の組み合わせで、寸法は目安です。特定メーカー・機種の再現ではありません。',
  '便器内の排水路（トラップ）は、陶器と一体の複雑な形を1本の管として表しています。',
  '便器のフチ（リム）裏の水の通り道は形を作らず、水の流れアニメーションの矢印だけで示しています。',
  'ボールタップ内部の弁の仕組み、レバーの大・小の切り替え、鎖の長さ調整、水位調整ネジは省略しています。',
  'タンクと便器を固定するボルト・ナット、便器を床に固定する部品、壁の止水栓の内部構造は省略しています。',
  '壁の中・床下の配管ルートは、短い直線の管として簡略化しています。',
  '温水洗浄便座・タンクレストイレの内部構造は対象外です。',
]

export type QuizQuestion = { target: PartId; prompt: string; hint: string }

export const QUIZ: QuizQuestion[] = [
  {
    target: 'stopValve',
    prompt: '止水栓を見つけてタップしよう',
    hint: '壁から出ている小さな栓。給水ホースの根元をたどってみよう。',
  },
  {
    target: 'floatBall',
    prompt: '浮き球を見つけてタップしよう',
    hint: 'タンクの中で水面に浮かんでいる丸いもの。「内部を見る」にしてみよう。',
  },
  {
    target: 'floatValve',
    prompt: 'フロートバルブ（タンクの栓）を見つけてタップしよう',
    hint: 'タンクの中の底にあるよ。鎖の下の先をたどってみよう。',
  },
]
