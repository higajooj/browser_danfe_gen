import { DanfeError } from '../errors'
import { docOf, kid, kids, parseEndereco, parseProt, parseXml, path, txt, type El } from '../parse'
import type {
  Mdfe,
  MdfeDoc,
  MdfeModal,
  ModalAereo,
  ModalAquav,
  ModalFerrov,
  ModalRodo,
  Terminal,
  UnidTransp,
  Veiculo,
} from './model'

function parseUnidTransp(el: Element): UnidTransp[] {
  return kids(el, 'infUnidTransp').map((u) => ({
    tpUnidTransp: txt(u, 'tpUnidTransp'),
    idUnidTransp: txt(u, 'idUnidTransp'),
    cargas: kids(u, 'infUnidCarga').map((c) => ({ tpUnidCarga: txt(c, 'tpUnidCarga'), idUnidCarga: txt(c, 'idUnidCarga') })),
  }))
}

function parseDocs(infDoc: El): MdfeDoc[] {
  const out: MdfeDoc[] = []
  for (const mun of kids(infDoc, 'infMunDescarga')) {
    for (const [name, tipo, chaveTag] of [
      ['infCTe', 'CT-e', 'chCTe'],
      ['infNFe', 'NF-e', 'chNFe'],
      ['infMDFeTransp', 'MDF-e', 'chMDFe'],
    ] as const) {
      for (const d of kids(mun, name)) out.push({ tipo, chave: txt(d, chaveTag), unidTransp: parseUnidTransp(d) })
    }
  }
  return out
}

function parseVeiculo(el: Element): Veiculo {
  return { placa: txt(el, 'placa'), RENAVAM: txt(el, 'RENAVAM'), RNTRC: txt(el, 'prop', 'RNTRC') }
}

function parseRodo(rodo: Element): ModalRodo {
  const trac = kid(rodo, 'veicTracao')
  return {
    kind: 'rodo',
    RNTRC: txt(rodo, 'infANTT', 'RNTRC'),
    veicTracao: trac ? parseVeiculo(trac) : null,
    veicReboque: kids(rodo, 'veicReboque').map(parseVeiculo),
    condutores: kids(trac, 'condutor').map((c) => ({ xNome: txt(c, 'xNome'), CPF: txt(c, 'CPF') })),
    valePedagio: kids(path(rodo, 'infANTT', 'valePed'), 'disp').map((d) => ({
      responsavel: txt(d, 'CNPJPg') || txt(d, 'CPFPg'),
      CNPJForn: txt(d, 'CNPJForn'),
      nCompra: txt(d, 'nCompra'),
    })),
  }
}

function parseAereo(aereo: Element): ModalAereo {
  return {
    kind: 'aereo',
    nac: txt(aereo, 'nac'),
    matr: txt(aereo, 'matr'),
    nVoo: txt(aereo, 'nVoo'),
    dVoo: txt(aereo, 'dVoo'),
    cAerEmb: txt(aereo, 'cAerEmb'),
    cAerDes: txt(aereo, 'cAerDes'),
  }
}

function parseAquav(aquav: Element): ModalAquav {
  const terminals = (name: string, cod: string, nome: string): Terminal[] =>
    kids(aquav, name).map((t) => ({ cod: txt(t, cod), nome: txt(t, nome) }))
  return {
    kind: 'aquav',
    cEmbar: txt(aquav, 'cEmbar'),
    xEmbar: txt(aquav, 'xEmbar'),
    termCarreg: terminals('infTermCarreg', 'cTermCarreg', 'xTermCarreg'),
    termDescarreg: terminals('infTermDescarreg', 'cTermDescarreg', 'xTermDescarreg'),
    transpVazia: kids(aquav, 'infUnidTranspVazia').map((u) => ({ id: txt(u, 'idUnidTranspVazia'), tipo: txt(u, 'tpUnidTranspVazia') })),
    cargaVazia: kids(aquav, 'infUnidCargaVazia').map((u) => ({ id: txt(u, 'idUnidCargaVazia'), tipo: txt(u, 'tpUnidCargaVazia') })),
  }
}

