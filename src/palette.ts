// Existing palette: ../mandala-palette-sites/src/colors.js
// White and black share one 12-word family, as defined by PRODUCT_SPEC section 3.
export interface Tier { bg: string; ink: string; words: string[] }
export interface PaletteColor { key: string; name: string; tiers: Tier[] }
export interface Keyword { id: string; word: string; bg: string; ink: string }

export const COLORS: readonly PaletteColor[] = [
    { key:"red", name:"赤",
      tiers:[
        {bg:"#F3B6C4", ink:"#5c1f2c", words:["純粋","勇気","暖かさ"]},
        {bg:"#EF4060", ink:"#ffffff", words:["情熱","活力","勝利"]},
        {bg:"#9B1B3A", ink:"#ffffff", words:["激情","覚悟","緊張感"]},
        {bg:"#B5677B", ink:"#ffffff", words:["寛容","高貴","落ち着き"]}
      ]},
    { key:"orange", name:"オレンジ",
      tiers:[
        {bg:"#F5DFA6", ink:"#5c4415", words:["親近感","団らん","柔らかさ"]},
        {bg:"#F2941C", ink:"#3a2200", words:["活気","陽気","共感"]},
        {bg:"#A15E10", ink:"#ffffff", words:["挑戦","冒険","エネルギー"]},
        {bg:"#D19A55", ink:"#3a2200", words:["親和","切なさ","ひたむきさ"]}
      ]},
    { key:"yellow", name:"黄色",
      tiers:[
        {bg:"#F7F29C", ink:"#5c5310", words:["好奇心","軽やか","ポジティブ"]},
        {bg:"#F2E024", ink:"#4a4200", words:["希望","元気","ひらめき"]},
        {bg:"#99801A", ink:"#ffffff", words:["思考","確信","成功"]},
        {bg:"#C2B355", ink:"#3a3300", words:["喜び","自信","向上心"]}
      ]},
    { key:"green", name:"緑",
      tiers:[
        {bg:"#C7E8C0", ink:"#204427", words:["成長","新鮮","安らぎ"]},
        {bg:"#43A55E", ink:"#ffffff", words:["自然","豊かさ","バランス"]},
        {bg:"#1F5C34", ink:"#ffffff", words:["成熟","安定","忍耐"]},
        {bg:"#6FA97F", ink:"#0f2a17", words:["信頼","回復","平穏"]}
      ]},
    { key:"blue", name:"青",
      tiers:[
        {bg:"#B7CCE3", ink:"#1c344c", words:["清涼感","深呼吸","広がり"]},
        {bg:"#3E6CA8", ink:"#ffffff", words:["知恵","冷静","解放感"]},
        {bg:"#163564", ink:"#ffffff", words:["誠実","信念","集中"]},
        {bg:"#5E729B", ink:"#ffffff", words:["受容","平和","意志"]}
      ]},
    { key:"purple", name:"紫",
      tiers:[
        {bg:"#C9B3DD", ink:"#3a2350", words:["幻想","繊細","癒し"]},
        {bg:"#8C4FAE", ink:"#ffffff", words:["創造","洗練","優雅"]},
        {bg:"#4B1B63", ink:"#ffffff", words:["洞察","神秘","孤高"]},
        {bg:"#8462A0", ink:"#ffffff", words:["調和","静寂","内観"]}
      ]},
    { key:"pink", name:"ピンク",
      tiers:[
        {bg:"#F1BFCB", ink:"#5c2733", words:["安心","無垢","優しさ"]},
        {bg:"#EC6E88", ink:"#4a0f1c", words:["憧れ","幸福","愛"]},
        {bg:"#99475A", ink:"#ffffff", words:["献身","魅惑","欲望"]},
        {bg:"#B06C7C", ink:"#ffffff", words:["温もり","守護","包容力"]}
      ]},
    { key:"white", name:"白",
      tiers:[
        {bg:"#FAFAFA", ink:"#2b2b2b", words:["光","無心","浄化"]},
        {bg:"#C7C7C7", ink:"#2b2b2b", words:["中立","クール","控えめ"]}
      ]},
    { key:"black", name:"黒",
      tiers:[
        {bg:"#4D4D4D", ink:"#ffffff", words:["堅実","謙虚","現実的"]},
        {bg:"#0A0A0A", ink:"#ffffff", words:["完璧","無限","真実"]}
      ]}
  ];

export function keywordsFor(color: PaletteColor): Keyword[] {
  const family = color.key === 'white' || color.key === 'black'
    ? COLORS.filter(item => item.key === 'white' || item.key === 'black')
    : [color]
  return family.flatMap(item => item.tiers.flatMap((tier, tierIndex) =>
    tier.words.map((word, wordIndex) => ({
      id: `${item.key}-${tierIndex}-${wordIndex}`, word, bg: tier.bg, ink: tier.ink,
    })),
  ))
}

// Palette order as on the color wheel, clockwise from the top; white and black share one family.
export interface Family { key: string; name: string; colors: PaletteColor[] }
const byKey = (key: string) => COLORS.find(item => item.key === key)!
export const FAMILIES: readonly Family[] = [
  { key: 'white', name: '白・黒', colors: [byKey('white'), byKey('black')] },
  ...['green', 'blue', 'purple', 'pink', 'red', 'orange', 'yellow'].map(key => ({ key, name: byKey(key).name, colors: [byKey(key)] })),
]

export interface PickedKeyword extends Keyword { colorId: string; colorName: string }
export const KEYWORDS: ReadonlyMap<string, PickedKeyword> = new Map(FAMILIES.flatMap(family =>
  keywordsFor(family.colors[0]!).map(keyword => {
    const color = byKey(keyword.id.split('-')[0]!)
    return [keyword.id, { ...keyword, colorId: color.key, colorName: color.name }] as const
  })))
