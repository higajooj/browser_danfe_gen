import { parseNfeDocument, parseXml } from './parse'
import { DanfeError } from './errors'
import { parseMdfe, parseMdfeDocument } from './mdfe/parse'
import { renderDamdfe } from './mdfe/render'
import { renderDocument } from './render/document'
import type { DanfeOptions } from './options'

/**
 * Generate a self-contained, print-ready document (A4 portrait) from an XML string:
 * the DANFE for an NF-e (`nfeProc`/`NFe`) or the DAMDFE for an MDF-e (`mdfeProc`/`MDFe`).
 */
export function generateDanfeHtml(xml: string, options: DanfeOptions = {}): string {
  const doc = parseXml(xml)
  switch (doc.documentElement.localName) {
    case 'mdfeProc':
    case 'MDFe':
      return renderDamdfe(parseMdfeDocument(doc), options)
    case 'nfeProc':
    case 'NFe':
      return renderDocument(parseNfeDocument(doc), options)
    default:
      throw new DanfeError(
        'unsupported-document',
        `Expected an NF-e (nfeProc/NFe) or MDF-e (mdfeProc/MDFe), got <${doc.documentElement.localName}>`,
      )
  }
}

/** Generate the DAMDFE (MDF-e, modelo 58) from an `mdfeProc` or `MDFe` XML string. */
export function generateDamdfeHtml(xml: string, options: DanfeOptions = {}): string {
  return renderDamdfe(parseMdfe(xml), options)
}

export { printDanfe } from './print'
export { DanfeError } from './errors'
export type { DanfeErrorCode } from './errors'
export type { DanfeOptions } from './options'
export type { Nfe } from './model'
export type { Mdfe } from './mdfe/model'
export { parseNfe } from './parse'
export { parseMdfe } from './mdfe/parse'
