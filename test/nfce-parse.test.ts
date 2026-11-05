import { describe, expect, it } from 'vitest'
import { mod11 } from '../src/key'
import { parseNfe } from '../src/parse'
import { fixture } from './helpers'

describe('parseNfe (NFC-e)', () => {
  const n = parseNfe(fixture('NFCE'))

  it('reads the modelo 65 identification, consumer and items', () => {
    expect(n.chave).toBe('50261111222333000181650010039055651821356137')
    expect(mod11(n.chave.slice(0, 43))).toBe(Number(n.chave[43]))
    expect(n.ide).toMatchObject({ mod: '65', serie: '1', nNF: '3905565', tpEmis: '1', tpAmb: '1', dhCont: '' })
    expect(n.dest).toMatchObject({ doc: '52998224725', docTipo: 'CPF', xNome: 'MARIA DA SILVA' })
    expect(n.entrega).toBeNull()
    expect(n.itens.map((i) => i.cProd)).toEqual(['7891234', '7895678'])
    expect(n.total).toMatchObject({ vProd: '43.29', vDesc: '1.29', vNF: '42.00', vTotTrib: '9.87' })
  })

  it('reads the payments, the change and infNFeSupl', () => {
    expect(n.pag).toEqual({
      detPag: [
        { indPag: '', tPag: '03', xPag: '', vPag: '20.00' },
        { indPag: '', tPag: '01', xPag: '', vPag: '30.00' },
      ],
      vTroco: '8.00',
    })
    expect(n.supl).toEqual({
      qrCode: `http://www.dfe.ms.gov.br/nfce/qrcode?p=${n.chave}|3|1`,
      urlChave: 'www.dfe.ms.gov.br/nfce/consulta',
    })
    expect(n.prot).toMatchObject({ nProt: '150260000259356', xMsg: expect.stringContaining('NOTA MS PREMIADA') })
  })

  it('reads the contingency fields of an off-line NFC-e', () => {
    const c = parseNfe(fixture('NFCE_CONT'))
    expect(c.ide).toMatchObject({ tpEmis: '9', dhCont: '2026-11-05T15:01:51-04:00' })
    expect(c.prot).toBeNull()
    expect(c.supl.qrCode).toContain(`${c.chave}|3|2|05|17.00|2|52998224725|`)
  })

  it('reads the delivery address and the 3.10 pag layout', () => {
    const xml = fixture('NFCE')
      .replace(
        '<det nItem="1">',
        '<entrega><CPF>52998224725</CPF><xNome>JOAO</xNome><xLgr>RUA B</xLgr><nro>5</nro><xBairro>VILA</xBairro><cMun>5002704</cMun><xMun>Campo Grande</xMun><UF>MS</UF></entrega><det nItem="1">',
      )
      .replace(/<pag>[\s\S]*?<\/pag>/, '<pag><tPag>01</tPag><vPag>30.00</vPag></pag><pag><tPag>04</tPag><vPag>12.00</vPag></pag>')
    const p = parseNfe(xml)
    expect(p.entrega).toMatchObject({ doc: '52998224725', xNome: 'JOAO', xLgr: 'RUA B', xMun: 'Campo Grande', UF: 'MS' })
    expect(p.pag.detPag.map((d) => [d.tPag, d.vPag])).toEqual([
      ['01', '30.00'],
      ['04', '12.00'],
    ])
    expect(p.pag.vTroco).toBe('')
  })
})
