import { describe, expect, it } from 'vitest'
import { parseNfe } from '../src/parse'
import { DanfeError } from '../src/errors'
import { mod11 } from '../src/key'
import { fixture } from './helpers'

describe('parseNfe', () => {
  const n = parseNfe(fixture('HR_ACO'))

  it('reads identification, parties and totals', () => {
    expect(n.chave).toBe('50210117707168000134550010000403981000840243')
    expect(mod11(n.chave.slice(0, 43))).toBe(Number(n.chave[43]))
    expect(n.ide.nNF).toBe('40398')
    expect(n.emit.xNome).toContain('GRANDE ACO')
    expect(n.dest?.doc).toBe('36581362000160')
    expect(n.total.vNF).toBe('3321.55')
    expect(n.transp.modFrete).toBe('0')
    expect(n.transp.volumes[0]?.pesoB).toBe('355.200')
    expect(n.cobr.fat?.nFat).toBe('040398')
    expect(n.cobr.duplicatas).toEqual([{ nDup: '001', dVenc: '2021-01-18', vDup: '3321.55' }])
    expect(n.infAdic.infCpl).toContain('VENDEDOR')
    expect(n.prot).toMatchObject({ nProt: '150210000673328', cStat: '100' })
  })

  it('reads the item with ICMS10 (orig+CST) and infAdProd', () => {
    expect(n.itens).toHaveLength(1)
    expect(n.itens[0]).toMatchObject({
      cst: '010',
      vBC: '3120.00',
      pICMS: '17.00',
      vICMS: '530.40',
      vBCST: '4305.60',
      vICMSST: '201.55',
    })
    expect(n.itens[0]?.infAdProd).toContain('Imp. Federal')
  })

  it('uses CSOSN for Simples Nacional items', () => {
    const xml = fixture('HR_ACO').replace(/<ICMS10>[\s\S]*?<\/ICMS10>/, '<ICMSSN102><orig>0</orig><CSOSN>102</CSOSN></ICMSSN102>')
    expect(parseNfe(xml).itens[0]?.cst).toBe('0102')
  })

  it('accepts a bare <NFe> without protocol', () => {
    const xml = fixture('HR_ACO')
    const bare = xml.slice(xml.indexOf('<NFe'), xml.indexOf('</NFe>') + 6)
    const p = parseNfe(bare)
    expect(p.chave).toBe(n.chave)
    expect(p.prot).toBeNull()
  })

  it('rejects non NF-e documents', () => {
    expect(() => parseNfe('<resNFe xmlns="http://www.portalfiscal.inf.br/nfe"/>')).toThrow(DanfeError)
  })

  it('rejects malformed XML', () => {
    expect(() => parseNfe('<nfeProc><NFe>')).toThrow(DanfeError)
  })
})
