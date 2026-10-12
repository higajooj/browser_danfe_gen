import type { Emitente, Protocolo } from '../model'

/** Unit of load (container, ULD, pallet...) carried by a transport unit. */
export interface UnidCarga {
  tpUnidCarga: string
  idUnidCarga: string
}

/** Transport unit (vehicle, vessel, wagon...) that carries the fiscal document. */
export interface UnidTransp {
  tpUnidTransp: string
  idUnidTransp: string
  cargas: UnidCarga[]
}

/** CT-e, NF-e or MDF-e aggregated by the manifest. */
export interface MdfeDoc {
  tipo: 'CT-e' | 'NF-e' | 'MDF-e'
  chave: string
  unidTransp: UnidTransp[]
}

export interface Veiculo {
  placa: string
  RENAVAM: string
  /** RNTRC of the owner (<prop>), when the vehicle is not the carrier's own. */
  RNTRC: string
}

export interface Condutor {
  xNome: string
  CPF: string
}

export interface ValePedagio {
  /** CNPJPg / CPFPg: who pays the toll. */
  responsavel: string
  CNPJForn: string
  nCompra: string
}

export interface Terminal {
  cod: string
  nome: string
}

export interface Vagao {
  serie: string
  nVag: string
  nSeq: string
  TU: string
}

export interface ModalRodo {
  kind: 'rodo'
  RNTRC: string
  veicTracao: Veiculo | null
  veicReboque: Veiculo[]
  condutores: Condutor[]
  valePedagio: ValePedagio[]
}

export interface ModalAereo {
  kind: 'aereo'
  nac: string
  matr: string
  nVoo: string
  dVoo: string
  cAerEmb: string
  cAerDes: string
}

export interface ModalAquav {
  kind: 'aquav'
  cEmbar: string
  xEmbar: string
  termCarreg: Terminal[]
  termDescarreg: Terminal[]
  /** Empty transport units (infUnidTranspVazia) and load units (infUnidCargaVazia). */
  transpVazia: { id: string; tipo: string }[]
  cargaVazia: { id: string; tipo: string }[]
}

export interface ModalFerrov {
  kind: 'ferrov'
  xPref: string
  dhTrem: string
  xOri: string
  xDest: string
  qVag: string
  vagoes: Vagao[]
}

export type MdfeModal = ModalRodo | ModalAereo | ModalAquav | ModalFerrov

/** Flat, string-based view of an MDF-e. Values are kept exactly as written in the XML. */
export interface Mdfe {
  chave: string
  versao: string
  ide: {
    tpAmb: string
    tpEmis: string
    mod: string
    serie: string
    nMDF: string
    modal: string
    dhEmi: string
    UFIni: string
    UFFim: string
  }
  emit: Emitente
  tot: { qCTe: string; qNFe: string; qMDFe: string; cUnid: string; qCarga: string }
  docs: MdfeDoc[]
  modal: MdfeModal | null
  infAdic: { infAdFisco: string; infCpl: string }
  /** infMDFeSupl/qrCodMDFe */
  qrCod: string
  prot: Protocolo | null
}
