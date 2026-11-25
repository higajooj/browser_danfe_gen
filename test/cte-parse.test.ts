import { describe, expect, it } from 'vitest'
import { DanfeError, parseCte } from '../src'
import { fixture } from './helpers'

describe('parseCte', () => {
  it('reads the identification, parties, carga, components, ICMS, docs and protocol of a cteProc', () => {
    const c = parseCte(fixture('CTE_RODO'))
    expect(c.kind).toBe('cte')
    expect(c.chave).toBe('35241011222333000181570010000001231421339010')
    expect(c.versao).toBe('4.00')
    expect(c.ide).toMatchObject({
      mod: '57',
      serie: '1',
      nCT: '123',
      CFOP: '6353',
      modal: '01',
      tpCTe: '0',
      tpServ: '0',
      tpEmis: '1',
      tpAmb: '1',
      UFIni: 'SP',
      UFFim: 'RS',
      tomaTipo: '0',
    })
    expect(c.emit).toMatchObject({ doc: '11222333000181', xNome: 'TRANSPORTADORA EXEMPLO LTDA', IE: '110042490114' })
    expect(c.rem?.xNome).toBe('INDUSTRIA REMETENTE S.A.')
    expect(c.dest?.xNome).toBe('COMERCIO DESTINATARIO LTDA')
    expect(c.dest?.ISUF).toBe('123456789')
    // toma3=0 resolves to rem
    expect(c.toma?.doc).toBe(c.rem?.doc)
    expect(c.vPrest).toMatchObject({ vTPrest: '1850.50', vRec: '1850.50' })
    expect(c.vPrest.comp).toHaveLength(3)
    expect(c.imp.icms).toMatchObject({
      kind: 'ICMS00',
      CST: '00',
      vBC: '1850.50',
      pICMS: '12.00',
      vICMS: '222.06',
      icmsProprio: true,
      icmsST: false,
    })
    expect(c.carga?.quantidades).toHaveLength(4)
    expect(c.docs).toHaveLength(2)
    expect(c.docs[0]).toMatchObject({ kind: 'NFe', chave: '35241022333444000195550010000004561123456781' })
    expect(c.modal).toEqual({ kind: 'rodo', RNTRC: '12345678', occ: [] })
    expect(c.compl.fluxo).toEqual({ xOrig: 'SPO', xPass: ['CWB'], xDest: 'POA', xRota: '' })
    expect(c.compl.obsCont).toEqual([{ xCampo: 'PEDIDO', xTexto: 'PED-998877' }])
    expect(c.compl.obsFisco).toEqual([{ xCampo: 'REGIME', xTexto: 'REGIME ESPECIAL 123/2024' }])
    expect(c.qrCod).toContain(`chCTe=${c.chave}`)
    expect(c.prot).toMatchObject({ nProt: '135240000054321', cStat: '100' })
  })

  it('parses a bare FS-DA contingency <CTe> with toma4, exped, receb, ICMS60, NF/Outros and veicNovos', () => {
    const c = parseCte(fixture('CTE_RODO_FSDA'))
    expect(c.ide.tpEmis).toBe('5')
    expect(c.prot).toBeNull()
    expect(c.toma?.xNome).toBe('TOMADOR TERCEIRO LTDA')
    expect(c.exped?.xNome).toBe('ARMZ EXPEDIDOR LTDA')
    expect(c.receb?.xNome).toBe('CD RECEBEDOR LTDA')
    expect(c.imp.icms).toMatchObject({
      kind: 'ICMS60',
      CST: '60',
      vBC: '920.00',
      vICMS: '110.40',
      pICMS: '12.00',
      icmsProprio: false,
      icmsST: true,
    })
    expect(c.docs).toHaveLength(2)
    expect(c.docs[0]).toMatchObject({ kind: 'NF', mod: '01', serie: '1', nDoc: '9876' })
    expect(c.docs[1]).toMatchObject({ kind: 'Outros', tpDoc: '00', nDoc: 'DC-001' })
    expect(c.veicNovos).toHaveLength(1)
    expect(c.veicNovos[0]?.chassi).toBe('9BWZZZ377VT004251')
    expect(c.qrCod).toContain('&sign=')
  })

  it('parses all five other modals (aéreo, aquaviário, ferroviário, dutoviário, multimodal)', () => {
    const aereo = parseCte(fixture('CTE_AEREO'))
    expect(aereo.modal).toMatchObject({
      kind: 'aereo',
      nOCA: '12345678901',
      nMinu: '000012345',
      CL: 'E',
      cTar: '045',
      vTar: '28.82',
      xDime: '0050X0040X0030',
      cInfManu: ['03', '10'],
    })
    if (aereo.modal?.kind === 'aereo') {
      expect(aereo.modal.peri).toEqual([{ nONU: '3480', qTotEmb: '5 CAIXAS', qTotProd: '80.0000', uniAP: '1' }])
    }

    const aquav = parseCte(fixture('CTE_AQUAV'))
    expect(aquav.modal).toMatchObject({ kind: 'aquav', xNavio: 'NAVIO ATLANTICO SUL', vAFRMM: '900.00', balsas: ['BALSA 01'] })
    if (aquav.modal?.kind === 'aquav') {
      expect(aquav.modal.detCont[0]).toMatchObject({ nCont: 'MSKU1234567', lacres: ['LAC998877'] })
    }

    const ferrov = parseCte(fixture('CTE_FERROV'))
    expect(ferrov.modal).toMatchObject({ kind: 'ferrov', tpTraf: '1', fluxo: 'FLX-9001', respFat: '1', ferrEmi: '1', vFrete: '12500.00' })
    if (ferrov.modal?.kind === 'ferrov') {
      expect(ferrov.modal.ferroEnv[0]).toMatchObject({ CNPJ: '77888999000133', cInt: 'FER02', xNome: 'FERROVIA LITORAL S.A.' })
    }

    const duto = parseCte(fixture('CTE_DUTO'))
    expect(duto.modal).toEqual({ kind: 'duto', vTar: '3.000000', dIni: '2024-10-01', dFim: '2024-10-31' })

    const multi = parseCte(fixture('CTE_MULTIMODAL'))
    expect(multi.modal).toMatchObject({ kind: 'multimodal', COTM: 'OTM-2024-0099', indNegociavel: '1' })
    if (multi.modal?.kind === 'multimodal') {
      expect(multi.modal.seg).toMatchObject({ xSeg: 'SEGURADORA BRASIL S.A.', nApol: 'APOL-554433', nAver: 'AVER-778899' })
    }
  })

  it('parses a CT-e OS (modelo 67) and a CT-e Simplificado (NT 2024.002)', () => {
    const os = parseCte(fixture('CTE_OS'))
    expect(os.kind).toBe('cteOS')
    expect(os.ide).toMatchObject({ mod: '67', tpServ: '6', percurso: ['SP', 'PR'] })
    expect(os.toma?.xNome).toBe('AGENCIA VIAGENS BRASIL LTDA')
    expect(os.servico).toEqual({ xDescServ: 'TRANSPORTE TURISTICO DE PASSAGEIROS', qCarga: '42.0000' })
    expect(os.imp.tribFed).toMatchObject({ vPIS: '27.30', vCOFINS: '126.00' })
    expect(os.seguros[0]).toMatchObject({ respSeg: '4', xSeg: 'SEGURADORA VIAGEM S.A.', nApol: 'AP-2024-9988' })
    expect(os.modal).toMatchObject({ kind: 'rodoOS', TAF: '123456789012', veic: { placa: 'BUS1A23', RENAVAM: '00987654321' } })

    const simp = parseCte(fixture('CTE_SIMP'))
    expect(simp.kind).toBe('cteSimp')
    expect(simp.ide.tpCTe).toBe('5')
    expect(simp.toma?.xNome).toBe('VAREJISTA CENTRAL S.A.')
    expect(simp.vPrest).toMatchObject({ vTPrest: '1150.00', vRec: '1150.00' })
    expect(simp.vPrest.comp).toHaveLength(2)
    expect(simp.docs).toHaveLength(2)
    expect(simp.simpDets).toHaveLength(2)
  })

  it('rejects other documents and malformed XML', () => {
    expect(() => parseCte('<resNFe xmlns="http://www.portalfiscal.inf.br/nfe"/>')).toThrowError(DanfeError)
    expect(() => parseCte('<CTe')).toThrowError(/could not be parsed/)
    try {
      parseCte('<procEventoCTe/>')
    } catch (e) {
      expect((e as DanfeError).code).toBe('unsupported-document')
    }
  })
})