function parseFerrov(ferrov: Element): ModalFerrov {
  const trem = kid(ferrov, 'trem')
  return {
    kind: 'ferrov',
    xPref: txt(trem, 'xPref'),
    dhTrem: txt(trem, 'dhTrem'),
    xOri: txt(trem, 'xOri'),
    xDest: txt(trem, 'xDest'),
    qVag: txt(trem, 'qVag'),
    vagoes: kids(ferrov, 'vag').map((v) => ({ serie: txt(v, 'serie'), nVag: txt(v, 'nVag'), nSeq: txt(v, 'nSeq'), TU: txt(v, 'TU') })),
  }
}

function parseModal(infModal: El): MdfeModal | null {
  const rodo = kid(infModal, 'rodo')
  if (rodo) return parseRodo(rodo)
  const aereo = kid(infModal, 'aereo')
  if (aereo) return parseAereo(aereo)
  const aquav = kid(infModal, 'aquav')
  if (aquav) return parseAquav(aquav)
  const ferrov = kid(infModal, 'ferrov')
  if (ferrov) return parseFerrov(ferrov)
  return null
}

/** Parse an already-loaded <mdfeProc> or bare <MDFe> document. Throws DanfeError otherwise. */
export function parseMdfeDocument(doc: Document): Mdfe {
  const root = doc.documentElement
  let mdfe: El
  let protEl: El = null
  if (root.localName === 'mdfeProc') {
    mdfe = kid(root, 'MDFe')
    protEl = kid(root, 'protMDFe')
  } else if (root.localName === 'MDFe') {
    mdfe = root
  }
  const inf = kid(mdfe, 'infMDFe')
  if (!mdfe || !inf) {
    throw new DanfeError('unsupported-document', `Expected an MDF-e (mdfeProc/MDFe), got <${root.localName}>`)
  }

  const ide = kid(inf, 'ide')
  const emit = kid(inf, 'emit')
  const tot = kid(inf, 'tot')
  const infAdic = kid(inf, 'infAdic')
  const chave = (inf.getAttribute('Id') ?? '').replace(/^MDFe/, '') || txt(protEl, 'infProt', 'chMDFe')

  return {
    chave,
    versao: inf.getAttribute('versao') ?? '',
    ide: {
      tpAmb: txt(ide, 'tpAmb'),
      tpEmis: txt(ide, 'tpEmis'),
      mod: txt(ide, 'mod'),
      serie: txt(ide, 'serie'),
      nMDF: txt(ide, 'nMDF'),
      modal: txt(ide, 'modal'),
      dhEmi: txt(ide, 'dhEmi'),
      UFIni: txt(ide, 'UFIni'),
      UFFim: txt(ide, 'UFFim'),
    },
    emit: {
      doc: docOf(emit),
      xNome: txt(emit, 'xNome'),
      xFant: txt(emit, 'xFant'),
      ender: parseEndereco(kid(emit, 'enderEmit')),
      IE: txt(emit, 'IE'),
      IEST: '',
      IM: '',
    },
    tot: {
      qCTe: txt(tot, 'qCTe'),
      qNFe: txt(tot, 'qNFe'),
      qMDFe: txt(tot, 'qMDFe'),
      cUnid: txt(tot, 'cUnid'),
      qCarga: txt(tot, 'qCarga'),
    },
    docs: parseDocs(kid(inf, 'infDoc')),
    modal: parseModal(kid(inf, 'infModal')),
    infAdic: { infAdFisco: txt(infAdic, 'infAdFisco'), infCpl: txt(infAdic, 'infCpl') },
    qrCod: txt(mdfe, 'infMDFeSupl', 'qrCodMDFe'),
    prot: parseProt(protEl),
  }
}

/** Parse an <mdfeProc> or bare <MDFe> document. Throws DanfeError otherwise. */
export function parseMdfe(xml: string): Mdfe {
  return parseMdfeDocument(parseXml(xml))
}
