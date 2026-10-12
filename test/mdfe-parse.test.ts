import { describe, expect, it } from 'vitest'
import { DanfeError, parseMdfe } from '../src'
import { fixture } from './helpers'

describe('parseMdfe', () => {
  it('reads the identification, emitente, totals and protocol of an mdfeProc', () => {
    const m = parseMdfe(fixture('MDFE_RODO'))
    expect(m.chave).toMatch(/^4324101122233300018158001000000888142133901\d$/)
    expect(m.ide).toMatchObject({ mod: '58', serie: '1', nMDF: '888', tpEmis: '1', tpAmb: '1', UFIni: 'RS', UFFim: 'SP' })
    expect(m.emit).toMatchObject({ doc: '11222333000181', xNome: 'TRANSPORTADORA EXEMPLO LTDA', IE: '9998877666' })
    expect(m.emit.ender).toMatchObject({ xMun: 'Porto Alegre', UF: 'RS', CEP: '99888777' })
    expect(m.tot).toMatchObject({ qCTe: '4', qNFe: '0', cUnid: '01', qCarga: '2890.0000' })
    expect(m.prot).toMatchObject({ nProt: '143240000012345', cStat: '100' })
    expect(m.qrCod).toContain(`chMDFe=${m.chave}`)
    expect(m.docs).toHaveLength(4)
    expect(m.docs[0]).toMatchObject({ tipo: 'CT-e' })
  })

  it('reads the rodoviário modal', () => {
    const { modal } = parseMdfe(fixture('MDFE_RODO'))
    expect(modal?.kind).toBe('rodo')
    if (modal?.kind !== 'rodo') return
    expect(modal.RNTRC).toBe('99009900')
    expect(modal.veicTracao?.placa).toBe('XYZ9A99')
    expect(modal.veicReboque.map((v) => v.placa)).toEqual(['ABC1D23'])
    expect(modal.condutores).toHaveLength(3)
    expect(modal.condutores[0]).toEqual({ xNome: 'JOAO DA SILVA SAURO', CPF: '12345678909' })
    expect(modal.valePedagio).toHaveLength(2)
    expect(modal.valePedagio[0]).toMatchObject({ responsavel: '77888777000100', CNPJForn: '55888777000100' })
  })

  it('reads the aéreo, aquaviário and ferroviário modals', () => {
    const aereo = parseMdfe(fixture('MDFE_AEREO')).modal
    expect(aereo).toMatchObject({ kind: 'aereo', nac: '9999', matr: '999999', nVoo: 'AB1234', cAerEmb: 'SBPA', cAerDes: 'SBGR' })

    const aquav = parseMdfe(fixture('MDFE_AQUAV')).modal
    expect(aquav).toMatchObject({ kind: 'aquav', cEmbar: '0123456789', xEmbar: 'NAVIO EXEMPLO DE CARGA' })
    if (aquav?.kind === 'aquav') {
      expect(aquav.termCarreg).toEqual([{ cod: '99999999', nome: 'TERMINAL PORTUARIO DE RIO GRANDE' }])
      expect(aquav.cargaVazia).toEqual([{ id: 'MSKU1111111', tipo: '1' }])
    }

    const ferrov = parseMdfe(fixture('MDFE_FERROV')).modal
    expect(ferrov).toMatchObject({ kind: 'ferrov', xPref: '9852989900', xOri: 'NON', xDest: 'MMO', qVag: '6' })
    if (ferrov?.kind === 'ferrov') expect(ferrov.vagoes).toHaveLength(6)
  })

  it('reads the units of the aggregated documents and an unauthorized contingency MDF-e', () => {
    const m = parseMdfe(fixture('MDFE_RODO_CONT'))
    expect(m.ide.tpEmis).toBe('2')
    expect(m.prot).toBeNull()
    expect(m.docs[0]?.unidTransp).toEqual([
      { tpUnidTransp: '1', idUnidTransp: 'XYZ9A99', cargas: [{ tpUnidCarga: '1', idUnidCarga: 'MSKU1234567' }] },
    ])
    expect(m.qrCod).toContain('&sign=')
  })

  it('accepts a bare <MDFe> and takes the chave from the Id attribute', () => {
    const xml = fixture('MDFE_RODO')
      .replace(/<mdfeProc[^>]*>/, '')
      .replace('</mdfeProc>', '')
      .replace(/<protMDFe[\s\S]*<\/protMDFe>/, '')
    const m = parseMdfe(xml)
    expect(m.prot).toBeNull()
    expect(m.chave).toHaveLength(44)
  })

  it('rejects other documents and malformed XML', () => {
    expect(() => parseMdfe('<resNFe xmlns="http://www.portalfiscal.inf.br/nfe"/>')).toThrowError(DanfeError)
    expect(() => parseMdfe('<MDFe')).toThrowError(/could not be parsed/)
    try {
      parseMdfe('<procEventoMDFe/>')
    } catch (e) {
      expect((e as DanfeError).code).toBe('unsupported-document')
    }
  })
})
