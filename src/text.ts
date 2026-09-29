/**
 * Deterministic text measurement. The generator never touches the DOM, so widths are estimated
 * with conservative per-glyph advances (em) of Times New Roman / Liberation Serif and Courier New.
 * Estimates err on the wide side: text may wrap or shrink earlier than strictly needed, never later.
 */
export type FontKind = 'times' | 'courier'

export const PT_CM = 2.54 / 72
const SAFETY = 1.05
const BOLD = 1.06

const NARROW_UPPER = new Set('IJ')
const WIDE_UPPER = new Set('MW')
const NARROW_LOWER = new Set('ijlft')
const WIDE_LOWER = new Set('mw')
const PUNCT = new Set(".,:;'|!`´")

function timesAdvance(c: string): number {
  if (c >= '0' && c <= '9') return 0.5
  if (c === ' ') return 0.25
  if (PUNCT.has(c)) return 0.28
  if ('()[]-/\\'.includes(c)) return 0.34
  if (c === '%') return 0.84
  if (c === '&' || c === '@') return 0.8
  const up = c.toUpperCase()
  if (up !== c.toLowerCase() || /[À-ÿ]/.test(c)) {
    const isUpper = c === up
    if (isUpper) {
      if (NARROW_UPPER.has(c)) return 0.4
      if (WIDE_UPPER.has(c)) return 0.94
      return 0.72
    }
    if (NARROW_LOWER.has(c)) return 0.3
    if (WIDE_LOWER.has(c)) return 0.78
    return 0.5
  }
  return 0.55
}

export function textWidthCm(text: string, pt: number, bold = false, font: FontKind = 'times'): number {
  let em = 0
  for (const c of text) em += font === 'courier' ? 0.6 : timesAdvance(c)
  return em * pt * PT_CM * SAFETY * (bold && font === 'times' ? BOLD : 1)
}

/** Split on explicit line breaks. '|' is the line break emitted by many ERPs in infCpl. */
export function splitParagraphs(text: string): string[] {
  return text.split(/\r?\n|\|/).map((s) => s.trim())
}

/** Greedy wrap into lines no wider than `widthCm`. Over-long tokens are broken by character. */
export function wrapText(text: string, widthCm: number, pt: number, bold = false, font: FontKind = 'times'): string[] {
  const out: string[] = []
  const w = (s: string) => textWidthCm(s, pt, bold, font)
  for (const para of splitParagraphs(text)) {
    if (para === '') {
      out.push('')
      continue
    }
    let line = ''
    for (const word of para.split(/\s+/)) {
      let token = word
      const candidate = line ? `${line} ${token}` : token
      if (w(candidate) <= widthCm) {
        line = candidate
        continue
      }
      if (line) {
        out.push(line)
        line = ''
      }
      while (w(token) > widthCm && token.length > 1) {
        let n = token.length - 1
        while (n > 1 && w(token.slice(0, n)) > widthCm) n--
        out.push(token.slice(0, n))
        token = token.slice(n)
      }
      line = token
    }
    if (line) out.push(line)
  }
  return out
}

/** Largest size in [minPt, maxPt] (0.5pt steps) at which `text` fits in one line; minPt if none does. */
export function fitPt(
  text: string,
  widthCm: number,
  maxPt: number,
  minPt: number,
  bold = false,
  font: FontKind = 'times',
): number {
  for (let pt = maxPt; pt > minPt; pt -= 0.5) {
    if (textWidthCm(text, pt, bold, font) <= widthCm) return pt
  }
  return minPt
}
