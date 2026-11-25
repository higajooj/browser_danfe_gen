import { describe, expect, it } from 'vitest'
import { DanfeError, generateDacteHtml, generateDanfeHtml } from '../src'
import { fixture } from './helpers'

const pages = (html: string) => (html.match(/<section class="page">/g) ?? []).length
const rodo = fixture('CTE_RODO')
const fsda = fixture('CTE_RODO_FSDA')
const os = fixture('CTE_OS')

function withNfes(xml: string, n: number): string {
  const m = /<infNFe>[\s\S]*?<\/infNFe>/.exec(xml)
  if (!m) throw new Error('fixture without infNFe')
  return xml.replace(/<infDoc>[\s\S]*?<\/infDoc>/, `<infDoc>${m[0].repeat(n)}</infDoc>`)
}

describe('DACTE', () => {
  it('is auto-detected by generateDanfeHtml and matches generateDacteHtml', () => {
    const html = generateDanfeHtml(rodo)
    expect(html).toBe(generateDacteHtml(rodo))
    expect(pages(html)).toBe(1)
    expect(html).toContain('@page { size: 21cm 29.7cm; margin: 0 }')
    expect(html).toContain('<title>DACTE 35241011222333000181570010000001231421339010</title>')
    expect(html).toContain('DACTE')
    expect(html).toContain('RODOVIÁRIO')
    expect(html).toContain('3524 1011 2223 3300 0181 5700 1000 0001 2314 2133 9010')
    expect(html).toContain('135240000054321 - 15/10/2024 14:22:15')
    expect(html).toContain('>1/1<')
    expect(html).toContain('class="barcode"')
    expect(html).toContain('class="qr"')
    expect(html).toContain('12345678') // RNTRC
    expect(html).toContain('1.250,500') // Peso Bruto KG
    expect(html).toContain('1.300,000') // TON (1.3000) converted x1000 -> KG per MOC section 3
    expect(html).toContain('R$ 1.850,50')
    expect(html).toContain('00 - Tributação normal ICMS')
    expect(html).toContain('PEDIDO: PED-998877')
    expect(html).toContain('REGIME: REGIME ESPECIAL 123/2024')
  })

  it('omits absent Expedidor/Recebedor boxes per MOC 2.7 and shows them when present', () => {
    const htmlRodo = generateDanfeHtml(rodo)
    expect(htmlRodo).not.toContain('Expedidor:')
    expect(htmlRodo).not.toContain('Recebedor:')
    expect(htmlRodo).toContain('Tomador do Serviço:')

    const htmlFsda = generateDanfeHtml(fsda)
    expect(htmlFsda).toContain('Expedidor:')
    expect(htmlFsda).toContain('ARMZ EXPEDIDOR LTDA')
    expect(htmlFsda).toContain('Recebedor:')
    expect(htmlFsda).toContain('CD RECEBEDOR LTDA')
    expect(htmlFsda).toContain('TOMADOR TERCEIRO LTDA')
  })

  it('renders FS-DA contingency with the second 36-char barcode, Dados do CT-e, notice and veicNovos', () => {
    const html = generateDanfeHtml(fsda)
    expect(html.match(/class="barcode"/g)).toHaveLength(2)
    expect(html).toContain('Dados do CT-e')
    expect(html).toContain('DACTE em Contingência - impresso em decorrência de problemas técnicos.')
    expect(html).toContain('60 - ICMS cobrado por ST')
    expect(html).toContain('9BWZZZ377VT004251')
    expect(html).toContain('BRANCO CRISTAL')
  })

  it('supports hiding the optional canhoto', () => {
    const withCanh = generateDanfeHtml(rodo)
    const withoutCanh = generateDanfeHtml(rodo, { cte: { canhoto: false } })
    expect(withCanh).toContain('DECLARO QUE RECEBI OS VOLUMES')
    expect(withoutCanh).not.toContain('DECLARO QUE RECEBI OS VOLUMES')
  })

  it('marks the homologação environment in Campo 1 and with the watermark', () => {
    const html = generateDanfeHtml(rodo.replace('<tpAmb>1</tpAmb>', '<tpAmb>2</tpAmb>'))
    expect(html.replace(/<br>/g, ' ')).toContain('EMITIDO EM AMBIENTE DE HOMOLOGAÇÃO – SEM VALOR FISCAL')
    expect(html).toContain('class="wm"')
    expect(generateDanfeHtml(rodo)).not.toContain('HOMOLOGAÇÃO')
  })

  it('renders protocol override option when XML has no protCTe', () => {
    const bare = rodo
      .replace(/<cteProc[^>]*>/, '')
      .replace('</cteProc>', '')
      .replace(/<protCTe[\s\S]*<\/protCTe>/, '')
    expect(generateDanfeHtml(bare)).toContain('CT-e sem protocolo de autorização')
    const withOpt = generateDanfeHtml(bare, { protocol: { nProt: '935240000099999', dateTime: '2024-10-15T15:00:00-03:00' } })
    expect(withOpt).toContain('935240000099999 - 15/10/2024 15:00:00')
  })

  it('renders all modals (aéreo, aquaviário, ferroviário, dutoviário, multimodal)', () => {
    const aereo = generateDanfeHtml(fixture('CTE_AEREO'))
    expect(aereo).toContain('AÉREO')
    expect(aereo).toContain('Código Brasileiro de Aeronáutica')
    expect(aereo).toContain('12345678901')
    expect(aereo).toContain('3480')
    expect(aereo).toContain('Informações sobre os artigos perigosos')

    const aquav = generateDanfeHtml(fixture('CTE_AQUAV'))
    expect(aquav).toContain('AQUAVIÁRIO')
    expect(aquav).toContain('NAVIO ATLANTICO SUL')
    expect(aquav).toContain('MSKU1234567')
    expect(aquav).toContain('LAC998877')
    expect(aquav).toContain('R$ 900,00')

    const ferrov = generateDanfeHtml(fixture('CTE_FERROV'))
    expect(ferrov).toContain('FERROVIÁRIO')
    expect(ferrov).toContain('FLX-9001')
    expect(ferrov).toContain('1 - Mútuo')
    expect(ferrov).toContain('FERROVIA LITORAL S.A.')

    const duto = generateDanfeHtml(fixture('CTE_DUTO'))
    expect(duto).toContain('DUTOVIÁRIO')
    expect(duto).toContain('3,000000')
    expect(duto).toContain('01/10/2024')

    const multi = generateDanfeHtml(fixture('CTE_MULTIMODAL'))
    expect(multi).toContain('MULTIMODAL')
    expect(multi).toContain('OTM-2024-0099')
    expect(multi).toContain('SEGURADORA BRASIL S.A.')
    expect(multi).toContain('APOL-554433')
  })

  it('renders DACTE OS (modelo 67) and CT-e Simplificado (NT 2024.002)', () => {
    const htmlOs = generateDanfeHtml(os)
    expect(htmlOs).toContain('<title>DACTE OS 35241011222333000181670010000002011421339089</title>')
    expect(htmlOs).toContain('DACTE OS')
    expect(htmlOs).toContain('para Outros Serviços')
    expect(htmlOs).toContain('6 - Transporte de Pessoas')
    expect(htmlOs).toContain('TRANSPORTE TURISTICO DE PASSAGEIROS')
    expect(htmlOs).toContain('SEGURADORA VIAGEM S.A.')
    expect(htmlOs).toContain('123456789012') // TAF
    expect(htmlOs).toContain('BUS1A23')
    expect(htmlOs).toContain('SP - PR')

    const htmlSimp = generateDanfeHtml(fixture('CTE_SIMP'))
    expect(htmlSimp).toContain('5 - CT-e Simplificado')
    expect(htmlSimp).toContain('VAREJISTA CENTRAL S.A.')
    expect(htmlSimp).toContain('R$ 1.150,00')
    expect(htmlSimp).toContain('35241022333444000195550010000009111123456781')
    expect(htmlSimp).toContain('35241022333444000195550010000009121123456787')
  })

  it('keeps alphanumeric CNPJs in chave and emitente (NT conjunta DFe 2025.001)', () => {
    const html = generateDanfeHtml(rodo.replaceAll('11222333000181', '12ABC34501DE35'))
    expect(html).toContain('3524 1012 ABC3 4501 DE35 5700 1000 0001 2314 2133 9010')
    expect(html).toContain('12.ABC.345/01DE-35')
  })

  it('builds fallback QR URL when XML has no qrCodCTe (normal emission only)', () => {
    const noQr = rodo.replace(/<infCTeSupl>[\s\S]*<\/infCTeSupl>/, '')
    expect(generateDanfeHtml(noQr)).toContain('class="qr"')
    const noQrFsda = fsda.replace(/<infCTeSupl>[\s\S]*<\/infCTeSupl>/, '')
    expect(generateDanfeHtml(noQrFsda)).not.toContain('class="qr"')
  })

  it('is self-contained and escapes XML-derived text and unsafe logo URIs', () => {
    const xml = rodo.replace('Carga acompanhada de seguro obrigatorio.', '&lt;script&gt;alert(1)&lt;/script&gt; &amp; "q"')
    const html = generateDanfeHtml(xml)
    expect(html).not.toMatch(/<script/i)
    expect(html).not.toMatch(/(src|href)="https?:/i)
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;q&quot;')
    expect(generateDanfeHtml(rodo, { logoDataUri: 'https://evil.example/x.png' })).not.toContain('evil.example')
    expect(generateDanfeHtml(rodo, { logoDataUri: 'data:image/png;base64,AAAA' })).toContain('<img alt="" src="data:image/png;base64,AAAA"')
  })

  it('paginates long Documentos Originários and long Observações across sheets with repeated headers', () => {
    const manyDocs = generateDanfeHtml(withNfes(rodo, 120))
    const n = pages(manyDocs)
    expect(n).toBeGreaterThan(1)
    for (let i = 1; i <= n; i++) expect(manyDocs).toContain(`>${i}/${n}<`)
    expect(manyDocs.match(/35241022333444000195550010000004561123456781/g)).toHaveLength(120)
    // Header repeated on every sheet per MOC 2.12
    expect(manyDocs.match(/<div class="t1">DACTE<\/div>/g)).toHaveLength(n)

    const longObs = Array.from({ length: 60 }, (_, i) => `OBSERVACAO LINHA ${i + 1} TEXTO COMPLEMENTAR`).join('|')
    const manyObs = generateDanfeHtml(rodo.replace(/<xObs>[\s\S]*?<\/xObs>/, `<xObs>${longObs}</xObs>`))
    expect(pages(manyObs)).toBeGreaterThan(1)
    expect(manyObs).toContain('OBSERVACAO LINHA 1')
    expect(manyObs).toContain('OBSERVACAO LINHA 60')
  })

  it('still rejects unsupported documents with DanfeError', () => {
    expect(() => generateDanfeHtml('<unknown/>')).toThrowError(DanfeError)
  })
})
