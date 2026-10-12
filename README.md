# browser-danfe-gen

Generate an NF-e **DANFE** (modelo 55) or an MDF-e **DAMDFE** (modelo 58) as a self-contained HTML string,
entirely in the browser. Open the result with the browser's print dialog and you get a DANFE laid out according to
**MOC 7.0 – Anexo II** (Manual de Especificações Técnicas do DANFE e Código de Barras), or a DAMDFE laid out
according to **MOC MDF-e 3.00b – Anexo II** (Manual de Especificações Técnicas do DAMDFE).

```ts
import { generateDanfeHtml, printDanfe } from 'browser-danfe-gen'

const html = generateDanfeHtml(xmlString)   // NF-e -> DANFE, MDF-e -> DAMDFE; full <html> document,
                                            // inline CSS + inline SVG barcode (and QR Code for the DAMDFE)
printDanfe(html)                            // hidden iframe + window.print()
// or: iframe.srcdoc = html / window.open + document.write / Blob URL
```

* Input: `<nfeProc>` (authorized, with `protNFe`) or a bare `<NFe>` for the DANFE; `<mdfeProc>` (with `protMDFe`)
  or a bare `<MDFe>` for the DAMDFE. The document type is detected from the root element; anything else throws
  `DanfeError`. `generateDamdfeHtml` / `parseMdfe` are also exported for callers that want to be explicit.
* Output: one `<section class="page">` per A4 sheet (`@page { size: 21cm 29.7cm; margin: 0 }`), no scripts and no
  external requests. The `<title>` is `DANFE <chave>` / `DAMDFE <chave>`, which browsers use as the default PDF
  file name.
* Requires a `DOMParser` (any browser; under Node/Bun use `happy-dom` or similar).

### Options

| option         | meaning                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------- |
| `logoDataUri`  | `data:image/…` logo shown in the emitente frame                                          |
| `fontFamily`   | `'times'` (default) or `'courier'` – the two families allowed by 3.7                     |
| `title`        | document title                                                                           |
| `protocol`     | `{ nProt, dateTime }` printed when the XML has no `protNFe` / `protMDFe` (e.g. EPEC, 3.9.3) |

### Printing

Paper A4, margins **None**, scale **100 %**, headers/footers off, background graphics on. The layout is
absolutely positioned in centimetres, so any scaling ("fit to page") changes the printed sizes.

## What is implemented (v1: A4 portrait, folhas soltas – Anexo III.02)

* Canhoto, identification block, DANFE box, CODE-128C barcode of the chave (own encoder, checked against the
  worked example of chapter 2; a chave with an alphanumeric CNPJ switches to the set A for the letters, as NT
  conjunta DFe 2025.001 asks), chave in 11 blocks of 4, natureza, IE/IEST/CNPJ, destinatário, fatura/duplicatas,
  cálculo do imposto, transportador/volumes, dados dos produtos, ISSQN, dados adicionais, reservado ao fisco.
  Boxes use the sizes and positions of table 3.8.1 (laser columns).
* Multiple sheets (3.5): identification block repeated with `FOLHA n/N`, item table continued with the same
  columns, informações complementares continued ("CONTINUA NA PRÓXIMA FOLHA").
* Campo 1/2 by emission type (3.9): normal/SVC, FS/FS-DA (second barcode "Dados da NF-e", 36 digits), EPEC.
* Homologação (`tpAmb=2`): "SEM VALOR FISCAL" watermark and notice.
* `vICMSDeson`, FCP totals and duplicatas that do not fit their frame are printed in Informações Complementares.

Not implemented yet: landscape (III.04), DANFE Simplificado / Etiqueta, retirada/entrega boxes (NT 2018.005),
use of the back of the sheet, NFC-e (modelo 65 has its own DANFE).

## DAMDFE (MDF-e, modelo 58)

Implemented from MOC MDF-e 3.00b – Anexo II, A4 portrait:

* Header on every sheet: emitente (logo, address, CNPJ/CPF, IE, RNTRC for the rodoviário modal), QR Code of
  `qrCodMDFe` (EC level M, UTF-8, own encoder, 2.6 cm including the quiet zone), modelo / série / número /
  `FL n/N` / emissão / UF carregamento / UF descarregamento.
* First sheet: modal title, Qtd. CT-e / NF-e (/ MDF-e Ref.), peso total, CODE-128C barcode of the chave
  ("Controle do fisco", 9 cm x 1.8 cm, module 0.03 cm), chave, protocol, consulta URL.
* Modal blocks: rodoviário (veículos, condutores, vale pedágio), aéreo (aeronave, voo, aeródromo), aquaviário
  (embarcação, terminais, unidades vazias), ferroviário (composição do trem, vagões).
* Contingência (`tpEmis=2`): "EMISSÃO EM CONTINGÊNCIA" box with the 168 h deadline in the protocol area and the
  "Informações da Composição da Carga" table with the chaves of the aggregated CT-e / NF-e / MDF-e and their
  transport and load units. Homologação (`tpAmb=2`): notice and "SEM VALOR FISCAL" watermark.
* Observações (`infAdFisco`, `infCpl`). Long lists continue on further sheets with the column headers repeated.

Choices where the spec only shows sample sheets (no geometry table): the layout is designed from those samples,
sections flow top to bottom (side by side in pairs, as in the samples) and every row is a single clipped line.
The aggregated documents are listed only in contingência, as in the samples. When the XML has no `qrCodMDFe` the
QR URL is built from the chave and `tpAmb` for normal emission; in contingência it needs the signed parameter
from the XML, so it is omitted.

## Deliberate choices where the spec leaves room

* Field values are 10 pt (3.7.9) and shrink to a floor of 7 pt (the 17 CPP equivalent) when they do not fit
  a frame; labels shrink to 5 pt only if they would be clipped.
* In the DANFE box "Nº" is set smaller than the number so `Nº 000.000.000` fits the 2.54 cm frame at 10 pt.
* The 12.10 cm "identificação e assinatura" box is clamped to 12.00 cm so it does not overlap the NF-e box.
* Product columns: the optional desconto / ICMS ST columns are omitted (allowed by 3.1.7); their totals stay
  in the imposto block. `infAdProd` is printed under its item; items that span several lines get a dashed divider.
* `|` inside `infCpl`/`infAdProd` is treated as a line break (common ERP convention).
* Pagination is computed without touching the DOM: text is pre-wrapped with conservative width estimates and
  every line is rendered with `white-space: nowrap`, so the number of sheets is known before rendering.

## Development

```sh
bun install
bun run test        # unit tests (Vitest + happy-dom)
bun run typecheck
bun run build       # vite lib build (ESM) + d.ts
bun run dev         # playground: pick an XML, preview, print
bun scripts/verify.ts test/fixtures/HR_ACO.xml [--items 120] [--infcpl 60]
bun scripts/verify.ts test/fixtures/MDFE_RODO_CONT.xml [--items 120] [--infcpl 60]   # DAMDFE
```

`scripts/verify.ts` needs Chrome, `pdfinfo`/`pdftoppm` (poppler) and `zbarimg`. It renders the HTML in headless
Chrome and checks that every box lands where the spec table says, that no text is clipped or overflowing, that the
PDF is A4 with the expected number of sheets, and that the printed barcode (and, for a DAMDFE, the QR Code)
decodes back to the chave (to `qrCodMDFe`).
