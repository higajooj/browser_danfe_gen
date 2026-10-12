import { describe, expect, it } from 'vitest'
import { DanfeError, generateDamdfeHtml, generateDanfeHtml } from '../src'
import { fixture } from './helpers'

const pages = (html: string) => (html.match(/<section class="page">/g) ?? []).length
const rodo = fixture('MDFE_RODO')
const cont = fixture('MDFE_RODO_CONT')

/** Repeat the first <infCTe> of a fixture n times. */
function withDocs(xml: string, n: number): string {
  const m = /<infCTe>[\s\S]*?<\/infCTe>/.exec(xml)
  if (!m) throw new Error('fixture without infCTe')
  return xml.replace(/<infMunDescarga>[\s\S]*<\/infMunDescarga>/, `<infMunDescarga><cMunDescarga>3550308</cMunDescarga><xMunDescarga>Sao Paulo</xMunDescarga>${m[0].repeat(n)}</infMunDescarga>`)
}

describe('DAMDFE', () => {
  it('is rendered by generateDanfeHtml for an MDF-e, with the spec landmarks', () => {
    const html = generateDanfeHtml(rodo)
    expect(html).toBe(generateDamdfeHtml(rodo))
    expect(pages(html)).toBe(1)
    expect(html).toContain('@page { size: 21cm 29.7cm; margin: 0 }')
    expect(html).toMatch(/<title>DAMDFE 4324101122233300018158001000000888142133901\d<\/title>/)
    expect(html).toContain('<b>DAMDFE</b> - Documento Auxiliar de Manifesto Eletrônico de Documentos Fiscais')
    expect(html).toContain('Modelo Rodoviário de Carga')
    expect(html).toContain('4324 1011 2223 3300 0181 5800 1000 0008 8814 2133 9019')
    expect(html).toContain('143240000012345 - 10/10/2024 às 10:58:03-03:00')
    expect(html).toContain('>1/1<')
    expect(html).toContain('class="barcode"')
    expect(html).toContain('class="qr"')
    expect(html).toContain('XYZ9A99')
    expect(html).toContain('123.456.789-09')
    expect(html).toContain('77.888.777/0001-00')
  })

  it('still renders an NF-e as before and rejects anything else', () => {
    expect(generateDanfeHtml(fixture('HR_ACO'))).toContain('<title>DANFE ')
    expect(() => generateDanfeHtml('<resNFe/>')).toThrowError(DanfeError)
  })

  it('prints the contingency notice, its deadline and the aggregated documents', () => {
    const html = generateDanfeHtml(cont)
    expect(html).toContain('EMISSÃO EM CONTINGÊNCIA.</b> Obrigatória a autorização em 168 horas após esta emissão (17/10/2024 10:55)')
    expect(html).toContain('Informações da Composição da Carga')
    expect(html).toContain('Rodoviário Tração XYZ9A99')
    expect(html).toContain('Container MSKU1234567')
    expect(html.match(/CT-e {2}\d{4} /g)).toHaveLength(4)
    expect(html).not.toContain('MDF-e sem protocolo')
  })

  it('does not list the aggregated documents of a normally emitted MDF-e', () => {
    expect(generateDanfeHtml(rodo)).not.toContain('Informações da Composição da Carga')
  })

  it('prints the protocol of an authorized contingency MDF-e instead of the notice', () => {
    const html = generateDanfeHtml(cont, { protocol: { nProt: '943240000099999', dateTime: '2024-10-11T09:00:00-03:00' } })
    expect(html).toContain('943240000099999 - 11/10/2024 às 09:00:00-03:00')
    expect(html).not.toContain('EMISSÃO EM CONTINGÊNCIA')
  })

  it('marks the homologação environment', () => {
    const html = generateDanfeHtml(rodo.replace('<tpAmb>1</tpAmb>', '<tpAmb>2</tpAmb>'))
    expect(html).toContain('EMITIDO EM AMBIENTE DE HOMOLOGAÇÃO – SEM VALOR FISCAL')
    expect(html).toContain('class="wm"')
    expect(generateDanfeHtml(rodo)).not.toContain('HOMOLOGAÇÃO')
  })

  it('renders the other modals', () => {
    expect(generateDanfeHtml(fixture('MDFE_AEREO'))).toContain('Modelo Aéreo de Carga')
    expect(generateDanfeHtml(fixture('MDFE_AEREO'))).toContain('AB1234')
    const aquav = generateDanfeHtml(fixture('MDFE_AQUAV'))
    expect(aquav).toContain('Modelo Aquaviário de Carga')
    expect(aquav).toContain('0123456789 - NAVIO EXEMPLO DE CARGA')
    expect(aquav).toContain('Qtd. MDF-e Ref.')
    const ferrov = generateDanfeHtml(fixture('MDFE_FERROV'))
    expect(ferrov).toContain('Modelo Ferroviário de Carga')
    expect(ferrov).toContain('9852989900')
    expect(ferrov.match(/9998700\d/g)).toHaveLength(6)
  })

  it('keeps the letters of an alphanumeric CNPJ in the chave and the emitente', () => {
    const html = generateDanfeHtml(rodo.replaceAll('11222333000181', '12ABC34501DE35'))
    expect(html).toContain('4324 1012 ABC3 4501 DE35 5800 1000 0008 8814 2133 9019')
    expect(html).toContain('12.ABC.345/01DE-35')
  })

  it('builds the QR URL from the chave when the XML has no qrCodMDFe (normal emission only)', () => {
    const noQr = rodo.replace(/<infMDFeSupl>[\s\S]*<\/infMDFeSupl>/, '')
    expect(generateDanfeHtml(noQr)).toContain('class="qr"')
    expect(generateDanfeHtml(cont.replace(/<infMDFeSupl>[\s\S]*<\/infMDFeSupl>/, ''))).not.toContain('class="qr"')
  })

  it('is self-contained: no scripts, no external resources', () => {
    const html = generateDanfeHtml(rodo)
    expect(html).not.toMatch(/<script/i)
    expect(html).not.toMatch(/(src|href)="https?:/i)
  })

  it('escapes XML-derived text and restricts the logo to data: images', () => {
    const xml = rodo.replace('Observacoes do manifesto de exemplo.', '&lt;img src=x onerror=alert(1)&gt; &amp; "q"')
    const html = generateDanfeHtml(xml)
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt; &amp; &quot;q&quot;')
    expect(generateDanfeHtml(rodo, { logoDataUri: 'https://evil.example/x.png' })).not.toContain('evil.example')
    expect(generateDanfeHtml(rodo, { logoDataUri: 'data:image/png;base64,AAAA' })).toContain('<img alt="" src="data:image/png;base64,AAAA"')
  })

  it('splits long lists over sheets, numbers them FL n/N and prints every document once', () => {
    const html = generateDanfeHtml(withDocs(cont, 150))
    const n = pages(html)
    expect(n).toBeGreaterThan(1)
    for (let i = 1; i <= n; i++) expect(html).toContain(`>${i}/${n}<`)
    expect(html.match(/Rodoviário Tração XYZ9A99/g)).toHaveLength(150)
    // column headers are repeated on continuation sheets
    expect(html.match(/Informações dos documentos fiscais vinculados ao manifesto/g)).toHaveLength(n)
  })

  it('wraps long observations instead of clipping them', () => {
    const text = Array.from({ length: 40 }, (_, i) => `linha${i} `.repeat(12)).join('|')
    const html = generateDanfeHtml(rodo.replace('Observacoes do manifesto de exemplo.', text))
    expect(pages(html)).toBeGreaterThan(1)
    for (let i = 0; i < 40; i++) expect(html).toContain(`linha${i}`)
  })
})
