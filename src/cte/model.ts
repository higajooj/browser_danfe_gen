import type { Cobranca, Emitente, Endereco, Protocolo } from '../model'

export type CteKind = 'cte' | 'cteOS' | 'cteSimp'

export interface CteEndereco extends Endereco {
  xPais: string
}

/** Remetente, Destinatário, Expedidor, Recebedor or Tomador do Serviço. */
export interface CteParte {
  doc: string
  IE: string
  xNome: string
  xFant: string
  fone: string
  ISUF: string
  ender: CteEndereco
}

export interface CteQuantidade {
  cUnid: string
  tpMed: string
  qCarga: string
}

export interface CteComponente {
  xNome: string
  vComp: string
}

export interface CteIcms {
  /** Group tag name: ICMS00, ICMS20, ICMS45, ICMS60, ICMS90, ICMSOutraUF, ICMSSN or ''. */
  kind: string
  CST: string
  vBC: string
  pICMS: string
  vICMS: string
  pRedBC: string
  vCred: string
  vICMSDeson: string
  cBenef: string
  /** True when own ICMS is highlighted (ICMS00/20/90 with vICMS, MOC 2.19.2). */
  icmsProprio: boolean
  /** True when ICMS-ST is highlighted (ICMS60, MOC 2.19.2). */
  icmsST: boolean
}

export interface CteIcmsUfFim {
  vBCUFFim: string
  pFCPUFFim: string
  pICMSUFFim: string
  pICMSInter: string
  vFCPUFFim: string
  vICMSUFFim: string
  vICMSUFIni: string
}

export interface CteTribFed {
  vPIS: string
  vCOFINS: string
  vIR: string
  vINSS: string
  vCSLL: string
}

export type CteDocOriginario =
  | { kind: 'NFe'; chave: string; PIN: string; dPrev: string }
  | { kind: 'NF'; mod: string; serie: string; nDoc: string; dEmi: string; vNF: string }
  | { kind: 'Outros'; tpDoc: string; descOutros: string; nDoc: string; dEmi: string; vDocFisc: string }
  | { kind: 'DCe'; chave: string }

export interface CteDocAnterior {
  emiDoc: string
  emiNome: string
  /** Either an electronic CT-e key or a paper transport document. */
  chCTe: string
  tpDoc: string
  serie: string
  nDoc: string
}

export interface CteDocRefOS {
  nDoc: string
  serie: string
  subserie: string
  dEmi: string
  vDoc: string
  chBPe: string
}

export interface CteSeguro {
  respSeg: string
  xSeg: string
  CNPJ: string
  nApol: string
  nAver: string
}

export interface CteVeicNovo {
  chassi: string
  cCor: string
  xCor: string
  cMod: string
  vUnit: string
  vFrete: string
}

export interface CteArtigoPerigoso {
  nONU: string
  qTotEmb: string
  qTotProd: string
  uniAP: string
}

export interface CteContainer {
  nCont: string
  lacres: string[]
  nfes: string[]
  nfs: { serie: string; nDoc: string }[]
}

export interface CteFerroviaEnv {
  CNPJ: string
  cInt: string
  IE: string
  xNome: string
}

export interface CteOcc {
  serie: string
  nOcc: string
  dEmi: string
  CNPJ: string
  IE: string
  UF: string
}

export interface CteModalRodo {
  kind: 'rodo'
  RNTRC: string
  occ: CteOcc[]
}

export interface CteModalAereo {
  kind: 'aereo'
  nMinu: string
  nOCA: string
  dPrevAereo: string
  xDime: string
  cInfManu: string[]
  CL: string
  cTar: string
  vTar: string
  peri: CteArtigoPerigoso[]
}

export interface CteModalAquav {
  kind: 'aquav'
  vPrest: string
  vAFRMM: string
  xNavio: string
  balsas: string[]
  nViag: string
  direc: string
  irin: string
  tpNav: string
  detCont: CteContainer[]
}

