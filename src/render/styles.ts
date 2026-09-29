import type { FontKind } from '../text'

const FAMILIES: Record<FontKind, string> = {
  times: `"Times New Roman", "Liberation Serif", Tinos, Times, serif`,
  courier: `"Courier New", "Liberation Mono", Cousine, Courier, monospace`,
}

/**
 * Print CSS. Everything is positioned in centimetres from the sheet corner, exactly as in the spec;
 * `@page` removes the browser margins so the printed geometry equals the layout table.
 */
export function css(font: FontKind): string {
  return `
@page { size: 21cm 29.7cm; margin: 0 }
:root { --bw: 0.5pt }
* { box-sizing: border-box }
html, body { margin: 0; padding: 0 }
body { font-family: ${FAMILIES[font]}; font-size: 10pt; color: #000; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact }
.page { position: relative; width: 21cm; height: 29.69cm; overflow: hidden; background: #fff; break-after: page; page-break-after: always }
.page:last-child { break-after: auto; page-break-after: auto }
@media screen {
  body { background: #8a8a8a; padding: 16px 0 }
  .page { margin: 0 auto 16px; box-shadow: 0 1px 6px rgba(0,0,0,.5) }
}
.b { position: absolute; left: var(--l); top: var(--t); width: calc(var(--w) + var(--bw)); height: calc(var(--h) + var(--bw)); border: var(--bw) solid #000; overflow: hidden }
.b.nb { border: 0; width: var(--w); height: var(--h) }
.ttl { font-size: 6pt; font-weight: bold; text-transform: uppercase; line-height: 1; padding: 0.16cm 0 0 0.02cm; white-space: nowrap }
.l { font-size: 6pt; line-height: 1; padding: 0.05cm 0.08cm 0; text-transform: uppercase; white-space: nowrap }
.v { padding: 0 0.08cm; line-height: 1.15; white-space: nowrap; overflow: hidden }
.r { text-align: right }
.c { text-align: center }
.bold { font-weight: bold }
.cut { position: absolute; left: 0.25cm; width: 20.57cm; height: 0; border-top: 0.5pt dashed #000 }
.txt6 { font-size: 6pt; line-height: 1.25; padding: 0.05cm 0.08cm; white-space: nowrap }
.canh-nfe { text-align: center; font-weight: bold; padding-top: 0.1cm }
.canh-nfe .n { font-size: 10pt; line-height: 1.3 }
.emit { display: flex; height: 100%; align-items: center }
.emit img { max-width: 3.4cm; max-height: 3.6cm; margin: 0 0.1cm 0 0.15cm; object-fit: contain }
.emit .txt { flex: 1; text-align: center; font-weight: bold; padding: 0 0.1cm; overflow: hidden }
.emit .nome { font-size: 12pt; line-height: 1.1; white-space: nowrap }
.emit .end { font-size: 8pt; line-height: 1.2; white-space: nowrap }
.dnf { text-align: center; padding-top: 0.03cm }
.dnf .t1 { font-size: 12pt; font-weight: bold; line-height: 1.1 }
.dnf .doc { font-size: 8pt; font-weight: bold; line-height: 1.05; margin-top: 0.02cm; white-space: nowrap }
.dnf .io { display: flex; align-items: center; justify-content: center; gap: 0.15cm; margin: 0.04cm 0 }
.dnf .io .lb { font-size: 8pt; line-height: 1.2; text-align: left; white-space: nowrap }
.dnf .io .sq { width: 0.55cm; height: 0.55cm; border: var(--bw) solid #000; font-size: 10pt; font-weight: bold; line-height: 0.5cm }
.dnf .num { font-size: 10pt; font-weight: bold; line-height: 1.1; white-space: nowrap }
.dnf .num small { font-size: 8pt }
.bc { display: flex; align-items: flex-start; justify-content: center; padding-top: 0.2cm }
.barcode { display: block }
.msg { text-align: center; font-size: 8pt; line-height: 1.15; padding: 0.08cm 0.1cm }
.q .qh { display: flex; height: var(--hh); border-bottom: var(--bw) solid #000 }
.q .qh div { font-size: 5pt; font-weight: bold; line-height: 1; text-align: center; display: flex; align-items: center; justify-content: center; padding: 0 0.02cm; overflow: hidden }
.q .vl { position: absolute; top: 0; bottom: 0; border-left: var(--bw) solid #000 }
.q .row { display: flex; height: var(--lh); font-size: 6pt; line-height: var(--lh) }
.q .row > div { white-space: nowrap; overflow: hidden; padding: 0 0.06cm }
.q .row > div.r { text-align: right }
.q .row.last { border-bottom: var(--bw) dashed #666 }
.wm { position: absolute; left: 0; right: 0; top: 11cm; text-align: center; transform: rotate(-35deg); font-size: 64pt; font-weight: bold; color: rgba(0,0,0,.09); white-space: nowrap; pointer-events: none }
.cont { font-weight: bold }
`
}
