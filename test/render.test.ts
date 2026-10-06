import { describe, expect, it } from 'vitest'
import { generateDanfeHtml } from '../src'
import { fixture } from './helpers'

const pages = (html: string) => (html.match(/<section class="page">/g) ?? []).length
const base = fixture('HR_ACO')

/** Duplicate the single <det> of the fixture n times (renumbered). */
function withItems(xml: string, n: number, infAdProd?: string): string {
  const m = /<det nItem="1">[\s\S]*?<\/det>/.exec(xml)
  if (!m) throw new Error('fixture without det')
  const det = infAdProd ? m[0].replace(/<infAdProd>[\s\S]*?<\/infAdProd>/, `<infAdProd>${infAdProd}</infAdProd>`) : m[0]
  const dets = Array.from({ length: n }, (_, i) => det.replace('nItem="1"', `nItem="${i + 1}"`)).join('\n')
  return xml.replace(m[0], dets)
}

describe('generateDanfeHtml', () => {
  it('produces a single A4 sheet for the fixture, with the spec landmarks', () => {
    const html = generateDanfeHtml(base)
    expect(pages(html)).toBe(1)
    expect(html).toContain('@page { size: 21cm 29.7cm; margin: 0 }')
    expect(html).toContain('<title>DANFE 50210117707168000134550010000403981000840243</title>')
    expect(html).toContain('5021 0117 7071 6800 0134 5500 1000 0403 9810 0084 0243')
    expect(html).toContain('Nº</small> 000.040.398')
    expect(html).toContain('FOLHA</small> 01/01')
    expect(html).toContain('150210000673328 08/01/2021 16:00:37')
    expect(html).toContain('<svg')
  })

  it('renders a note of an alphanumeric CNPJ, letters kept in the chave and in the CNPJ (NT conjunta DFe 2025.001)', () => {
    const html = generateDanfeHtml(base.replaceAll('17707168000134', '12ABC34501DE35'))
    expect(pages(html)).toBe(1)
    expect(html).toContain('<title>DANFE 50210112ABC34501DE35550010000403981000840243</title>')
    expect(html).toContain('5021 0112 ABC3 4501 DE35 5500 1000 0403 9810 0084 0243')
    expect(html).toContain('12.ABC.345/01DE-35')
    expect(html).toContain('class="barcode"')
  })

  it('is self-contained: no scripts, no external resources', () => {
    const html = generateDanfeHtml(base)
    expect(html).not.toMatch(/<script/i)
    expect(html).not.toMatch(/(src|href)="https?:/i)
  })

  it('escapes XML-derived text', () => {
    const xml = base.replace('VENDA MERC. ADQ. OU RECEBIDA TERCEIRO', '&lt;img src=x onerror=alert(1)&gt; &amp; "q"')
    const html = generateDanfeHtml(xml)
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt; &amp; &quot;q&quot;')
  })

  it('splits long item lists over sheets and numbers them FOLHA n/N', () => {
    const html = generateDanfeHtml(withItems(base, 60))
    const n = pages(html)
    expect(n).toBeGreaterThan(1)
    for (let i = 1; i <= n; i++) {
      expect(html).toContain(`FOLHA</small> ${String(i).padStart(2, '0')}/${String(n).padStart(2, '0')}`)
    }
    // every item is printed exactly once
    expect(html.match(/ESPACADOR ETGA H16 LEVE 6 MT/g)).toHaveLength(60)
    // canhoto only on the first sheet
    expect(html.match(/RECEBEMOS DE/g)).toHaveLength(1)
  })

  it('keeps growing sheets for 120 items without losing any', () => {
    const html = generateDanfeHtml(withItems(base, 120))
    expect(pages(html)).toBeGreaterThan(2)
    expect(html.match(/ESPACADOR ETGA H16 LEVE 6 MT/g)).toHaveLength(120)
  })

  it('continues informações complementares on the next sheet', () => {
    const long = Array.from({ length: 60 }, (_, i) => `LINHA ${i + 1} DE INFORMACOES COMPLEMENTARES`).join('|')
    const xml = base.replace(/<infCpl>[\s\S]*?<\/infCpl>/, `<infCpl>${long}</infCpl>`)
    const html = generateDanfeHtml(xml)
    expect(pages(html)).toBeGreaterThan(1)
    expect(html).toContain('CONTINUA NA PRÓXIMA FOLHA')
    expect(html).toContain('Informações complementares (continuação)')
    for (let i = 1; i <= 60; i++) expect(html).toContain(`LINHA ${i} DE INFORMACOES`)
  })

  it('never drops informações complementares when items share the sheets', () => {
    const long = Array.from({ length: 100 }, (_, i) => `LINHA ${i + 1} DE INFORMACOES COMPLEMENTARES`).join('|')
    const xml = withItems(base, 40).replace(/<infCpl>[\s\S]*?<\/infCpl>/, `<infCpl>${long}</infCpl>`)
    const html = generateDanfeHtml(xml)
    expect(html.match(/ESPACADOR ETGA H16 LEVE 6 MT/g)).toHaveLength(40)
    for (let i = 1; i <= 100; i++) expect(html).toContain(`LINHA ${i} DE INFORMACOES`)
  })

  it('prints SEM VALOR FISCAL for homologação', () => {
    const html = generateDanfeHtml(base.replace(/<tpAmb>1<\/tpAmb>/, '<tpAmb>2</tpAmb>'))
    expect(html).toContain('class="wm">SEM VALOR FISCAL')
  })

  it('flags a missing protocol, and accepts one through options', () => {
    const xml = base.slice(base.indexOf('<NFe'), base.indexOf('</NFe>') + 6)
    expect(generateDanfeHtml(xml)).toContain('NF-e sem protocolo de autorização')
    const html = generateDanfeHtml(xml, { protocol: { nProt: '123', dateTime: '2021-01-08T10:00:00-04:00' } })
    expect(html).toContain('123 08/01/2021 10:00:00')
  })

  it('FS contingency prints the additional "Dados da NF-e" barcode (36 digits, 9 blocks)', () => {
    const html = generateDanfeHtml(base.replace(/<tpEmis>1<\/tpEmis>/, '<tpEmis>2</tpEmis>'))
    expect(html).toContain('Dados da NF-e')
    expect(html).toMatch(/50\d{2} \d{4} \d{4} \d{4} \d{4} \d{4} \d{4} \d{4} \d{4}</)
    expect(html.match(/<svg/g)).toHaveLength(2)
  })

  it('EPEC uses the EPEC protocol wording', () => {
    const html = generateDanfeHtml(base.replace(/<tpEmis>1<\/tpEmis>/, '<tpEmis>4</tpEmis>'))
    expect(html).toContain('Protocolo de autorização do EPEC')
  })

  it('only accepts data: image URIs as logo', () => {
    const ok = generateDanfeHtml(base, { logoDataUri: 'data:image/png;base64,AAAA' })
    expect(ok).toContain('<img alt="" src="data:image/png;base64,AAAA">')
    const bad = generateDanfeHtml(base, { logoDataUri: 'https://evil.example/x.png' })
    expect(bad).not.toContain('evil.example')
  })
})