export interface CteModalFerrov {
  kind: 'ferrov'
  tpTraf: string
  fluxo: string
  respFat: string
  ferrEmi: string
  vFrete: string
  chCTeFerroOrigem: string
  ferroEnv: CteFerroviaEnv[]
}

export interface CteModalDuto {
  kind: 'duto'
  vTar: string
  dIni: string
  dFim: string
}

export interface CteModalMultimodal {
  kind: 'multimodal'
  COTM: string
  indNegociavel: string
  seg: CteSeguro | null
}

export interface CteModalRodoOS {
  kind: 'rodoOS'
  TAF: string
  NroRegEstadual: string
  veic: {
    placa: string
    RENAVAM: string
    UF: string
    prop: {
      doc: string
      TAF: string
      NroRegEstadual: string
      xNome: string
      IE: string
      UF: string
      tpProp: string
    } | null
  } | null
  tpFretamento: string
  dhViagem: string
}

export type CteModal =
  | CteModalRodo
  | CteModalAereo
  | CteModalAquav
  | CteModalFerrov
  | CteModalDuto
  | CteModalMultimodal
  | CteModalRodoOS

export interface CteSimpDet {
  nItem: string
  xMunIni: string
  xMunFim: string
  vPrest: string
  vRec: string
  nfes: string[]
  docsAnt: string[]
}

/** Flat, string-based view of a CT-e (modelo 57), CT-e OS (modelo 67) or CT-e Simplificado. */
export interface Cte {
  kind: CteKind
  chave: string
  versao: string
  ide: {
    cUF: string
    CFOP: string
    natOp: string
    mod: string
    serie: string
    nCT: string
    dhEmi: string
    tpImp: string
    tpEmis: string
    tpAmb: string
    tpCTe: string
    indGlobalizado: string
    modal: string
    tpServ: string
    cMunIni: string
    xMunIni: string
    UFIni: string
    cMunFim: string
    xMunFim: string
    UFFim: string
    retira: string
    xDetRetira: string
    indIEToma: string
    tomaTipo: string
    percurso: string[]
    dhCont: string
    xJust: string
  }
  compl: {
    xCaracAd: string
    xCaracSer: string
    xEmi: string
    fluxo: { xOrig: string; xPass: string[]; xDest: string; xRota: string }
    xObs: string
    obsCont: { xCampo: string; xTexto: string }[]
    obsFisco: { xCampo: string; xTexto: string }[]
  }
  emit: Emitente & { CRT: string }
  rem: CteParte | null
  exped: CteParte | null
  receb: CteParte | null
  dest: CteParte | null
  /** Resolved tomador do serviço (toma4/toma or the referenced party from toma3). */
  toma: CteParte | null
  vPrest: {
    vTPrest: string
    vRec: string
    comp: CteComponente[]
  }
  imp: {
    icms: CteIcms
    vTotTrib: string
    infAdFisco: string
    vTotDFe: string
    icmsUFFim: CteIcmsUfFim | null
    tribFed: CteTribFed | null
  }
  carga: {
    vCarga: string
    proPred: string
    xOutCat: string
    vCargaAverb: string
    quantidades: CteQuantidade[]
  } | null
  servico: {
    xDescServ: string
    qCarga: string
  } | null
  docs: CteDocOriginario[]
  docsAnt: CteDocAnterior[]
  docsRefOS: CteDocRefOS[]
  gtves: string[]
  cteComp: string[]
  cteSub: { chCte: string; refCTeCanc: string; indAlteraToma: string } | null
  cteMultimodalVinc: string[]
  globalizadoObs: string
  seguros: CteSeguro[]
  veicNovos: CteVeicNovo[]
  cobr: Cobranca
  modal: CteModal | null
  simpDets: CteSimpDet[]
  /** infCTeSupl/qrCodCTe */
  qrCod: string
  prot: Protocolo | null
}
