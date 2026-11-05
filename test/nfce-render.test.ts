import { describe, expect, it } from 'vitest'
import { generateDanfeHtml, generateDanfeNfceHtml } from '../src'
import { fixture } from './helpers'

const nfce = fixture('NFCE')
const cont = fixture('NFCE_CONT')
const pages = (html: string) => (html.match(/<section class="page">/g) ?? []).length
/** Width and height of the sheet, in mm, from the @page rule. */
const sheet = (html: string) => {
  const m = /@page \{ size: ([\d.]+)mm ([\d.]+)mm; margin: 0 \}/.exec(html)
  if (!m) throw new Error('no @page size')
  return { w: Number(m[1]), h: Number(m[2]) }
}
/** Text of the document with tags removed and whitespace collapsed. */
const text = (html: string) =>
  html
    .replace(/<style>[\s\S]*?<\/style>/, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')

function withItems(xml: string, n: number): string {
  const m = /<det nItem="1">[\s\S]*?<\/det>/.exec(xml)
  if (!m) throw new Error('fixture without det')
  const all = Array.from({ length: n }, (_, i) => m[0].replace('nItem="1"', `nItem="${i + 1}"`)).join('')
  return xml.replace(/<det nItem="1">[\s\S]*<\/det>/, all)
}

describe('DANFE NFC-e', () => {
  it('is rendered by generateDanfeHtml for modelo 65, as one receipt sheet with the spec divisions', () => {
    const html = generateDanfeHtml(nfce)
    expect(html).toBe(generateDanfeNfceHtml(nfce))
    expect(pages(html)).toBe(1)
    expect(sheet(html).w).toBe(80)
    expect(html).toContain('<title>DANFE NFC-e 50261111222333000181650010039055651821356137</title>')
    const t = text(html)
    // I: header
    expect(t).toContain('CNPJ: 11.222.333/0001-81')
    expect(t).toContain('EMPRESA EXEMPLO DE VAREJO LTDA')
    expect(t).toContain('RUA DAS FLORES, 100, CENTRO, Sidrolândia, MS, CEP: 79170-000')
    expect(t).toContain('Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica')
    // II: items
    expect(t).toMatch(/Código Descrição Qtde UN Vl Unit Vl Total/)
    expect(t).toContain('7891234 CAFE TORRADO E 2 UN 18,90 37,80 MOIDO EXTRAFORTE')
    expect(t).toContain('7895678 Acucar cristal 1kg 1 UN 5,49 5,49')
    // III: totals and payments
    expect(t).toContain('Qtde. total de itens 2')
    expect(t).toContain('Valor total R$ 43,29')
    expect(t).toContain('Desconto R$ 1,29')
    expect(t).toContain('Valor a Pagar R$ 42,00')
    expect(t).toContain('FORMA PAGAMENTO VALOR PAGO R$ Cartão de Crédito 20,00 Dinheiro 30,00 Troco R$ 8,00')
    // IV: consulta by chave
    expect(t).toContain('Consulte pela Chave de Acesso em www.dfe.ms.gov.br/nfce/consulta 5026 1111 2223 3300 0181 6500 1003 9055 6518 2135 6137')
    // VI and VII: consumer, identification, protocol
    expect(html).toContain('<b>CONSUMIDOR</b> CPF: 529.982.247-25 - MARIA DA')
    expect(t).toContain('NFC-e nº 003905565 Série 001 05/11/2026 15:04:25')
    expect(t).toContain('Protocolo de autorização: 150260000259356')
    expect(t).toContain('Data de autorização: 05/11/2026 15:04:26')
    // VIII: the authorizer's message (xMsg), '|' as line break
    expect(t).toContain('NOTA MS PREMIADA DEZENAS: ( 08 23 35 37 48 49 50 55 ) www.notamspremiada.ms.gov.br')
    // V: QR Code
    expect(html).toContain('class="qr"')
    expect(html).toContain('aria-label="QR Code de consulta da NFC-e"')
    // IX: Lei 12.741 and infCpl
    expect(t).toContain('Tributos Totais Incidentes (Lei Federal 12.741/2012): R$ 9,87')
    expect(t).toContain('Obrigado pela preferencia! Volte sempre.')
    expect(t).not.toMatch(/CONTINGÊNCIA|HOMOLOGAÇÃO|Via consumidor/)
  })

  it('still renders an NF-e (modelo 55) as the A4 DANFE', () => {
    const html = generateDanfeHtml(fixture('HR_ACO'))
    expect(html).toContain('<title>DANFE 5021')
    expect(html).toContain('@page { size: 21cm 29.7cm; margin: 0 }')
  })

  it('prints "Valor a Pagar" only when something changes the sum of the items', () => {
    const t = text(generateDanfeHtml(cont))
    expect(t).toContain('Valor total R$ 17,00')
    expect(t).not.toContain('Valor a Pagar')
    const frete = cont.replace('<vFrete>0.00</vFrete><vSeg>', '<vFrete>3.00</vFrete><vSeg>').replace('<vNF>17.00</vNF>', '<vNF>20.00</vNF>')
    expect(text(generateDanfeHtml(frete))).toContain('Frete R$ 3,00 Valor a Pagar R$ 20,00')
  })

  it('prints the off-line contingency notice twice, the copy and no protocol while pending', () => {
    const html = generateDanfeHtml(cont)
    const t = text(html)
    expect(t.match(/EMITIDA EM CONTINGÊNCIA Pendente de autorização/g)).toHaveLength(2)
    expect(html).toContain('class="cont"')
    expect(t).toContain('NFC-e nº 003905433 Série 001 05/11/2026 15:03:51 - Via consumidor')
    expect(t).not.toContain('Protocolo de autorização')
    expect(text(generateDanfeHtml(cont, { nfce: { via: 'estabelecimento' } }))).toContain('- Via estabelecimento')
  })

  it('prints the protocol instead of the notice once a contingency NFC-e is authorized', () => {
    const t = text(generateDanfeHtml(cont, { protocol: { nProt: '150260000259347', dateTime: '2026-11-05T15:03:52-04:00' } }))
    expect(t).toContain('Protocolo de autorização: 150260000259347')
    expect(t).not.toMatch(/CONTINGÊNCIA|Via consumidor/)
  })

  it('prints the EPEC notice with the contingency entry date', () => {
    const t = text(generateDanfeHtml(cont.replace('<tpEmis>9</tpEmis>', '<tpEmis>4</tpEmis>')))
    expect(t).toContain('EMITIDA EM CONTINGÊNCIA Pendente de autorização')
    expect(t).toContain('DANFE-NFC-e impresso em contingência - EPEC')
    expect(t).toContain('Regularmente recebido pela administração tributária autorizadora')
    expect(t).toContain('Data entrada contingência: 05/11/2026 15:01:51')
  })

  it('marks the homologação environment', () => {
    expect(text(generateDanfeHtml(cont))).toContain('EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO – SEM VALOR FISCAL')
  })

  it('identifies the consumer by CPF, CNPJ or foreign id, with the delivery address, or not at all', () => {
    const noDest = nfce.replace(/<dest>[\s\S]*?<\/dest>/, '')
    expect(text(generateDanfeHtml(noDest))).toContain('CONSUMIDOR NÃO IDENTIFICADO')
    const cnpj = nfce.replace('<CPF>52998224725</CPF>', '<CNPJ>12ABC34501DE35</CNPJ>')
    expect(text(generateDanfeHtml(cnpj))).toContain('CONSUMIDOR CNPJ: 12.ABC.345/01DE-35 - MARIA DA SILVA')
    const est = nfce.replace('<CPF>52998224725</CPF>', '<idEstrangeiro>AB123456</idEstrangeiro>')
    expect(text(generateDanfeHtml(est))).toContain('CONSUMIDOR Id. Estrangeiro: AB123456 - MARIA DA SILVA')
    const entrega = nfce.replace(
      '<det nItem="1">',
      '<entrega><CPF>52998224725</CPF><xNome>JOAO SOUZA</xNome><xLgr>RUA B</xLgr><nro>5</nro><xBairro>VILA</xBairro><cMun>5002704</cMun><xMun>Campo Grande</xMun><UF>MS</UF></entrega><det nItem="1">',
    )
    expect(text(generateDanfeHtml(entrega))).toContain('CONSUMIDOR CPF: 529.982.247-25 - JOAO SOUZA - RUA B, 5, VILA, Campo Grande, MS')
  })

  it('names the payment from xPag, the IT 2024.002 table or the code itself', () => {
    const xml = nfce.replace(
      /<pag>[\s\S]*?<\/pag>/,
      '<pag><detPag><tPag>99</tPag><xPag>Permuta</xPag><vPag>10.00</vPag></detPag><detPag><tPag>20</tPag><vPag>20.00</vPag></detPag><detPag><tPag>77</tPag><vPag>12.00</vPag></detPag></pag>',
    )
    const t = text(generateDanfeHtml(xml))
    expect(t).toContain('Permuta 10,00 Pagamento Instantâneo (PIX) - Estático 20,00 77 12,00')
    expect(t).not.toContain('Troco')
  })

  it('leaves the items out of the DANFE NFC-e resumido', () => {
    const t = text(generateDanfeHtml(nfce, { nfce: { resumido: true } }))
    expect(t).not.toContain('Descrição')
    expect(t).not.toContain('CAFE TORRADO')
    expect(t).toContain('Qtde. total de itens 2')
  })

  it('fits the paper width: columns on 80 mm, stacked lines on 58 mm, clamped to 56..210 mm', () => {
    const narrow = generateDanfeHtml(nfce, { nfce: { paperWidthMm: 58 } })
    expect(sheet(narrow).w).toBe(58)
    expect(text(narrow)).toContain('Código Descrição Qtde UN x Vl Unit Vl Total')
    expect(text(narrow)).toContain('2 UN x 18,90 37,80')
    expect(sheet(generateDanfeHtml(nfce, { nfce: { paperWidthMm: 20 } })).w).toBe(56)
    expect(sheet(generateDanfeHtml(nfce, { nfce: { paperWidthMm: 400 } })).w).toBe(210)
    expect(sheet(generateDanfeHtml(nfce, { nfce: { paperWidthMm: Number.NaN } })).w).toBe(80)
  })

  it('grows the sheet with the content instead of adding sheets', () => {
    const one = sheet(generateDanfeHtml(nfce)).h
    const html = generateDanfeHtml(withItems(nfce, 120))
    expect(pages(html)).toBe(1)
    expect(sheet(html).h).toBeGreaterThan(one + 120 * 3)
    expect(text(html)).toContain('Qtde. total de itens 120')
  })

  it('omits the QR Code when the XML has no infNFeSupl', () => {
    const html = generateDanfeHtml(nfce.replace(/<infNFeSupl>[\s\S]*<\/infNFeSupl>/, ''))
    expect(html).not.toContain('class="qr"')
    expect(text(html)).toContain('Consulte pela Chave de Acesso em 5026 1111')
  })

  it('escapes XML-derived text and restricts the logo to data: images', () => {
    const xml = nfce.replace('Obrigado pela preferencia!', '&lt;img src=x onerror=alert(1)&gt; &amp; "q"')
    const html = generateDanfeHtml(xml)
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt; &amp; &quot;q&quot;')
    expect(html).not.toMatch(/<script/i)
    expect(generateDanfeHtml(nfce, { logoDataUri: 'https://evil.example/x.png' })).not.toContain('evil.example')
    const logo = generateDanfeHtml(nfce, { logoDataUri: 'data:image/png;base64,AAAA' })
    expect(logo).toContain('<img alt="" src="data:image/png;base64,AAAA">')
    expect(logo).toContain('class="hd"')
  })
})
