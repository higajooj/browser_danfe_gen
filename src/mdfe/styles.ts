import { css } from '../render/styles'
import type { FontKind } from '../text'

/** Print CSS of the DAMDFE: the shared page/box rules plus the table and notice classes. */
export function damdfeCss(font: FontKind): string {
  return (
    css(font) +
    `
.me .nome { font-size: 11pt; font-weight: bold; line-height: 1.15; white-space: nowrap }
.me .end { font-size: 8pt; line-height: 1.3; white-space: nowrap }
.me .ids { font-size: 8pt; line-height: 1.3; white-space: nowrap }
.ttl2 { font-size: 9.5pt; line-height: 0.5cm; white-space: nowrap }
.tt { font-size: 10pt; font-weight: bold; line-height: 0.6cm; white-space: nowrap }
.th { font-size: 6.5pt; font-weight: bold; line-height: 0.45cm; padding: 0 0.08cm; white-space: nowrap; overflow: hidden }
.td { padding: 0 0.08cm; white-space: nowrap; overflow: hidden }
.sm { font-size: 6pt; text-transform: uppercase; white-space: nowrap }
.url { font-size: 8pt; line-height: 0.45cm; white-space: nowrap }
.b.nb.rule { height: 0; border-top: 0.5pt dashed #666 }
.b.nb.rule.solid { border-top: 0.5pt solid #000 }
.b.cont { background: #000; color: #fff; font-size: 8pt; line-height: 1.25; padding: 0.1cm 0.15cm }
.b.hom { font-size: 8pt; font-weight: bold; text-align: center; text-transform: uppercase; line-height: 1.2; padding: 0.08cm 0.1cm }
.qr { display: block }
`
  )
}
