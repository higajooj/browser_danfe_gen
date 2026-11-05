import { FAMILIES } from '../render/styles'
import type { FontKind } from '../text'

const mm = (n: number) => `${Math.round(n * 100) / 100}mm`

/** Print CSS of the DANFE NFC-e: one sheet as wide as the paper roll and as tall as the content. */
export function nfceCss(font: FontKind, widthMm: number, heightMm: number, marginMm: number, topMm: number): string {
  return `
@page { size: ${mm(widthMm)} ${mm(heightMm)}; margin: 0 }
* { box-sizing: border-box }
html, body { margin: 0; padding: 0 }
body { font-family: ${FAMILIES[font]}; font-size: 8pt; color: #000; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact }
.page { position: relative; width: ${mm(widthMm)}; height: ${mm(heightMm)}; padding: ${mm(topMm)} ${mm(marginMm)} 0; overflow: hidden; background: #fff }
@media screen {
  body { background: #8a8a8a; padding: 16px 0 }
  .page { margin: 0 auto 16px; box-shadow: 0 1px 6px rgba(0,0,0,.5) }
}
.ln { white-space: nowrap; overflow: hidden }
.c { text-align: center }
.r { text-align: right }
.bold { font-weight: bold }
.ln.pair, .ln.row { display: flex; justify-content: space-between }
.ln > span { flex: none; white-space: nowrap; overflow: hidden }
.ln.row > span.r { text-align: right }
.hd { display: flex; align-items: center; gap: 2mm; overflow: hidden }
.hd img { flex: none; width: 18mm; max-height: 18mm; object-fit: contain }
.hd .hdt { flex: 1; min-width: 0 }
.cont { display: flex; flex-direction: column; justify-content: center; align-items: center; overflow: hidden;
  background: repeating-linear-gradient(to bottom, #fff 0 0.35mm, #000 0.35mm 0.5mm) }
.cont > div { background: #fff; padding: 0 2mm; font-weight: bold; white-space: nowrap; line-height: 1.2 }
.qrw { display: flex; justify-content: center; overflow: hidden }
.qr { display: block }
`
}
