import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { qrMatrix, qrSvg } from '../src/qrcode/qrcode'

const hasZbar = spawnSync('zbarimg', ['--version']).status === 0

/** Binary PGM with a quiet zone and 8 px per module: the simplest input zbarimg reads without extra tools. */
function decode(text: string): string {
  const m = qrMatrix(text)
  const quiet = 4
  const scale = 8
  const side = (m.length + quiet * 2) * scale
  const buf = Buffer.alloc(side * side, 255)
  m.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (!dark) return
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) buf[((y + quiet) * scale + dy) * side + (x + quiet) * scale + dx] = 0
      }
    }),
  )
  const dir = mkdtempSync(join(tmpdir(), 'qr-'))
  try {
    const file = join(dir, 'qr.pgm')
    writeFileSync(file, Buffer.concat([Buffer.from(`P5\n${side} ${side}\n255\n`), buf]))
    return execFileSync('zbarimg', ['-q', '--raw', file], { encoding: 'utf8' }).replace(/\n$/, '')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

describe('qrMatrix', () => {
  it('picks the smallest version: 21 modules for a short text', () => {
    expect(qrMatrix('MDFe')).toHaveLength(21)
  })

  it('has the three finder patterns', () => {
    const m = qrMatrix('https://example.com')
    const n = m.length
    for (const [x, y] of [[0, 0], [n - 7, 0], [0, n - 7]] as const) {
      expect(m[y]![x]).toBe(true)
      expect(m[y + 3]![x + 3]).toBe(true)
      expect(m[y + 1]![x + 1]).toBe(false)
    }
  })

  it('rejects content that does not fit in version 20-M', () => {
    expect(() => qrMatrix('x'.repeat(700))).toThrowError(/does not fit/)
  })

  it.skipIf(!hasZbar)('round-trips through zbar at every version, including UTF-8', () => {
    const base = 'http://dfe-portal.svrs.rs.gov.br/mdfe/QRCode?chMDFe=43181207312871000190580010000334041421310776&tpAmb=1&sign='
    const lengths = [4, 14, 15, 26, 27, 42, 43, 62, 63, 84, 85, 106, 107, 122, 123, 152, 153, 180, 181, 213, 214, 251, 252, 287, 288, 331, 332, 362, 363, 412, 413, 452, 453, 504, 505, 560, 561, 624, 625, 666]
    for (const len of lengths) {
      const text = (base + 'AbCd+/0123456789'.repeat(60)).slice(0, len)
      expect(decode(text), `length ${len}`).toBe(text)
    }
    expect(decode('Emissão em contingência – ação')).toBe('Emissão em contingência – ação')
  })
})

describe('qrSvg', () => {
  it('is a single path with the requested size', () => {
    const svg = qrSvg('abc', { sizeCm: 2.6, label: 'QR Code' })
    expect(svg).toMatch(/^<svg /)
    expect(svg).toContain('width:2.6cm;height:2.6cm')
    expect(svg.match(/<path /g)).toHaveLength(1)
  })
})
