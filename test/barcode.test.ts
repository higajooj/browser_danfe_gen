import { describe, expect, it } from 'vitest'
import { checkDigit, encodeCode128C, symbolModules, barcodeSvg, moduleWidthCm } from '../src/barcode/code128c'
import { mod11, contingencyData } from '../src/key'

describe('CODE-128C (spec chapter 2 example)', () => {
  it('computes check digit 48 for 09758364', () => {
    expect(checkDigit([9, 75, 83, 64])).toBe(48)
  })

  it('produces the module sequence of section 2.2', () => {
    const { widths } = encodeCode128C('09758364')
    expect(widths.join(' ')).toBe(
      '2 1 1 2 3 2 2 2 1 2 1 3 2 4 1 2 1 1 1 1 4 2 1 2 1 1 1 4 2 2 3 1 3 1 2 1 2 3 3 1 1 1 2',
    )
  })

  it('44 digits use 277 modules and stay above the 0.02cm minimum in 8cm', () => {
    const chave = '50210117707168000134550010000403981000840243'
    const { widths } = encodeCode128C(chave)
    expect(widths.reduce((a, b) => a + b, 0)).toBe(symbolModules(44))
    expect(symbolModules(44)).toBe(277)
    expect(moduleWidthCm(44, 8)).toBeGreaterThanOrEqual(0.02)
  })

  it('rejects odd length / non numeric data', () => {
    expect(() => encodeCode128C('123')).toThrow()
    expect(() => encodeCode128C('12ab')).toThrow()
  })

  it('renders an svg with a single path', () => {
    const svg = barcodeSvg('09758364', { widthCm: 8, heightCm: 1 })
    expect(svg).toContain('<svg')
    expect(svg.match(/<path/g)).toHaveLength(1)
  })
})

describe('mod11', () => {
  it('matches the DV of a real access key', () => {
    const chave = '50210117707168000134550010000403981000840243'
    expect(mod11(chave.slice(0, 43))).toBe(Number(chave[43]))
  })
})

describe('contingencyData', () => {
  it('builds 36 digits with a valid dv', () => {
    const d = contingencyData({
      cUF: '50', tpEmis: '2', doc: '36603422115', vNF: '5287.60', icmsProprio: true, icmsST: false, day: 14,
    })
    expect(d).toHaveLength(36)
    expect(d.slice(0, 3)).toBe('502')
    expect(d.slice(3, 17)).toBe('00036603422115')
    expect(d.slice(17, 31)).toBe('00000000528760')
    expect(d.slice(31, 35)).toBe('1214')
    expect(mod11(d.slice(0, 35))).toBe(Number(d[35]))
  })
})
