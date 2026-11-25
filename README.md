# browser-danfe-gen

Generate an NF-e **DANFE** (modelo 55), an NFC-e **DANFE NFC-e** (modelo 65), a CT-e **DACTE** (modelo 57 / CT-e Simplificado) or **DACTE OS** (modelo 67), an MDF-e **DAMDFE** (modelo 58),
or a national NFS-e **DANFSe**
as a self-contained HTML string, entirely in the browser. Open the result with the browser's print dialog and you get
a DANFE laid out according to **MOC 7.0 – Anexo II** (Manual de Especificações Técnicas do DANFE e Código de Barras),
a DANFE NFC-e laid out according to the **Manual de Padrões Técnicos do DANFE NFC-e e QR Code 5.1**, a DACTE / DACTE OS
laid out according to **MOC CT-e 4.00 – Anexo II** (Manual de Especificações Técnicas do DACTE), or a DAMDFE laid
out according to **MOC MDF-e 3.00b – Anexo II** (Manual de Especificações Técnicas do DAMDFE). The national
DANFSe uses the v2.0 layout from **SE/CGNFS-e Nota Técnica 008 v1.02**.

```ts
import { generateDanfeHtml, printDanfe } from 'browser-danfe-gen'

const html = generateDanfeHtml(xmlString)   // NF-e, NFC-e, CT-e / CT-e OS, MDF-e and national NFS-e
                                            // full <html> document, inline CSS + inline SVG barcode / QR Code
printDanfe(html)                            // hidden iframe + window.print()
// or: iframe.srcdoc = html / window.open + document.write / Blob URL
```

* Input: `<nfeProc>` (authorized, with `protNFe`) or a bare `<NFe>` for the DANFE and the DANFE NFC-e (told apart
  by `ide/mod`: 65 is an NFC-e); `<cteProc>` / `<CTe>`, `<cteOSProc>` / `<CTeOS>` or `<cteSimpProc>` / `<CTeSimp>` for
  the DACTE and DACTE OS; `<mdfeProc>` (with `protMDFe`) or a bare `<MDFe>` for the DAMDFE;
  national `<NFSe>` with an embedded `DPS` for the DANFSe. The document
  type is detected from the root element; anything else throws `DanfeError`. `generateDanfeNfceHtml`,
  `generateDacteHtml`, `generateDamdfeHtml`, `generateDanfseHtml`, `parseCte`, `parseMdfe` and `parseNfse` are also exported.
* Output: one `<section class="page">` per A4 sheet for the DANFE, DACTE, DAMDFE and DANFSe, or a single receipt sheet
  as tall as its content for the DANFE NFC-e. The HTML has no scripts or external requests.
  The `<title>` contains the document name and access key, which browsers use as the
  default PDF file name.
* Requires a `DOMParser` (any browser; under Node/Bun use `happy-dom` or similar).

### Options

| option         | meaning                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------- |
| `logoDataUri`  | `data:image/…` logo shown in the emitente frame                                          |
| `fontFamily`   | `'times'` (default) or `'courier'` – the two families allowed by 3.7                     |
| `title`        | document title                                                                           |
| `protocol`     | `{ nProt, dateTime }` printed when the XML has no `protNFe` / `protCTe` / `protMDFe` (e.g. EPEC, 3.9.3) |
| `cte.canhoto`       | Print the DACTE / DACTE OS receipt stub on sheet 1 (default true) |
| `nfce.paperWidthMm` | DANFE NFC-e paper roll width, 56–210 mm (default 80)                                |
| `nfce.resumido`     | DANFE NFC-e resumido (ecológico): no item detail                                    |
| `nfce.via`          | `'consumidor'` (default) or `'estabelecimento'`: the copy of a pending contingency NFC-e |
| `nfse.canhoto`      | Include the optional DANFSe receipt (default false) |
| `nfse.situacao`     | `'cancelada'` or `'substituida'`, from the caller's NFS-e event data, to print the corresponding watermark |

### Printing

