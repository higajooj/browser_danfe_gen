export const danfseCss = `
@page { size: A4 portrait; margin: 0 }
* { box-sizing: border-box }
body {
  margin: 0; color: #000; background: #eee;
  font: 7pt/1.14 "Microsoft Sans Serif", Arial, sans-serif;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.page {
  display: flex; flex-direction: column; position: relative;
  width: 20.64cm; height: 29.34cm; margin: 0.18cm auto; padding: 0.09cm;
  background: #fff; border: 1pt solid #000;
}
header {
  display: grid; grid-template-columns: 1fr 2fr 1fr; align-items: center;
  min-height: 1.16cm; background: #f2f2f2; padding: 0 0.16cm;
}
header img { width: 4cm; height: auto; display: block }
h1 { text-align: center; font: bold 9pt/1.15 Arial, sans-serif; margin: 0 }
.notice { color: #f00; display: block }
.environment { font-size: 6pt }
.municipio {
  font-size: 8pt; overflow-wrap: anywhere; overflow: hidden;
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2;
}
.identification {
  display: grid; grid-template-columns: 3fr 1fr; min-height: 2.84cm;
  border-top: 0.5pt solid #000;
}
.identification-fields { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) }
.identification .label { font-size: 7pt; text-transform: uppercase }
.consulta { align-self: start; text-align: center; margin: 0.025cm 0.14cm 0; font-size: 6pt }
.consulta svg { display: block; margin: 0 auto; position: relative; left: 0.13cm }
section.block, .receipt { border-top: 0.5pt solid #000 }
.row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); min-height: 0.64cm }
.field, .block-title { padding: 0.055cm 0.16cm; min-width: 0 }
[data-span="2"] { grid-column: span 2 }
[data-span="3"] { grid-column: span 3 }
.label { font: bold 6pt/1.1 Arial, sans-serif }
.value { white-space: nowrap; overflow: hidden; text-overflow: ellipsis }
.block-title {
  margin: 0; font: bold 7pt/1.1 Arial, sans-serif; text-transform: uppercase;
}
.block-title, .highlight { background: #f2f2f2 }
.compact { min-height: 0.32cm }
.service-code { padding: 0.03cm 0.16cm }
.service-description { padding: 0.055cm 0.16cm; min-height: 2.55cm }
.long-text {
  white-space: pre-line; overflow-wrap: anywhere; overflow: hidden;
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 8;
}
.complement { flex: 1; min-height: 0; display: flex; flex-direction: column }
.complement .field { padding-top: 0.12cm }
.complement-text { -webkit-line-clamp: 10 }
.approx { margin-top: 0.12cm }
.receipt { flex: none; border: 0.5pt solid #000 }
.receipt .field + .field { border-left: 0.5pt solid #000 }
.watermark {
  position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none;
  font: 50pt Arial, sans-serif; color: #a6a6a6;
}
.watermark span { transform: rotate(-40deg) }
@media print { body { background: #fff } .page { margin: 0.18cm auto 0 } }
`
