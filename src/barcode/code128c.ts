/**
 * CODE-128C encoder as described in MOC 7.0 Anexo II, chapter 2 and Anexo III.01.
 * Patterns are bar/space module widths (B S B S B S), stop has 7 entries.
 */
const PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232',
]
const STOP = '2331112'
const START_C = 105

/** Modules of a full symbol for N digit pairs: start(11) + pairs*11 + check(11) + stop(13). */
export function symbolModules(digitCount: number): number {
  return 11 + (digitCount / 2) * 11 + 11 + 13
}

/** Check digit: (start + sum(position * value)) mod 103. */
export function checkDigit(values: number[]): number {
  let sum = START_C
  values.forEach((v, i) => {
    sum += (i + 1) * v
  })
  return sum % 103
}

export interface Code128C {
  /** Symbol values of the data pairs (no start/check/stop). */
  values: number[]
  check: number
  /** Alternating bar/space module widths for the whole symbol, starting with a bar. */
  widths: number[]
}

export function encodeCode128C(data: string): Code128C {
  if (!/^\d+$/.test(data) || data.length % 2 !== 0) {
    throw new Error('CODE-128C requires an even number of digits')
  }
  const values: number[] = []
  for (let i = 0; i < data.length; i += 2) values.push(Number(data.slice(i, i + 2)))
  const check = checkDigit(values)
  const seq = [PATTERNS[START_C], ...values.map((v) => PATTERNS[v]), PATTERNS[check], STOP]
  const widths = seq.join('').split('').map(Number)
  return { values, check, widths }
}

export interface BarcodeSvgOptions {
  /** Total width of the SVG in cm (includes the quiet zones). */
  widthCm: number
  /** Bar height in cm. */
  heightCm: number
  /** Quiet zone on each side, in modules (spec: at least 10). */
  quietModules?: number
  label?: string
}

/** Inline SVG. One <path> for all bars so print output stays crisp and small. */
export function barcodeSvg(data: string, opts: BarcodeSvgOptions): string {
  const { widths } = encodeCode128C(data)
  const quiet = opts.quietModules ?? 10
  const total = widths.reduce((a, b) => a + b, 0)
  let x = quiet
  let d = ''
  widths.forEach((w, i) => {
    if (i % 2 === 0) d += `M${x} 0h${w}v1h-${w}z`
    x += w
  })
  const vbW = total + quiet * 2
  const label = opts.label ? ` role="img" aria-label="${opts.label}"` : ''
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" class="barcode" viewBox="0 0 ${vbW} 1" preserveAspectRatio="none"` +
    ` shape-rendering="crispEdges" style="width:${opts.widthCm}cm;height:${opts.heightCm}cm"${label}>` +
    `<path d="${d}" fill="#000"/></svg>`
  )
}

/** Width in cm of one module when the whole symbol (with quiet zones) is drawn over `widthCm`. */
export function moduleWidthCm(digitCount: number, widthCm: number, quietModules = 10): number {
  return widthCm / (symbolModules(digitCount) + quietModules * 2)
}
