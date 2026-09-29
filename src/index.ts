import { parseNfe } from './parse'
import { renderDocument } from './render/document'
import type { DanfeOptions } from './options'

/** Generate a self-contained, print-ready DANFE (A4 portrait) from an NF-e XML string. */
export function generateDanfeHtml(xml: string, options: DanfeOptions = {}): string {
  return renderDocument(parseNfe(xml), options)
}

export { printDanfe } from './print'
export { DanfeError } from './errors'
export type { DanfeErrorCode } from './errors'
export type { DanfeOptions } from './options'
export type { Nfe } from './model'
export { parseNfe } from './parse'
