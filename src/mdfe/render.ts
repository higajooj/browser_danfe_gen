import { barcodeSvg } from '../barcode/code128c'
import { esc } from '../escape'
import { groupChave, maskCpf, maskDoc, splitDateTime } from '../format'
import type { Box } from '../layout/portrait'
import type { DanfeOptions } from '../options'
import { qrSvg } from '../qrcode/qrcode'
import { box, field, innerWidth, type Ctx } from '../render/dom'
import { enderecoLinhas, safeLogo } from '../render/header'
import { fitPt, wrapText } from '../text'
import type { Mdfe, MdfeDoc, MdfeModal } from './model'
import { damdfeCss } from './styles'

// --- Geometry (cm). The spec gives sample sheets only, so the sheet is laid out from the samples. ---

const L = 0.5
const W = 20.0
const R = L + W
const BOTTOM = 29.0
const QR_SIDE = 2.6
const ROW_H = 0.5
const TT_H = 0.6
const TH_H = 0.45
const OBS_LINE_H = 0.36
const GAP = 0.3
const COL_L: Box = { l: L, t: 0, w: 9.0, h: 0 }
const COL_R: Box = { l: L + 9.4, t: 0, w: 10.6, h: 0 }
const BODY_TOP = 4.8
const CONSULTA_URL = 'https://dfe-portal.svrs.rs.gov.br/mdfe/consulta'
const QR_BASE_URL = 'https://dfe-portal.svrs.rs.gov.br/mdfe/QRCode'

const MODAL_TITLE: Record<string, string> = {
  rodo: 'Modelo Rodoviário de Carga',
  aereo: 'Modelo Aéreo de Carga',
  aquav: 'Modelo Aquaviário de Carga',
  ferrov: 'Modelo Ferroviário de Carga',
}
const MODAL_BY_CODE: Record<string, string> = { '1': 'rodo', '2': 'aereo', '3': 'aquav', '4': 'ferrov' }
const TP_UNID_TRANSP: Record<string, string> = {
  '1': 'Rodoviário Tração',
  '2': 'Rodoviário Reboque',
  '3': 'Navio',
  '4': 'Balsa',
  '5': 'Aeronave',
  '6': 'Vagão',
  '7': 'Outros',
}
const TP_UNID_CARGA: Record<string, string> = { '1': 'Container', '2': 'ULD', '3': 'Pallet', '4': 'Outros' }

const B = (l: number, t: number, w: number, h: number): Box => ({ l, t, w, h })

// --- Small formatters ------------------------------------------------------------------------------

function dateTime(v: string): string {
  const { date, time } = splitDateTime(v)
  return [date, time].filter(Boolean).join(' ')
}

/** Quantity with 2 to 4 decimals (qCarga is TDec_1104); empty stays empty. */
function quantity(v: string): string {
  const n = Number(v)
  if (v.trim() === '' || !Number.isFinite(n)) return v
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
}

/** nProt - dd/mm/aaaa às hh:mm:ss±hh:mm */
function protocolLine(nProt: string, dhRecbto: string): string {
  const { date, time } = splitDateTime(dhRecbto)
  const tz = /(Z|[+-]\d{2}:\d{2})$/.exec(dhRecbto.trim())?.[1] ?? ''
  const when = date ? `${date}${time ? ` às ${time}${tz === 'Z' ? '+00:00' : tz}` : ''}` : ''
  return [nProt, when].filter(Boolean).join(' - ')
}

