import { describe, expect, it } from 'vitest'
import { DanfeError, generateDanfeHtml, generateDanfseHtml, parseNfse, type DanfeOptions } from '../src'
import { qrSvg } from '../src/qrcode/qrcode'
import { fixture } from './helpers'

const xml = fixture('NFSE')
const chave = '50027042211222333000181000000000012326101000000010'
const qrUrl = `https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave=${chave}`

function document(xml: string, options?: DanfeOptions): Document {
  return new DOMParser().parseFromString(generateDanfseHtml(xml, options), 'text/html')
}

function value(doc: Document, label: string): string | null | undefined {
  return Array.from(doc.querySelectorAll('.label')).find((el) => el.textContent === label)?.nextElementSibling?.textContent
}

describe('national NFS-e', () => {
  it('routes NFSe through the generic API and prints the ungrouped key and its official consultation QR', () => {
    const nfse = parseNfse(xml)
    expect(nfse.chave).toBe(chave)
    expect(nfse.versao).toBe('1.01')
    const html = generateDanfeHtml(xml)
    expect(html).toBe(generateDanfseHtml(xml))
    expect(html).toContain(`<title>DANFSe ${chave}</title>`)
    expect(html).toContain(qrSvg(qrUrl, { sizeCm: 1.9, label: 'Consulta pública da NFS-e' }))
    expect(html).toContain('DANFSe v2.0')
    expect(html).toContain('NFS-e SEM VALIDADE JURÍDICA')
    expect(html.match(/class="page"/g)).toHaveLength(1)
    expect(html).not.toMatch(/<script|(?:src|href)="https?:/i)
  })

  it('reads the provider details from emit when they are missing from prest and handles domestic and foreign addresses', () => {
    const nfse = parseNfse(xml)
    expect(nfse.prest).toMatchObject({ xNome: 'Prestadora Exemplo Ltda.', IM: '12345', end: { cMun: '5002704', UF: 'MS' } })
    expect(nfse.toma?.end.cMun).toBe('3550308')
    const html = generateDanfseHtml(xml)
    expect(html).toContain('11.222.333/0001-81')
    expect(html).toContain('São Paulo / SP')
    expect(html).toContain('GB1234567890')
    expect(html).toContain('London / England / GB')
    expect(html).toContain('SW1A 1AA')
  })

  it('maps ISSQN and IBS/CBS and renders the NT 008 v1.02 retention and complement rules', () => {
    const doc = document(xml)
    expect(value(doc, 'Tipo de Tributação do ISSQN')).toBe('Operação Tributável')
    expect(value(doc, 'PIS – Débito Apuração Própria')).toBe('R$ 0,00')
    expect(value(doc, 'COFINS – Débito Apuração Própria')).toBe('R$ 0,00')
    expect(value(doc, 'Contribuições Sociais – Retidas')).toBe('R$ 15,15')
    expect(value(doc, 'CST / cClassTrib')).toBe('000 / 000001')
    expect(value(doc, 'Exclusões e Reduções da Base de Cálculo')).toBe('R$ 60,00')
    expect(value(doc, 'Total do IBS/CBS')).toBe('R$ 9,40')
    expect(value(doc, 'Valor Líquido da NFS-e + IBS/CBS')).toBe('R$ 1.009,40')
    expect(doc.querySelector('.complement-text')?.textContent).toContain('Núm. Ped.: 42 | Item Ped.: 1, 2')
    expect(doc.querySelector('.approx')?.textContent).toContain('Federais: 11,00% | Estaduais: 0,00% | Municipais: 5,00%')
  })

  it('understands the NT 009 locations for the purpose, recipient and tax classification', () => {
    const updated = xml
      .replace('<tpEmit>1</tpEmit>', '<tpEmit>1</tpEmit><finNFSe>2</finNFSe>')
      .replace(/<indDest>1<\/indDest>\s*(<dest>[\s\S]*?<\/dest>)/, '')
      .replace('</toma>', '</toma><indDest>0</indDest>')
      .replace(/<gIBSCBS>(.*?)<\/gIBSCBS>/, '$1')
      .replace('<dCompet>2026-10-15</dCompet>', '<dCompet>2027-01-01</dCompet>')
    const doc = document(updated, { nfse: { canhoto: true, situacao: 'substituida' } })
    expect(value(doc, 'Finalidade')).toBe('NFS-e de débito')
    expect(doc.querySelector('.watermark')?.textContent).toBe('SUBSTITUÍDA')
    expect(doc.querySelector('.receipt')?.textContent).toContain(chave)
    expect(doc.body.textContent).toContain('O destinatário é o próprio tomador/adquirente da operação')
    expect(value(doc, 'PIS – Débito Apuração Própria')).toBeUndefined()
    expect(value(doc, 'CST / cClassTrib')).toBe('000 / 000001')
  })

  it('uses the compact notices and dash placeholders for absent data and escapes the supplied text', () => {
    const legacy = xml
      .replace(/<(toma|interm|IBSCBS)>[\s\S]*?<\/\1>/g, '')
      .replace('<tribISSQN>1</tribISSQN>', '<tribISSQN>4</tribISSQN>')
      .replace('Consultoria em software &amp; treinamento.', '&lt;img src=x onerror=alert(1)&gt;')
    const html = generateDanfseHtml(legacy, { nfse: { situacao: 'cancelada' } })
    expect(html).toContain('Tomador/Adquirente da operação não identificado na NFS-e')
    expect(html).toContain('Destinatário da operação não identificado na NFS-e')
    expect(html).toContain('Intermediário da operação não identificado na NFS-e')
    expect(html).toContain('Operação não sujeita ao ISSQN')
    expect(html).toContain('CANCELADA')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(value(document(legacy), 'Total do IBS/CBS')).toBe('-')
  })

  it('rejects non-national documents, standalone DPS and malformed access keys', () => {
    expect(() => generateDanfeHtml('<NFSe><infNFSe><DPS><infDPS><prest/></infDPS></DPS></infNFSe></NFSe>')).toThrow(DanfeError)
    expect(() => generateDanfseHtml('<DPS xmlns="http://www.sped.fazenda.gov.br/nfse"/>')).toThrow(DanfeError)
    expect(() => parseNfse(xml.replace(chave, '123'))).toThrow('Invalid national NFS-e access key')
  })
})
