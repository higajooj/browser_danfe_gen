import { css } from '../render/styles'
import type { FontKind } from '../text'

/** Print CSS of the DACTE / DACTE OS: shared A4 page/box rules plus CT-e section and table classes. */
export function dacteCss(font: FontKind): string {
  return (
    css(font) +
    `
.st { background: #e8e8e8; font-size: 6pt; font-weight: bold; text-transform: uppercase; text-align: center; line-height: 0.36cm; white-space: nowrap; overflow: hidden }
.ct-title { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 0 0.06cm }
.ct-title .t1 { font-size: 9.5pt; font-weight: bold; line-height: 1.0 }
.ct-title .t2 { font-size: 6pt; font-weight: bold; line-height: 1.08; white-space: nowrap }
.ct-emit { display: flex; height: 100%; align-items: center; padding: 0.04cm 0.08cm; gap: 0.1cm }
.ct-emit img { max-width: 1.9cm; max-height: 2.2cm; object-fit: contain; flex-shrink: 0 }
.ct-emit .txt { flex: 1; text-align: center; overflow: hidden }
.ct-emit .nome { font-weight: bold; line-height: 1.1; white-space: nowrap }
.ct-emit .end { line-height: 1.2; white-space: nowrap }
.ct-bc { display: flex; align-items: center; justify-content: center }
.ct-qr { display: flex; align-items: center; justify-content: center }
.ct-msg { display: flex; align-items: center; justify-content: center; text-align: center; font-size: ${font === 'courier' ? '6.5pt' : '7pt'}; line-height: 1.12; padding: 0.02cm 0.1cm }
.ct-msg.hom { font-weight: bold; text-transform: uppercase }
.ct-canh-hdr { background: #e8e8e8; font-weight: bold; text-align: center; line-height: 0.38cm; padding: 0 0.08cm; white-space: nowrap; overflow: hidden }
.ct-canh-sig { display: flex; flex-direction: column; justify-content: flex-end; align-items: center; padding-bottom: 0.08cm; font-size: 5.5pt; text-transform: uppercase }
.ct-canh-n { text-align: center; font-weight: bold; padding-top: 0.08cm; line-height: 1.25 }
.ct-kv { display: flex; align-items: baseline; gap: 0.08cm; padding: 0 0.08cm; overflow: hidden; white-space: nowrap }
.ct-kv .k { font-size: 5.5pt; text-transform: uppercase; flex-shrink: 0 }
.ct-kv .val { overflow: hidden; white-space: nowrap }
.ct-chk { display: flex; align-items: center; justify-content: center; gap: 0.18cm; font-size: 6.5pt; padding-top: 0.04cm; white-space: nowrap }
.ct-chk .sq { display: inline-block; width: 0.28cm; height: 0.28cm; border: var(--bw) solid #000; text-align: center; line-height: 0.25cm; font-weight: bold; font-size: 6.5pt; margin-right: 0.05cm }
.ct-th { background: #f3f3f3; display: flex; align-items: center; font-size: 5.5pt; font-weight: bold; text-transform: uppercase; line-height: 1; padding: 0 0.06cm; white-space: nowrap; overflow: hidden }
.ct-th.r { justify-content: flex-end }
.ct-td { display: flex; align-items: center; line-height: 1; padding: 0 0.06cm; white-space: nowrap; overflow: hidden }
.ct-td.r { justify-content: flex-end }
.ct-obs { padding: 0.04cm 0.08cm; white-space: nowrap; overflow: hidden }
.ct-hom-bar { background: #e8e8e8; font-size: 7pt; font-weight: bold; text-align: center; text-transform: uppercase; line-height: 0.42cm; white-space: nowrap }
.qr { display: block }
`
  )
}
