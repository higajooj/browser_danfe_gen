import { describe, expect, it } from 'vitest'
import { firstSheetInfCapacity, firstSheetItemCapacity, nextSheetItemCapacity, paginate } from '../src/layout/paginate'

const lines = (n: number) => Array.from({ length: n }, (_, i) => ({ row: i, last: true }))
const info = (n: number) => Array.from({ length: n }, (_, i) => `i${i}`)

describe('paginate', () => {
  it('fits a small note on one sheet', () => {
    const p = paginate({ itemLines: lines(5), infLines: info(3) })
    expect(p.pages).toHaveLength(1)
    expect(p.infContinues).toBe(false)
    expect(p.firstInfLines).toHaveLength(3)
  })

  it('uses the larger continuation capacity after the first sheet', () => {
    const first = firstSheetItemCapacity()
    const next = nextSheetItemCapacity()
    expect(next).toBeGreaterThan(first)
    const p = paginate({ itemLines: lines(first + next + 1), infLines: [] })
    expect(p.pages.map((x) => x.lines.length)).toEqual([first, next, 1])
    expect(p.pages.map((x) => x.folha)).toEqual([1, 2, 3])
  })

  it('never loses item or info lines', () => {
    for (const [n, m] of [[0, 0], [1, 500], [200, 0], [77, 130], [23, 11], [24, 12]] as const) {
      const p = paginate({ itemLines: lines(n), infLines: info(m) })
      expect(p.pages.flatMap((x) => x.lines)).toHaveLength(n)
      const printed = p.firstInfLines.length + p.pages.reduce((a, x) => a + x.infLines.length, 0)
      expect(printed).toBe(m)
    }
  })

  it('reserves one line of the first box for the "continues" marker', () => {
    const cap = firstSheetInfCapacity()
    const p = paginate({ itemLines: lines(1), infLines: info(cap + 1) })
    expect(p.infContinues).toBe(true)
    expect(p.firstInfLines).toHaveLength(cap - 1)
  })
})
