import { DanfeError } from '../errors'

/**
 * Minimal QR Code encoder: byte mode (UTF-8), error correction level M, versions 1-40.
 * The DAMDFE only needs to print an URL (MOC MDF-e 9.3: level M, UTF-8); the schema allows up to 1000
 * characters (a contingency URL carries the RSA signature), which needs version 26.
 */

/** [EC codewords per block, blocks of group 1, data codewords of group 1 blocks, blocks of group 2, data codewords of group 2 blocks], versions 1..40. */
const EC_M: readonly (readonly [number, number, number, number, number])[] = [
  [10, 1, 16, 0, 0],
  [16, 1, 28, 0, 0],
  [26, 1, 44, 0, 0],
  [18, 2, 32, 0, 0],
  [24, 2, 43, 0, 0],
  [16, 4, 27, 0, 0],
  [18, 4, 31, 0, 0],
  [22, 2, 38, 2, 39],
  [22, 3, 36, 2, 37],
  [26, 4, 43, 1, 44],
  [30, 1, 50, 4, 51],
  [22, 6, 36, 2, 37],
  [22, 8, 37, 1, 38],
  [24, 4, 40, 5, 41],
  [24, 5, 41, 5, 42],
  [28, 7, 45, 3, 46],
  [28, 10, 46, 1, 47],
  [26, 9, 43, 4, 44],
  [26, 3, 44, 11, 45],
  [26, 3, 41, 13, 42],
  [26, 17, 42, 0, 0],
  [28, 17, 46, 0, 0],
  [28, 4, 47, 14, 48],
  [28, 6, 45, 14, 46],
  [28, 8, 47, 13, 48],
  [28, 19, 46, 4, 47],
  [28, 22, 45, 3, 46],
  [28, 3, 45, 23, 46],
  [28, 21, 45, 7, 46],
  [28, 19, 47, 10, 48],
  [28, 2, 46, 29, 47],
  [28, 10, 46, 23, 47],
  [28, 14, 46, 21, 47],
  [28, 14, 46, 23, 47],
  [28, 12, 47, 26, 48],
  [28, 6, 47, 34, 48],
  [28, 29, 46, 14, 47],
  [28, 13, 46, 32, 47],
  [28, 40, 47, 7, 48],
  [28, 18, 47, 31, 48],
]

/** Centres of the alignment patterns, versions 1..40. */
const ALIGN: readonly (readonly number[])[] = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
  [6, 26, 48, 70],
  [6, 26, 50, 74],
  [6, 30, 54, 78],
  [6, 30, 56, 82],
  [6, 30, 58, 86],
  [6, 34, 62, 90],
  [6, 28, 50, 72, 94],
  [6, 26, 50, 74, 98],
  [6, 30, 54, 78, 102],
  [6, 28, 54, 80, 106],
  [6, 32, 58, 84, 110],
  [6, 30, 58, 86, 114],
  [6, 34, 62, 90, 118],
  [6, 26, 50, 74, 98, 122],
  [6, 30, 54, 78, 102, 126],
  [6, 26, 52, 78, 104, 130],
  [6, 30, 56, 82, 108, 134],
  [6, 34, 60, 86, 112, 138],
  [6, 30, 58, 86, 114, 142],
  [6, 34, 62, 90, 118, 146],
  [6, 30, 54, 78, 102, 126, 150],
  [6, 24, 50, 76, 102, 128, 154],
  [6, 28, 54, 80, 106, 132, 158],
  [6, 32, 58, 84, 110, 136, 162],
  [6, 26, 54, 82, 110, 138, 166],
  [6, 30, 58, 86, 114, 142, 170],
]

const MAX_VERSION = EC_M.length
/** Format bits of the error correction level (M = 0b00). */
const ECL_M_BITS = 0

const dataCodewords = (v: number): number => {
  const [, n1, d1, n2, d2] = EC_M[v - 1] as (typeof EC_M)[number]
  return n1 * d1 + n2 * d2
}

// --- Reed-Solomon over GF(256), primitive polynomial 0x11D -------------------------------------

function gfMul(x: number, y: number): number {
  let z = 0
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d)
    z ^= ((y >>> i) & 1) * x
  }
  return z
}

function rsDivisor(degree: number): number[] {
  const result: number[] = new Array(degree).fill(0)
  result[degree - 1] = 1
  let root = 1
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMul(result[j] as number, root)
      if (j + 1 < degree) result[j] = (result[j] as number) ^ (result[j + 1] as number)
    }
    root = gfMul(root, 0x02)
  }
  return result
}

function rsRemainder(data: readonly number[], divisor: readonly number[]): number[] {
  const result: number[] = new Array(divisor.length).fill(0)
  for (const b of data) {
    const factor = b ^ (result.shift() as number)
    result.push(0)
    divisor.forEach((coef, i) => {
      result[i] = (result[i] as number) ^ gfMul(coef, factor)
    })
  }
  return result
}

