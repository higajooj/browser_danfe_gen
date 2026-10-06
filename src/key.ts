/**
 * Modulo-11 check digit used by the access key (weights 2..9 from the right).
 * Also used for the additional "Dados da NF-e" barcode of FS/FS-DA contingency (3.9.2).
 * A character counts as its ASCII code less 48, so a digit is itself and the letters of an
 * alphanumeric CNPJ go from 17 (NT conjunta DFe 2025.001).
 */
export function mod11(numeric: string): number {
  let weight = 2
  let sum = 0
  for (let i = numeric.length - 1; i >= 0; i--) {
    sum += (numeric.charCodeAt(i) - 48) * weight
    weight = weight === 9 ? 2 : weight + 1
  }
  const rest = sum % 11
  return rest < 2 ? 0 : 11 - rest
}

const UF_CODES: Record<string, string> = {
  RO: '11', AC: '12', AM: '13', RR: '14', PA: '15', AP: '16', TO: '17',
  MA: '21', PI: '22', CE: '23', RN: '24', PB: '25', PE: '26', AL: '27', SE: '28', BA: '29',
  MG: '31', ES: '32', RJ: '33', SP: '35',
  PR: '41', SC: '42', RS: '43',
  MS: '50', MT: '51', GO: '52', DF: '53',
}

export function ufCode(uf: string): string | undefined {
  return UF_CODES[uf.toUpperCase()]
}

export interface ContingencyInput {
  /** UF code of the recipient/sender; "99" for foreign trade. */
  cUF: string
  tpEmis: string
  /** CNPJ (14) or CPF (11) of the recipient/sender; empty for foreign trade. */
  doc: string
  /** vNF as written in the XML (e.g. "5287.60"). */
  vNF: string
  icmsProprio: boolean
  icmsST: boolean
  /** Day of the emission date, 1..31. */
  day: number
}

/** 36-character additional barcode of FS/FS-DA contingency (3.9.2): cUF tpEmis CNPJ vNF ICMSp ICMSs DD DV. */
export function contingencyData(i: ContingencyInput): string {
  const cents = Math.round(Number(i.vNF) * 100)
  const body =
    i.cUF.padStart(2, '0').slice(-2) +
    i.tpEmis.slice(0, 1) +
    i.doc.replace(/[^0-9A-Za-z]/g, '').toUpperCase().padStart(14, '0').slice(-14) +
    String(Math.max(0, cents)).padStart(14, '0').slice(-14) +
    (i.icmsProprio ? '1' : '2') +
    (i.icmsST ? '1' : '2') +
    String(i.day).padStart(2, '0').slice(-2)
  return body + String(mod11(body))
}
