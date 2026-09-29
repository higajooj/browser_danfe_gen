import { esc } from '../escape'
import type { Box } from '../layout/portrait'
import { fitPt, type FontKind } from '../text'

export interface Ctx {
  font: FontKind
  /** Vertical offset applied to the identification block (continuation sheets). */
  dy: number
  logoDataUri?: string
}

export const cm = (n: number): string => `${Math.round(n * 1000) / 1000}cm`

/** Horizontal room of a field value: box width minus borders and the left/right padding of `.v`. */
export const innerWidth = (w: number): number => w - 0.2

/** Absolutely positioned framed box; geometry is taken from the spec table. */
export function box(b: Box, cls: string, html: string, ctx: Ctx, style = ''): string {
  return (
    `<div class="b ${cls}" style="--l:${cm(b.l)};--t:${cm(b.t + ctx.dy)};--w:${cm(b.w)};--h:${cm(b.h)}${style}">` +
    `${html}</div>`
  )
}

/** Block title ("Invisível" rows of the spec): bold caps text above a group of boxes, no frame. */
export function title(b: Box, text: string, ctx: Ctx): string {
  return box(b, 'nb ttl', esc(text), ctx)
}

export interface FieldOpts {
  bold?: boolean
  align?: 'left' | 'right' | 'center'
  maxPt?: number
  minPt?: number
}

/** Framed field: small caps label on top, value below (auto-shrunk to one line, 10pt down to 7pt). */
export function field(b: Box, label: string, value: string, ctx: Ctx, o: FieldOpts = {}): string {
  const pt = fitPt(value, innerWidth(b.w), o.maxPt ?? 10, o.minPt ?? 7, o.bold, ctx.font)
  const labelPt = fitPt(label.toUpperCase(), innerWidth(b.w), 6, 5, false, ctx.font)
  const cls = [o.bold ? 'bold' : '', o.align === 'right' ? 'r' : o.align === 'center' ? 'c' : ''].join(' ')
  return box(
    b,
    'f',
    `<div class="l" style="font-size:${labelPt}pt">${esc(label)}</div><div class="v ${cls}" style="font-size:${pt}pt">${esc(value)}</div>`,
    ctx,
  )
}