// --- Bit stream ---------------------------------------------------------------------------------

function utf8(text: string): number[] {
  return Array.from(new TextEncoder().encode(text))
}

function pickVersion(byteLength: number): number {
  for (let v = 1; v <= MAX_VERSION; v++) {
    const countBits = v < 10 ? 8 : 16
    if (4 + countBits + byteLength * 8 <= dataCodewords(v) * 8) return v
  }
  throw new DanfeError('qr-too-long', `QR Code content of ${byteLength} bytes does not fit in version ${MAX_VERSION}-M`)
}

function dataBits(bytes: readonly number[], version: number): number[] {
  const bits: number[] = []
  const push = (value: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((value >>> i) & 1)
  }
  push(0b0100, 4)
  push(bytes.length, version < 10 ? 8 : 16)
  for (const b of bytes) push(b, 8)
  const capacity = dataCodewords(version) * 8
  push(0, Math.min(4, capacity - bits.length))
  while (bits.length % 8 !== 0) bits.push(0)
  for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) push(pad, 8)
  return bits
}

function toCodewords(bits: readonly number[]): number[] {
  const out: number[] = []
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0
    for (let j = 0; j < 8; j++) b = (b << 1) | (bits[i + j] as number)
    out.push(b)
  }
  return out
}

/** Split into blocks, append the Reed-Solomon codewords and interleave. */
function interleave(data: readonly number[], version: number): number[] {
  const [ecLen, n1, d1, n2, d2] = EC_M[version - 1] as (typeof EC_M)[number]
  const divisor = rsDivisor(ecLen)
  const blocks: { data: number[]; ec: number[] }[] = []
  let k = 0
  for (let i = 0; i < n1 + n2; i++) {
    const len = i < n1 ? d1 : d2
    const chunk = data.slice(k, k + len)
    k += len
    blocks.push({ data: chunk, ec: rsRemainder(chunk, divisor) })
  }
  const out: number[] = []
  const maxData = Math.max(d1, d2)
  for (let i = 0; i < maxData; i++) for (const b of blocks) if (i < b.data.length) out.push(b.data[i] as number)
  for (let i = 0; i < ecLen; i++) for (const b of blocks) out.push(b.ec[i] as number)
  return out
}

// --- Matrix -------------------------------------------------------------------------------------

class Grid {
  readonly size: number
  readonly dark: boolean[][]
  readonly fn: boolean[][]

  constructor(readonly version: number) {
    this.size = 17 + 4 * version
    this.dark = Array.from({ length: this.size }, () => new Array<boolean>(this.size).fill(false))
    this.fn = Array.from({ length: this.size }, () => new Array<boolean>(this.size).fill(false))
    this.drawFunctionPatterns()
  }

  private setFn(x: number, y: number, dark: boolean): void {
    ;(this.dark[y] as boolean[])[x] = dark
    ;(this.fn[y] as boolean[])[x] = true
  }