Paper A4, margins **None**, scale **100 %**, headers/footers off, background graphics on. The layout is
absolutely positioned in centimetres, so any scaling ("fit to page") changes the printed sizes. The DANFE NFC-e
declares its own paper size (roll width x content height); print it on the roll at 100 %.

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
use of the back of the sheet.

## DANFE NFC-e (NFC-e, modelo 65)

Implemented from the Manual de Padrões Técnicos do DANFE NFC-e e QR Code 5.1 (chapter 3) and the Manual de
Contingência NFC-e (Anexo IV), as one continuous receipt for a paper roll (default 80 mm, 4 mm side margins):

* I – CNPJ, razão social, address without the country and "Documento Auxiliar da Nota Fiscal de Consumidor
  Eletrônica", with the optional logo on the left.
* II – Código, descrição, qtde, UN, valor unitário and valor total of every item, in columns; on narrow paper
  (where the description column would be under 30 % of the width) the values go on a line below the description.
  Left out with `nfce.resumido`.
* III – Qtde. total de itens, valor total, desconto / frete / seguro / outras despesas when not zero, "Valor a
  Pagar" (only when it differs from the items), each payment (description from `xPag` or the Tabela de Meios de
  Pagamento, IT 2024.002 v1.11) and the troco.
* IV – "Consulte pela Chave de Acesso em" + `urlChave` + the chave in 11 blocks of 4.
* VI / VII – consumer (CPF, CNPJ or Id. Estrangeiro, name and the `entrega` delivery address with its recipient,
  or the consumer's own address) or "CONSUMIDOR NÃO IDENTIFICADO"; NFC-e nº, série, emission date-time; protocol and authorization
  date-time, shifted to the UTC offset of the emission (the emitter's local time) when the authorizer answers in
  another one.
* VIII – contingency notice, `infAdFisco`, the `xMsg` returned with the authorization (e.g. a UF's lottery
  message) and, in homologação, "EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO – SEM VALOR FISCAL".
* V – QR Code of `infNFeSupl/qrCode` (EC level M, UTF-8), centred (Figura 5): at least 22 mm of modules, a
  module of at least 0.4 mm, a quiet zone of 4 modules (10 % for large symbols).
* IX – "Tributos Totais Incidentes (Lei Federal 12.741/2012)" when `vTotTrib` is above zero, and `infCpl`.
* Contingência off-line (`tpEmis=9`) or EPEC (`tpEmis=4`) without a protocol: "EMITIDA EM CONTINGÊNCIA /
  Pendente de autorização" between bands under the header and again below the identification (the EPEC text for
  EPEC; `dhCont` and `xJust` are not printed, Anexo IV 3), and "Via consumidor" / "Via estabelecimento" beside
  the emission date-time.

Choices where the manual leaves room: the QR Code is always centred, which works on every paper width; once a
contingency NFC-e has a protocol (in the XML or `options.protocol`) it is printed like a normal one, as for the
DAMDFE. The QR Code needs the CSC (version 2) or the emitter's signature (version 3 off-line), so it is never
built here: an XML without `infNFeSupl/qrCode` is printed without one. A `|` in `infCpl`, `infAdFisco` or
`xMsg` is a line break.

## DACTE and DACTE OS (CT-e modelo 57 / Simplificado, CT-e OS modelo 67)

Implemented from **MOC CT-e 4.00 – Anexo II** (Manual de Especificações Técnicas do DACTE), A4 portrait:

* Canhoto on the first sheet (standard receipt stub, or the ANAC / Código Brasileiro de Aeronáutica stub for the aéreo
  modal; optional via `cte.canhoto`).
* Header repeated on every sheet (2.12): emitente (optional logo, address, CNPJ/CPF, IE), tipo do CT-e / serviço,
  indicador e informação do CT-e globalizado, CFOP – natureza da operação, DACTE / DACTE OS title, modal, `FOLHA n/N`,
  modelo / série / número / emissão / SUFRAMA, CODE-128C barcode of the chave (9 cm × 1.5 cm, module 0.03 cm, 2.17),
  chave in 11 blocks of 4, QR Code of `qrCodCTe` (2.8 cm ≥ 2.5 cm minimum, EC level M, UTF-8, 2.18), and variable
  campos 1/2 (normal, EPEC, or FS-DA with the 36-character "Dados do CT-e" barcode and numeric blocks, 2.19).
* Parties: remetente, destinatário, conditional expedidor/recebedor (2.7: omitted when absent; tomador takes the empty
  slot when only one is present) and tomador do serviço (resolved from `toma3` or `toma4`).
* Carga (with TON → KG conversion per section 3), componentes do valor da prestação, ICMS (all groups: `ICMS00`,
  `ICMS20`, `ICMS45`, `ICMS60`, `ICMS90`, `ICMSOutraUF`, `ICMSSN`, plus DIFAL and `infTribFed` for CT-e OS), documentos
  originários (`infNFe`, `infNF`, `infOutros`, `infDCe`), documentos de transporte anterior, casos específicos (veículos
  novos, artigos perigosos, container aquaviário), fluxo da carga, observações gerais, all six modal-specific blocks
  (rodoviário, aéreo, aquaviário, ferroviário, dutoviário, multimodal) plus `rodoOS` and viagem insurance for CT-e OS,
  and Uso Exclusivo do Emissor / Reservado ao Fisco.
* Multi-page flow: long lists of documentos originários and observações flow across continuation sheets with repeated
  headers and column headings. Homologação (`tpAmb=2`): MOC 2.20 notice and "SEM VALOR FISCAL" watermark.

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

## DANFSe (NFS-e Padrão Nacional)

The DANFSe prints on a single A4 portrait sheet with the national logo and the access key in one block.
The QR code encodes the public consultation URL specified by NT 008. The renderer includes the service,
parties, ISSQN, federal withholdings, IBS/CBS, totals and complementary information. It uses the
official Anexo A municipality table for city names and UFs and the DANFSe fonts with system fallbacks.
Long descriptions use an ellipsis where space runs out. Use the browser's print dialog to save as PDF.

Pass the issued national `NFSe` XML, whose namespace is `http://www.sped.fazenda.gov.br/nfse`.
Rendering uses the XML and optional event status supplied by the caller. XML signatures and fiscal
status are outside the renderer's validation scope. The DANFSe uses its own logo and font settings.

The federal tax block follows NT 008 v1.02 §2.4.5. Only retention code `1` moves PIS and COFINS
into the retained social contributions total. For ISSQN deductions, NT 008 uses the declared deduction
or the legacy calculation with reimbursements. When NT 009 ISSQN adjustment fields are present,
the total uses those ISSQN-specific values.

[NT 008 v1.02, Anexo I](https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/rtc/nt-008-se-cgnfse-danfse-20260714-v1-02.pdf) · [Production XML and domain tables](https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual)

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
bun scripts/verify.ts test/fixtures/CTE_RODO.xml [--items 120] [--infcpl 60]         # DACTE
bun scripts/verify.ts test/fixtures/MDFE_RODO_CONT.xml [--items 120] [--infcpl 60]   # DAMDFE
bun scripts/verify.ts test/fixtures/NFCE.xml [--items 120] [--width 58] [--resumido]  # DANFE NFC-e
bun scripts/verify.ts test/fixtures/NFSE.xml
```

`scripts/verify.ts` needs Chrome, `pdfinfo`/`pdftoppm` (poppler) and `zbarimg`. It renders the HTML in headless
Chrome and checks that every box lands where the spec table says, that no text is clipped or overflowing, that the
PDF is A4 with the expected number of sheets, and that the printed barcode (and, for a DAMDFE, the QR Code)
decodes back to the chave (to `qrCodMDFe`). For a DANFE NFC-e it checks that the receipt is one sheet with nothing
clipped and that the QR Code decodes back to `qrCode`. For a DANFSe it checks the single A4 sheet and
decodes the QR Code to the public consultation URL.
