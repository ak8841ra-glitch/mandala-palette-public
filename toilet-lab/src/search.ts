import { PARTS, type Part } from './data/parts'

// カタカナ→ひらがな、全角英数→半角、小文字化、空白と記号を除去
export function normalize(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[\s・（）()「」、。,.!?！？ー〜~-]/g, '')
}

type Entry = { part: Part; keys: { text: string; weight: number }[] }

const INDEX: Entry[] = PARTS.map((part) => ({
  part,
  keys: [
    { text: normalize(part.name), weight: 4 },
    { text: normalize(part.kana), weight: 4 },
    ...part.aliases.map((a) => ({ text: normalize(a), weight: 3 })),
    ...part.phrases.map((p) => ({ text: normalize(p), weight: 2 })),
  ],
}))

export type Hit = { part: Part; matched: string }

export function searchParts(query: string, limit = 6): Hit[] {
  const q = normalize(query)
  if (!q) return []
  const scored: { part: Part; score: number; matched: string }[] = []
  for (const entry of INDEX) {
    let best = 0
    let matched = ''
    entry.keys.forEach((k, i) => {
      let s = 0
      if (k.text === q) s = 10
      else if (k.text.startsWith(q)) s = 7
      else if (k.text.includes(q)) s = 5
      else if (q.length >= 2 && q.includes(k.text) && k.text.length >= 2) s = 4
      if (s > 0) {
        s += k.weight
        if (s > best) {
          best = s
          matched = labelOf(entry.part, i)
        }
      }
    })
    if (best > 0) scored.push({ part: entry.part, score: best, matched })
  }
  scored.sort((a, b) => b.score - a.score || a.part.level - b.part.level)
  return scored.slice(0, limit).map(({ part, matched }) => ({ part, matched }))
}

function labelOf(part: Part, keyIndex: number): string {
  if (keyIndex <= 1) return ''
  const all = [...part.aliases, ...part.phrases]
  return all[keyIndex - 2] ?? ''
}