/** dhEmi + 168 hours (the contingency deadline), as dd/mm/aaaa hh:mm. Wall-clock arithmetic, no time zone. */
function contingencyDeadline(dhEmi: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(dhEmi.trim())
  if (!m) return 'DD/MM/AAAA HH:MM'
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + 7, Number(m[4] ?? 0), Number(m[5] ?? 0)))
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`
}

const unidTranspLabel = (tp: string, id: string) => [TP_UNID_TRANSP[tp] ?? tp, id].filter(Boolean).join(' ')
const unidCargaLabel = (tp: string, id: string) => [TP_UNID_CARGA[tp] ?? tp, id].filter(Boolean).join(' ')

// --- Flow layout -----------------------------------------------------------------------------------

/** A piece of the sheet body that is placed top to bottom and never split. */
interface Atom {
  h: number
  draw: (y: number, ctx: Ctx) => string
  /** Column headers repeated when a row of a table starts a new sheet. */
  lead?: Atom
}

interface Col {
  label: string
  w: number
  align?: 'r'
  bold?: boolean
}

interface Table {
  l: number
  title?: string
  cols: Col[]
  rows: string[][]
}

const tableW = (t: Table) => t.cols.reduce((a, c) => a + c.w, 0)

function drawHeaderRow(t: Table, y: number, ctx: Ctx): string {
  let x = t.l
  let out = ''
  for (const c of t.cols) {
    out += box(B(x, y, c.w, TH_H), `nb th${c.align === 'r' ? ' r' : ''}`, esc(c.label), ctx)
    x += c.w
  }
  return out + box(B(t.l, y + TH_H, tableW(t), 0), 'nb rule solid', '', ctx)
}

function drawRow(t: Table, row: string[], y: number, ctx: Ctx): string {
  let x = t.l
  let out = ''
  t.cols.forEach((c, i) => {
    const value = row[i] ?? ''
    const pt = fitPt(value, c.w - 0.16, 9, 6, c.bold, ctx.font)
    out += box(
      B(x, y, c.w, ROW_H),
      `nb td${c.align === 'r' ? ' r' : ''}${c.bold ? ' bold' : ''}`,
      esc(value),
      ctx,
      `;font-size:${pt}pt;line-height:${ROW_H}cm`,
    )
    x += c.w
  })
  return out + box(B(t.l, y + ROW_H, tableW(t), 0), 'nb rule', '', ctx)
}

/** One section made of one or two tables side by side; rows advance together and flow over sheets. */
function section(all: Table[]): Atom[] {
  const tables = all.filter((t) => t.rows.length > 0)
  if (tables.length === 0) return []
  const n = Math.max(...tables.map((t) => t.rows.length))
  const headers: Atom = {
    h: TH_H,
    draw: (y, ctx) => tables.map((t) => drawHeaderRow(t, y, ctx)).join(''),
  }
  const rowAtom = (i: number, lead?: Atom): Atom => ({
    h: ROW_H,
    lead,
    draw: (y, ctx) => tables.map((t) => (t.rows[i] ? drawRow(t, t.rows[i] as string[], y, ctx) : '')).join(''),
  })
  const head: Atom = {
    h: GAP + TT_H + TH_H + ROW_H,
    draw: (y0, ctx) => {
      const y = y0 + GAP
      return (
        tables
          .map((t) => (t.title ? box(B(t.l, y, tableW(t), TT_H), 'nb tt', esc(t.title), ctx) : ''))
          .join('') +
        headers.draw(y + TT_H, ctx) +
        rowAtom(0).draw(y + TT_H + TH_H, ctx)
      )
    },
  }
  const atoms: Atom[] = [head]
  for (let i = 1; i < n; i++) atoms.push(rowAtom(i, headers))
  return atoms
}

function textSection(title: string, lines: string[]): Atom[] {
  const body = lines.length ? lines : ['']
  const line = (text: string): Atom => ({
    h: OBS_LINE_H,
    draw: (y, c) => box(B(L, y, W, OBS_LINE_H), 'nb td', esc(text), c, `;font-size:8pt;line-height:${OBS_LINE_H}cm`),
  })
  const first = line(body[0] as string)
  const head: Atom = {
    h: GAP + TT_H + 0.1 + OBS_LINE_H,
    draw: (y0, c) => {
      const y = y0 + GAP
      return (
        box(B(L, y, W, TT_H), 'nb tt', esc(title), c) +
        box(B(L, y + TT_H, W, 0), 'nb rule solid', '', c) +
        first.draw(y + TT_H + 0.1, c)
      )
    },
  }
  return [head, ...body.slice(1).map(line)]
}

interface Placed {
  y: number
  atom: Atom
}

/** Greedy top-to-bottom placement; a row that opens a sheet is preceded by its column headers. */
function paginate(atoms: Atom[], firstTop: number): Placed[][] {
  const pages: Placed[][] = [[]]
  let y = firstTop
  for (const atom of atoms) {
    let page = pages[pages.length - 1] as Placed[]
    if (y + atom.h > BOTTOM && page.length > 0) {
      page = []
      pages.push(page)
      y = BODY_TOP
      if (atom.lead) {
        page.push({ y, atom: atom.lead })
        y += atom.lead.h
      }
    }
    page.push({ y, atom })
    y += atom.h
  }
  return pages
}

// --- Sections --------------------------------------------------------------------------------------

function modalSections(m: MdfeModal | null): Atom[] {
  if (!m) return []
  switch (m.kind) {
    case 'rodo': {
      const veic = [...(m.veicTracao ? [m.veicTracao] : []), ...m.veicReboque]
      const vehicles: Table = {
        l: COL_L.l,
        title: 'Veículo',
        cols: [
          { label: 'Placa', w: 3.0, bold: true },
          { label: 'RNTRC', w: 5.9, bold: true },
        ],
        rows: veic.map((v) => [v.placa, v.RNTRC || m.RNTRC]),
      }
      const drivers: Table = {
        l: COL_R.l,
        title: 'Condutor',
        cols: [
          { label: 'CPF', w: 3.0, bold: true },
          { label: 'Nome', w: 7.6, bold: true },
        ],
        rows: m.condutores.map((c) => [maskCpf(c.CPF), c.xNome]),
      }
      const toll: Table = {
        l: L,
        title: 'Vale Pedágio',
        cols: [
          { label: 'Responsável CNPJ/CPF', w: 4.5 },
          { label: 'Fornecedor CNPJ', w: 4.5 },
          { label: 'Nº Comprovante', w: 5.0 },
        ],
        rows: m.valePedagio.map((v) => [maskDoc(v.responsavel), maskDoc(v.CNPJForn), v.nCompra]),
      }
      return [...section([vehicles, drivers]), ...section([toll])]
    }
    case 'aereo':
      return [
        ...section([
          {
            l: COL_L.l,
            title: 'Aeronave',
            cols: [
              { label: 'Marca de Nacionalidade', w: 4.5, bold: true },
              { label: 'Marca de Matrícula', w: 4.4, bold: true },
            ],
            rows: [[m.nac, m.matr]],
          },
          {
            l: COL_R.l,
            title: 'Voo',
            cols: [
              { label: 'Número', w: 5.3, bold: true },
              { label: 'Data', w: 5.3, bold: true },
            ],
            rows: [[m.nVoo, splitDateTime(m.dVoo).date || m.dVoo]],
          },
        ]),
        ...section([
          {
            l: L,
            title: 'Aeródromo',
            cols: [
              { label: 'Embarque', w: 9.9, bold: true },
              { label: 'Destino', w: 10.1, bold: true },
            ],
            rows: [[m.cAerEmb, m.cAerDes]],
          },
        ]),
      ]
    case 'aquav': {
      const terminal = (title: string, l: number, list: { cod: string; nome: string }[]): Table => ({
        l,
        title,
        cols: [
          { label: 'Código', w: 2.4 },
          { label: 'Nome', w: (l === COL_L.l ? COL_L.w : COL_R.w) - 2.4 },
        ],
        rows: list.map((t) => [t.cod, t.nome]),
      })
      const half = (title: string, l: number, w: number, list: { id: string; tipo: string }[]): Table => ({
        l,
        title,
        cols: [
          { label: 'Identificação', w: w / 2 },
          { label: 'Tipo', w: w / 2 },
        ],
        rows: list.map((u) => [u.id, u.tipo]),
      })
      return [
        ...section([
          {
            l: L,
            title: 'Embarcação',
            cols: [{ label: 'Código - Nome', w: W, bold: true }],
            rows: [[[m.cEmbar, m.xEmbar].filter(Boolean).join(' - ')]],
          },
        ]),
        ...section([terminal('Terminal de carregamento', COL_L.l, m.termCarreg), terminal('Terminal de descarregamento', COL_R.l, m.termDescarreg)]),
        ...section([
          half('Unidade de transporte vazia', COL_L.l, COL_L.w, m.transpVazia.map((u) => ({ id: u.id, tipo: TP_UNID_TRANSP[u.tipo] ?? u.tipo }))),
          half('Unidade de carga vazia', COL_R.l, COL_R.w, m.cargaVazia.map((u) => ({ id: u.id, tipo: TP_UNID_CARGA[u.tipo] ?? u.tipo }))),
        ]),
      ]
    }
    case 'ferrov': {
      const wagons = (l: number, rows: string[][], title?: string): Table => ({
        l,
        title,
        cols: [
          { label: 'Série de ident.', w: 2.6 },
          { label: 'Núm. ident.', w: 3.0 },
          { label: 'Seq', w: 1.4 },
          { label: 'Ton. Útil', w: 2.0, align: 'r' },
        ],
        rows,
      })
      const rows = m.vagoes.map((v) => [v.serie, v.nVag, v.nSeq, quantity(v.TU)])
      const cut = Math.ceil(rows.length / 2)
      const left = wagons(COL_L.l, rows.slice(0, cut), 'Informações dos vagões')
      const right = wagons(COL_R.l, rows.slice(cut))
      return [
        ...section([
          {
            l: L,
            title: 'Informações da composição do trem',
            cols: [
              { label: 'Prefixo do trem', w: 4.0, bold: true },
              { label: 'Data e hora', w: 5.0, bold: true },
              { label: 'Origem do trem', w: 4.0, bold: true },
              { label: 'Destino do trem', w: 4.0, bold: true },
              { label: 'Qtd. de vagões carregados', w: 3.0, bold: true },
            ],
            rows: [[m.xPref, dateTime(m.dhTrem), m.xOri, m.xDest, m.qVag]],
          },
        ]),
        ...section([left, right]),
      ]
    }
  }
}

/** "Informações da Composição da Carga": mandatory in contingency, where the document may not be on the server yet. */
function compositionSection(docs: MdfeDoc[]): Atom[] {
  const rows: string[][] = []
  for (const d of docs) {
    const label = `${d.tipo}  ${groupChave(d.chave)}`
    if (d.unidTransp.length === 0) rows.push([label, '', ''])
    d.unidTransp.forEach((u, i) =>
      rows.push([
        i === 0 ? label : '',
        unidTranspLabel(u.tpUnidTransp, u.idUnidTransp),
        u.cargas.map((c) => unidCargaLabel(c.tpUnidCarga, c.idUnidCarga)).join(', '),
      ]),
    )
  }
  return section([
    {
      l: L,
      title: 'Informações da Composição da Carga',
      cols: [
        { label: 'Informações dos documentos fiscais vinculados ao manifesto', w: 10.0 },
        { label: 'Informações da unidade de transporte', w: 5.0 },
        { label: 'Informações da unidade de carga', w: 5.0 },
      ],
      rows,
    },
  ])
}

// --- Sheet header / first-sheet block --------------------------------------------------------------

function qrContent(mdfe: Mdfe): string {
  if (mdfe.qrCod) return mdfe.qrCod
  // Built from the chave only for normal emission; contingency needs the signed parameter from the XML.
  if (mdfe.ide.tpEmis === '2' || mdfe.chave === '') return ''
  return `${QR_BASE_URL}?chMDFe=${mdfe.chave}&tpAmb=${mdfe.ide.tpAmb || '1'}`
}

function renderHeader(mdfe: Mdfe, ctx: Ctx, folha: number, folhas: number): string {
  const logo = safeLogo(ctx.logoDataUri)
  const logoW = logo ? 3.4 : 0
  const textW = W - QR_SIDE - 0.4 - logoW
  const nome = wrapText(mdfe.emit.xNome, textW, 11, true, ctx.font).slice(0, 2)
  const end = enderecoLinhas(mdfe).flatMap((l) => wrapText(l, textW, 8, false, ctx.font))
  const rntrc = mdfe.modal?.kind === 'rodo' ? mdfe.modal.RNTRC : ''
  const ids = [
    `<b>CNPJ/CPF:</b> ${esc(maskDoc(mdfe.emit.doc))}`,
    mdfe.emit.IE ? `<b>IE:</b> ${esc(mdfe.emit.IE)}` : '',
    rntrc ? `<b>RNTRC:</b> ${esc(rntrc)}` : '',
  ]
    .filter(Boolean)
    .join('&nbsp;&nbsp;&nbsp;')
  const qr = qrContent(mdfe)

  const parts: string[] = []
  if (logo) {
    parts.push(
      box(B(L, 0.5, 3.2, 2.3), 'nb', `<img alt="" src="${esc(logo)}" style="max-width:3.2cm;max-height:2.3cm;object-fit:contain">`, ctx),
    )
  }
  parts.push(
    box(
      B(L + logoW, 0.5, textW, 2.4),
      'nb me',
      `<div class="nome">${nome.map(esc).join('<br>')}</div><div class="end">${end.map(esc).join('<br>')}</div><div class="ids">${ids}</div>`,
      ctx,
    ),
  )
  if (qr) parts.push(box(B(R - QR_SIDE, 0.5, QR_SIDE, QR_SIDE), 'nb', qrSvg(qr, { sizeCm: QR_SIDE, label: 'QR Code de consulta do MDF-e' }), ctx))
  parts.push(
    box(
      B(L, 3.05, W - QR_SIDE, 0.5),
      'nb ttl2',
      '<b>DAMDFE</b> - Documento Auxiliar de Manifesto Eletrônico de Documentos Fiscais',
      ctx,
    ),
  )

  const cells: [string, string, number, boolean?][] = [
    ['Modelo', mdfe.ide.mod || '58', 1.7],
    ['Série', mdfe.ide.serie, 1.7],
    ['Número', mdfe.ide.nMDF, 2.8],
    ['FL', `${folha}/${folhas}`, 1.7],
    ['Data e hora de emissão', dateTime(mdfe.ide.dhEmi), 4.6, true],
    ['UF Carreg.', mdfe.ide.UFIni, 2.6, true],
    ['UF Descarreg.', mdfe.ide.UFFim, 2.6, true],
  ]
  let x = L
  for (const [label, value, w, bold] of cells) {
    parts.push(field(B(x, 3.65, w, 0.85), label, value, ctx, { bold: bold === true }))
    x += w
  }
  return parts.join('')
}

function renderSummary(mdfe: Mdfe, ctx: Ctx, opts: DanfeOptions): { html: string; end: number } {
  const kind = mdfe.modal?.kind ?? MODAL_BY_CODE[mdfe.ide.modal] ?? ''
  const parts: string[] = []
  const y0 = BODY_TOP

  parts.push(box(B(COL_L.l, y0, COL_L.w, 0.6), 'nb tt', esc(MODAL_TITLE[kind] ?? 'Modelo de Carga'), ctx, ';font-size:12pt'))

  const showMdfe = kind === 'aquav' || mdfe.tot.qMDFe !== ''
  const weight = mdfe.tot.cUnid === '02' ? 'Peso total (Ton)' : 'Peso total (Kg)'
  const qtyW = 2.0
  const counts: [string, string, number][] = [
    ['Qtd. CT-e', mdfe.tot.qCTe || '0', qtyW],
    ['Qtd. NF-e', mdfe.tot.qNFe || '0', qtyW],
  ]
  if (showMdfe) counts.push(['Qtd. MDF-e Ref.', mdfe.tot.qMDFe || '0', 2.4])
  const used = counts.reduce((a, c) => a + c[2], 0)
  counts.push([weight, quantity(mdfe.tot.qCarga), COL_L.w - used])
  let x = COL_L.l
  for (const [label, value, w] of counts) {
    parts.push(field(B(x, y0 + 0.7, w, 0.85), label, value, ctx, { bold: true }))
    x += w
  }

  parts.push(box(B(COL_R.l, y0, COL_R.w, 0.35), 'nb sm', 'Controle do fisco', ctx))
  parts.push(
    box(
      B(COL_R.l, y0 + 0.4, COL_R.w, 1.8),
      'nb',
      barcodeSvg(mdfe.chave, { widthCm: 9.0, heightCm: 1.8, label: `Chave de acesso ${mdfe.chave}` }),
      ctx,
    ),
  )
  parts.push(
    field(B(COL_R.l, y0 + 2.35, COL_R.w, 0.85), 'Chave de acesso', groupChave(mdfe.chave), ctx, {
      bold: true,
      minPt: ctx.font === 'courier' ? 6.5 : 7,
    }),
  )
  parts.push(
    box(
      B(COL_R.l, y0 + 3.3, COL_R.w, 0.45),
      'nb url',
      `Consulte em <b>${esc(CONSULTA_URL)}</b>`,
      ctx,
    ),
  )

  // Protocol area (left column, below the counts).
  const prot = opts.protocol
    ? { nProt: opts.protocol.nProt, dt: opts.protocol.dateTime }
    : mdfe.prot
      ? { nProt: mdfe.prot.nProt, dt: mdfe.prot.dhRecbto }
      : null
  const contingency = mdfe.ide.tpEmis === '2' && !prot
  let y = y0 + 2.35
  if (contingency) {
    const text = `<b>EMISSÃO EM CONTINGÊNCIA.</b> Obrigatória a autorização em 168 horas após esta emissão (${contingencyDeadline(mdfe.ide.dhEmi)})`
    parts.push(box(B(COL_L.l, y, COL_L.w, 0.35), 'nb sm', 'Protocolo de autorização', ctx))
    parts.push(box(B(COL_L.l, y + 0.4, COL_L.w, 1.2), 'cont', text, ctx))
    y += 1.75
  } else {
    parts.push(
      field(
        B(COL_L.l, y, COL_L.w, 0.85),
        'Protocolo de autorização',
        prot ? protocolLine(prot.nProt, prot.dt) : 'MDF-e sem protocolo de autorização',
        ctx,
        { bold: true },
      ),
    )
    y += 1.0
  }
  if (mdfe.ide.tpAmb === '2') {
    parts.push(box(B(COL_L.l, y, COL_L.w, 0.7), 'hom', 'EMITIDO EM AMBIENTE DE HOMOLOGAÇÃO – SEM VALOR FISCAL', ctx))
    y += 0.85
  }
  return { html: parts.join(''), end: Math.max(y, y0 + 3.75) + GAP }
}

function observationLines(mdfe: Mdfe, ctx: Ctx): string[] {
  const width = innerWidth(W)
  return [mdfe.infAdic.infAdFisco, mdfe.infAdic.infCpl]
    .filter((t) => t.trim() !== '')
    .flatMap((t) => wrapText(t, width, 8, false, ctx.font))
}

export function renderDamdfe(mdfe: Mdfe, opts: DanfeOptions = {}): string {
  const font = opts.fontFamily ?? 'times'
  const ctx: Ctx = { font, dy: 0, logoDataUri: opts.logoDataUri }

  const summary = renderSummary(mdfe, ctx, opts)
  const atoms: Atom[] = [
    ...modalSections(mdfe.modal),
    ...(mdfe.ide.tpEmis === '2' ? compositionSection(mdfe.docs) : []),
    ...textSection('Observações', observationLines(mdfe, ctx)),
  ]
  const pages = paginate(atoms, summary.end)
  const folhas = pages.length
  const watermark = mdfe.ide.tpAmb === '2' ? '<div class="wm">SEM VALOR FISCAL</div>' : ''

  const html = pages
    .map((placed, i) => {
      const body = placed.map((p) => p.atom.draw(p.y, ctx)).join('')
      return `<section class="page">${renderHeader(mdfe, ctx, i + 1, folhas)}${i === 0 ? summary.html : ''}${body}${watermark}</section>`
    })
    .join('\n')

  const docTitle = opts.title ?? `DAMDFE ${mdfe.chave}`
  return (
    `<!DOCTYPE html>\n<html lang="pt-BR"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(docTitle)}</title>` +
    `<style>${damdfeCss(font)}</style></head><body>\n${html}\n</body></html>`
  )
}
