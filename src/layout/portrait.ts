/**
 * A4 portrait, folhas soltas (Anexo III.02). Values transcribed from MOC 7.0 Anexo II, 3.8.1
 * (Laser columns), in centimetres from the top-left corner of the sheet.
 * Rows that the spec lists only for impact printers ("Mat.") are widened to the laser layout.
 */
export interface Box {
  l: number
  t: number
  w: number
  h: number
}

const B = (l: number, t: number, w: number, h: number): Box => ({ l, t, w, h })

export const PAGE = { w: 21, h: 29.7 }

export const CANHOTO = {
  recebemos: B(0.25, 0.42, 16.1, 0.85),
  nfe: B(16.35, 0.42, 4.5, 1.7),
  data: B(0.25, 1.27, 4.1, 0.85),
  // spec lists 12.10, which would overlap the NF-e box by 0.1cm; clamped
  assinatura: B(4.35, 1.27, 12.0, 0.85),
  /** Y of the dashed cut line between canhoto and DANFE. */
  cutY: 2.33,
}

export const HEADER = {
  emitente: B(0.25, 2.54, 10.0, 3.92),
  danfe: B(10.25, 2.54, 2.54, 3.92),
  barcode: B(12.79, 2.54, 8.0, 1.48),
  chave: B(12.79, 4.02, 8.0, 0.85),
  campo1: B(12.79, 4.98, 8.0, 1.48),
  campo2: B(12.79, 6.46, 8.0, 0.85),
  natureza: B(0.25, 6.46, 12.54, 0.85),
  ie: B(0.25, 7.31, 6.86, 0.85),
  iest: B(7.11, 7.31, 6.86, 0.85),
  cnpj: B(13.97, 7.31, 6.86, 0.85),
  /** Bottom of the identification block on the first sheet. */
  end: 8.16,
}

/** Block titles ("Invisível" rows in the spec): text only, no frame. */
export const TITLE_H = 0.42

export const DEST = {
  title: B(0.25, 8.16, 3.3, 0.42),
  nome: B(0.25, 8.58, 12.32, 0.85),
  cnpj: B(12.57, 8.58, 5.33, 0.85),
  emissao: B(17.9, 8.58, 2.92, 0.85),
  endereco: B(0.25, 9.43, 10.16, 0.85),
  bairro: B(10.41, 9.43, 4.83, 0.85),
  cep: B(15.24, 9.43, 2.67, 0.85),
  saida: B(17.91, 9.43, 2.92, 0.85),
  municipio: B(0.25, 10.28, 7.11, 0.85),
  fone: B(7.36, 10.28, 4.06, 0.85),
  uf: B(11.42, 10.28, 1.14, 0.85),
  ie: B(12.56, 10.28, 5.33, 0.85),
  hora: B(17.89, 10.28, 2.92, 0.85),
}

export const FATURA = {
  title: B(0.25, 11.09, 5.0, 0.42),
  box: B(0.25, 11.51, 20.57, 0.85),
}

export const IMPOSTO = {
  title: B(0.25, 12.36, 5.6, 0.42),
  bcIcms: B(0.25, 12.78, 4.06, 0.85),
  icms: B(4.31, 12.78, 4.06, 0.85),
  bcSt: B(8.37, 12.78, 4.06, 0.85),
  st: B(12.43, 12.78, 4.06, 0.85),
  produtos: B(16.49, 12.78, 4.32, 0.85),
  frete: B(0.25, 13.63, 3.3, 0.85),
  seguro: B(3.55, 13.63, 3.3, 0.85),
  desconto: B(6.85, 13.63, 3.3, 0.85),
  outras: B(10.15, 13.63, 3.3, 0.85),
  ipi: B(13.45, 13.63, 3.3, 0.85),
  total: B(16.75, 13.63, 4.06, 0.85),
}

export const TRANSP = {
  title: B(0.25, 14.48, 5.2, 0.42),
  nome: B(0.25, 14.9, 9.02, 0.85),
  frete: B(9.27, 14.9, 2.79, 0.85),
  antt: B(12.06, 14.9, 1.78, 0.85),
  placa: B(13.84, 14.9, 2.29, 0.85),
  ufVeic: B(16.13, 14.9, 0.76, 0.85),
  doc: B(16.89, 14.9, 3.94, 0.85),
  endereco: B(0.25, 15.75, 9.02, 0.85),
  municipio: B(9.27, 15.75, 6.86, 0.85),
  uf: B(16.13, 15.75, 0.76, 0.85),
  ie: B(16.89, 15.75, 3.94, 0.85),
  qtd: B(0.25, 16.6, 2.92, 0.85),
  especie: B(3.17, 16.6, 3.05, 0.85),
  marca: B(6.22, 16.6, 3.05, 0.85),
  numeracao: B(9.27, 16.6, 4.83, 0.85),
  pesoB: B(14.1, 16.6, 3.43, 0.85),
  pesoL: B(17.53, 16.6, 3.3, 0.85),
}

export const ITENS = {
  title: B(0.25, 17.45, 4.0, 0.42),
  quadro: B(0.25, 17.87, 20.57, 6.77),
  /** Height of the column header strip inside the quadro. */
  headerH: 0.5,
}

/** Column widths in cm (sum = quadro width). Order is fixed by the spec (Obs 4). */
export const ITEM_COLUMNS = [
  { key: 'cod', label: 'CÓD. PROD.', w: 1.45, align: 'left' },
  { key: 'desc', label: 'DESCRIÇÃO DOS PRODUTOS / SERVIÇOS', w: 4.6, align: 'left' },
  { key: 'ncm', label: 'NCM/SH', w: 1.35, align: 'left' },
  { key: 'cst', label: 'CST', w: 0.8, align: 'left' },
  { key: 'cfop', label: 'CFOP', w: 0.85, align: 'left' },
  { key: 'un', label: 'UNID.', w: 0.75, align: 'left' },
  { key: 'qtd', label: 'QUANT.', w: 1.6, align: 'right' },
  { key: 'vun', label: 'VALOR UNIT.', w: 1.7, align: 'right' },
  { key: 'vtot', label: 'VALOR TOTAL', w: 1.7, align: 'right' },
  { key: 'bc', label: 'B.CÁLC. ICMS', w: 1.5, align: 'right' },
  { key: 'vicms', label: 'VALOR ICMS', w: 1.35, align: 'right' },
  { key: 'vipi', label: 'VALOR IPI', w: 1.2, align: 'right' },
  { key: 'aicms', label: 'ALÍQ. ICMS', w: 0.86, align: 'right' },
  { key: 'aipi', label: 'ALÍQ. IPI', w: 0.86, align: 'right' },
] as const

export type ItemColumnKey = (typeof ITEM_COLUMNS)[number]['key']

export const ISSQN = {
  title: B(0.25, 24.64, 2.29, 0.42),
  im: B(0.25, 25.06, 5.08, 0.85),
  servicos: B(5.33, 25.06, 5.08, 0.85),
  bc: B(10.41, 25.06, 5.08, 0.85),
  iss: B(15.49, 25.06, 5.33, 0.85),
}

export const ADICIONAIS = {
  title: B(0.25, 25.91, 2.29, 0.42),
  info: B(0.25, 26.33, 12.95, 3.07),
  fisco: B(13.17, 26.33, 7.62, 3.07),
}

/** Last usable Y on the sheet (bottom of Informações Complementares). */
export const CONTENT_BOTTOM = 29.4

/** Continuation sheets have no canhoto: the identification block moves up by this much (3.5). */
export const CONTINUATION_DY = -(HEADER.emitente.t - CANHOTO.recebemos.t)
