import { parseNfeDocument, parseXml } from './parse'
import { DanfeError } from './errors'
import { parseCte, parseCteDocument } from './cte/parse'
import { renderDacte } from './cte/render'
import { parseMdfe, parseMdfeDocument } from './mdfe/parse'
import { renderDamdfe } from './mdfe/render'
import { renderDanfeNfce } from './nfce/render'
import { parseNfse, parseNfseDocument } from './nfse/parse'
import { renderDanfse } from './nfse/render'
import { renderDocument } from './render/document'
import type { DanfeOptions } from './options'

/**
 * Generate a self-contained, print-ready document from an XML string: the DANFE (A4 portrait) for an
 * NF-e, the DANFE NFC-e (receipt roll) for an NFC-e (both `nfeProc`/`NFe`, told apart by `mod`), the
 * DACTE / DACTE OS (A4 portrait) for a CT-e (`cteProc`/`CTe`, `cteOSProc`/`CTeOS`, `cteSimpProc`/`CTeSimp`),
 * the DAMDFE (A4 portrait) for an MDF-e (`mdfeProc`/`MDFe`), or the DANFSe (A4 portrait) for a national
 * NFS-e (`NFSe`).
 */
export function generateDanfeHtml(xml: string, options: DanfeOptions = {}): string {
  const doc = parseXml(xml)
  switch (doc.documentElement.localName) {
    case 'NFSe':
      return renderDanfse(parseNfseDocument(doc), options)
    case 'cteProc':
    case 'CTe':
    case 'cteOSProc':
    case 'CTeOS':
    case 'cteSimpProc':
    case 'CTeSimp':
      return renderDacte(parseCteDocument(doc), options)
    case 'mdfeProc':
    case 'MDFe':
      return renderDamdfe(parseMdfeDocument(doc), options)
    case 'nfeProc':
    case 'NFe': {
      const nfe = parseNfeDocument(doc)
      return nfe.ide.mod === '65' ? renderDanfeNfce(nfe, options) : renderDocument(nfe, options)
    }
    default:
      throw new DanfeError(
        'unsupported-document',
        `Expected an NF-e (nfeProc/NFe), CT-e (cteProc/CTe/CTeOS/CTeSimp), MDF-e (mdfeProc/MDFe) or national NFS-e (NFSe), got <${doc.documentElement.localName}>`,
      )
  }
}

/** Generate the DACTE (CT-e modelo 57 / Simplificado) or DACTE OS (CT-e OS modelo 67) from an XML string. */
export function generateDacteHtml(xml: string, options: DanfeOptions = {}): string {
  return renderDacte(parseCte(xml), options)
}

/** Generate the DANFSe from a national `NFSe` XML string. */
export function generateDanfseHtml(xml: string, options: DanfeOptions = {}): string {
  return renderDanfse(parseNfse(xml), options)
}

/** Generate the DAMDFE (MDF-e, modelo 58) from an `mdfeProc` or `MDFe` XML string. */
export function generateDamdfeHtml(xml: string, options: DanfeOptions = {}): string {
  return renderDamdfe(parseMdfe(xml), options)
}

/** Generate the DANFE NFC-e (modelo 65) from an `nfeProc` or `NFe` XML string, whatever its `mod`. */
export function generateDanfeNfceHtml(xml: string, options: DanfeOptions = {}): string {
  return renderDanfeNfce(parseNfeDocument(parseXml(xml)), options)
}

export { printDanfe } from './print'
export { DanfeError } from './errors'
export type { DanfeErrorCode } from './errors'
export type { CteOptions, DanfeOptions, NfceOptions, NfseOptions } from './options'
export type { Nfe } from './model'
export type { Cte } from './cte/model'
export type { Mdfe } from './mdfe/model'
export type { Nfse } from './nfse/parse'
export { parseNfe } from './parse'
export { parseCte } from './cte/parse'
export { parseMdfe } from './mdfe/parse'
export { parseNfse } from './nfse/parse'