  private drawFunctionPatterns(): void {
    const { size } = this
    for (let i = 0; i < size; i++) {
      this.setFn(6, i, i % 2 === 0)
      this.setFn(i, 6, i % 2 === 0)
    }
    this.drawFinder(3, 3)
    this.drawFinder(size - 4, 3)
    this.drawFinder(3, size - 4)
    const pos = ALIGN[this.version - 1] as readonly number[]
    const n = pos.length
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue
        this.drawAlignment(pos[i] as number, pos[j] as number)
      }
    }
    this.drawFormat(0)
    this.drawVersion()
  }

  private drawFinder(cx: number, cy: number): void {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx
        const y = cy + dy
        if (x < 0 || y < 0 || x >= this.size || y >= this.size) continue
        const dist = Math.max(Math.abs(dx), Math.abs(dy))
        this.setFn(x, y, dist !== 2 && dist !== 4)
      }
    }
  }

  private drawAlignment(cx: number, cy: number): void {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) this.setFn(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1)
    }
  }

  drawFormat(mask: number): void {
    const data = (ECL_M_BITS << 3) | mask
    let rem = data
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537)
    const bits = ((data << 10) | rem) ^ 0x5412
    const bit = (i: number) => ((bits >>> i) & 1) !== 0
    const { size } = this
    for (let i = 0; i <= 5; i++) this.setFn(8, i, bit(i))
    this.setFn(8, 7, bit(6))
    this.setFn(8, 8, bit(7))
    this.setFn(7, 8, bit(8))
    for (let i = 9; i < 15; i++) this.setFn(14 - i, 8, bit(i))
    for (let i = 0; i < 8; i++) this.setFn(size - 1 - i, 8, bit(i))
    for (let i = 8; i < 15; i++) this.setFn(8, size - 15 + i, bit(i))
    this.setFn(8, size - 8, true)
  }

  private drawVersion(): void {
    if (this.version < 7) return
    let rem = this.version
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25)
    const bits = (this.version << 12) | rem
    for (let i = 0; i < 18; i++) {
      const dark = ((bits >>> i) & 1) !== 0
      const a = this.size - 11 + (i % 3)
      const b = Math.floor(i / 3)
      this.setFn(a, b, dark)
      this.setFn(b, a, dark)
    }
  }

  drawCodewords(data: readonly number[]): void {
    const { size } = this
    let i = 0
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5
      for (let vert = 0; vert < size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j
          const upward = ((right + 1) & 2) === 0
          const y = upward ? size - 1 - vert : vert
          if (!(this.fn[y] as boolean[])[x] && i < data.length * 8) {
            ;(this.dark[y] as boolean[])[x] = (((data[i >>> 3] as number) >>> (7 - (i & 7))) & 1) !== 0
            i++
          }
        }
      }
    }
  }

  applyMask(mask: number): void {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        let invert: boolean
        switch (mask) {
          case 0: invert = (x + y) % 2 === 0; break
          case 1: invert = y % 2 === 0; break
          case 2: invert = x % 3 === 0; break
          case 3: invert = (x + y) % 3 === 0; break
          case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break
          case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break
          case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break
          default: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0
        }
        if (invert && !(this.fn[y] as boolean[])[x]) {
          const row = this.dark[y] as boolean[]
          row[x] = !row[x]
        }
      }
    }
  }

  /** Mask selection score (ISO 18004 8.8.2: runs, 2x2 blocks, finder-like patterns, dark balance). */
  penalty(): number {
    const { size, dark } = this
    const at = (x: number, y: number) => (dark[y] as boolean[])[x] as boolean
    let score = 0
    const line = (get: (i: number) => boolean) => {
      let run = 1
      for (let i = 1; i < size; i++) {
        if (get(i) === get(i - 1)) {
          run++
        } else {
          if (run >= 5) score += 3 + (run - 5)
          run = 1
        }
      }
      if (run >= 5) score += 3 + (run - 5)
      // 1:1:3:1:1 finder-like pattern with a light zone of four modules on one side.
      for (let i = 0; i + 11 <= size; i++) {
        const a = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0]
        let fwd = true
        let rev = true
        for (let k = 0; k < 11; k++) {
          const v = get(i + k) ? 1 : 0
          if (v !== a[k]) fwd = false
          if (v !== a[10 - k]) rev = false
        }
        if (fwd) score += 40
        if (rev) score += 40
      }
    }
    for (let y = 0; y < size; y++) line((x) => at(x, y))
    for (let x = 0; x < size; x++) line((y) => at(x, y))
    for (let y = 0; y + 1 < size; y++) {
      for (let x = 0; x + 1 < size; x++) {
        const c = at(x, y)
        if (c === at(x + 1, y) && c === at(x, y + 1) && c === at(x + 1, y + 1)) score += 3
      }
    }
    let count = 0
    for (const row of dark) for (const d of row) if (d) count++
    const total = size * size
    score += (Math.ceil(Math.abs(count * 20 - total * 10) / total) - 1) * 10
    return score
  }
}

/** Dark modules of the QR Code for `text` (row-major, `true` = dark). */
export function qrMatrix(text: string): boolean[][] {
  const bytes = utf8(text)
  const version = pickVersion(bytes.length)
  const codewords = interleave(toCodewords(dataBits(bytes, version)), version)
  const grid = new Grid(version)
  grid.drawCodewords(codewords)

  let best = 0
  let bestScore = Infinity
  for (let mask = 0; mask < 8; mask++) {
    grid.applyMask(mask)
    grid.drawFormat(mask)
    const score = grid.penalty()
    if (score < bestScore) {
      best = mask
      bestScore = score
    }
    grid.applyMask(mask) // XOR again: undo
  }
  grid.applyMask(best)
  grid.drawFormat(best)
  return grid.dark
}

export interface QrSvgOptions {
  /** Side of the whole symbol, quiet zone included, in cm. */
  sizeCm: number
  /** Quiet zone in modules (spec: at least 4). */
  quietModules?: number
  label?: string
}

/** Inline SVG with a single <path>; horizontal runs of dark modules are merged. */
export function qrSvg(text: string, opts: QrSvgOptions): string {
  const m = qrMatrix(text)
  const quiet = opts.quietModules ?? 4
  const n = m.length
  let d = ''
  for (let y = 0; y < n; y++) {
    const row = m[y] as boolean[]
    for (let x = 0; x < n; x++) {
      if (!row[x]) continue
      let run = 1
      while (x + run < n && row[x + run]) run++
      d += `M${x + quiet} ${y + quiet}h${run}v1h-${run}z`
      x += run - 1
    }
  }
  const vb = n + quiet * 2
  const label = opts.label ? ` role="img" aria-label="${opts.label}"` : ''
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" class="qr" viewBox="0 0 ${vb} ${vb}" shape-rendering="crispEdges"` +
    ` style="width:${opts.sizeCm}cm;height:${opts.sizeCm}cm"${label}><path d="${d}" fill="#000"/></svg>`
  )
}
