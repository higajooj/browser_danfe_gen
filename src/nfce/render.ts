import { esc } from '../escape'
import { formatMoney, groupChave, maskCep, maskDoc, splitDateTime } from '../format'
import type { Endereco, Nfe } from '../model'
import type { DanfeOptions } from '../options'
import { matrixSvg, qrMatrix } from '../qrcode/qrcode'
import { safeLogo } from '../render/header'
import { fitPt, PT_CM, textWidthCm, wrapText, type FontKind } from '../text'
import { nfceCss } from './styles'

// Manual de Padrões Técnicos do DANFE NFC-e e QR Code 5.1, chapter 3. Lengths in mm.

/** Side margin (3.3: at least 2 mm on each side). */
const MARGIN = 4
const TOP = 3
const BOTTOM = 5
const MIN_PAPER = 56
const MAX_PAPER = 210
const PT_MM = PT_CM * 10
/** Space between two divisions. */
const GAP = 1.6
/** Horizontal room between two item columns. */
const COL_PAD = 1.2
const LOGO = 18
/** QR Code (3.4): at least 22 mm of modules; a module is kept at 0.4 mm or more so thermal printers resolve it. */
const QR_MIN_CONTENT = 22
const QR_MIN_MODULE = 0.4

/** Meios de pagamento (tPag, YA02): Tabela de Meios de Pagamento, IT 2024.002 v1.11. */
const T_PAG: Record<string, string> = {
  '01': 'Dinheiro',
  '02': 'Cheque',
  '03': 'Cartão de Crédito',
  '04': 'Cartão de Débito',
  '05': 'Cartão da Loja (Private Label), Crediário Digital, Outros Crediários',
  '10': 'Vale Alimentação',
  '11': 'Vale Refeição',
  '12': 'Vale Presente',
  '13': 'Vale Combustível',
  '14': 'Duplicata Mercantil',
  '15': 'Boleto Bancário',
  '16': 'Depósito Bancário',
  '17': 'Pagamento Instantâneo (PIX) - Dinâmico',
  '18': 'TED (Transferência Eletrônica Disponível)',
  '19': 'Programa de fidelidade, Cashback, Crédito Virtual',
  '20': 'Pagamento Instantâneo (PIX) - Estático',
  '21': 'Crédito em Loja',
  '22': 'Pagamento Eletrônico não Informado - falha de hardware do sistema emissor',
  '23': 'Pagamento Instantâneo (PIX) - Automático',
  '24': 'TEF - "Book Transfer"',
  '90': 'Sem Pagamento',
  '91': 'Pagamento Posterior',
  '99': 'Outros',
}

const mm = (n: number) => `${Math.round(n * 100) / 100}mm`
const lineH = (pt: number) => Math.round(pt * PT_MM * 1.22 * 100) / 100
const num = (v: string) => (v.trim() === '' ? 0 : Number(v) || 0)

function dateTime(v: string): string {
  const { date, time } = splitDateTime(v)
  return [date, time].filter(Boolean).join(' ')
}

/** pt-BR number with `min`..`max` decimals; anything that is not a number is printed as written. */
function decimal(v: string, min: number, max: number): string {
  const n = Number(v)
  if (v.trim() === '' || !Number.isFinite(n)) return v
  return n.toLocaleString('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: max })
}

function endereco(e: Endereco): string {
  const parts = [e.xLgr, e.nro, e.xCpl, e.xBairro, e.xMun, e.UF].filter(Boolean)
  return [...parts, e.CEP ? `CEP: ${maskCep(e.CEP)}` : ''].filter(Boolean).join(', ')
}

interface TextOpts {
  bold?: boolean
  align?: 'c' | 'r'
  /** Leading words of the first line printed in bold (the whole text is measured as bold). */
  lead?: string
}

/** Lines placed top to bottom. Every line has a fixed height, so the sheet height is known before rendering. */
class Flow {
  readonly parts: string[] = []
  h = 0

  constructor(
    readonly w: number,
    readonly font: FontKind,
  ) {}

  width(text: string, pt: number, bold = false): number {
    return textWidthCm(text, pt, bold, this.font) * 10
  }

  wrap(text: string, pt: number, bold = false, w = this.w): string[] {
    // The epsilon keeps a text measured at exactly `w` (a column sized from it) on one line.
    return wrapText(text, w / 10 + 1e-6, pt, bold, this.font)
  }

  line(html: string, pt: number, cls = ''): void {
    const h = lineH(pt)
    this.parts.push(`<div class="ln${cls ? ` ${cls}` : ''}" style="height:${mm(h)};line-height:${mm(h)};font-size:${pt}pt">${html}</div>`)
    this.h += h
  }

  block(html: string, h: number): void {
    this.parts.push(html)
    this.h += h
  }

  gap(h = GAP): void {
    this.block(`<div style="height:${mm(h)}"></div>`, h)
  }

  /** Runs `fn` after a gap; the gap is dropped when `fn` adds nothing. */
  after(h: number, fn: () => void): void {
    const n = this.parts.length
    const h0 = this.h
    this.gap(h)
    fn()
    if (this.parts.length === n + 1) {
      this.parts.length = n
      this.h = h0
    }
  }

  text(text: string, pt: number, o: TextOpts = {}): void {
    const lines = this.wrap(text, pt, o.bold || !!o.lead)
    const cls = [o.align ?? '', o.bold ? 'bold' : ''].filter(Boolean).join(' ')
    lines.forEach((l, i) => {
      const html =
        i === 0 && o.lead && l.startsWith(o.lead) ? `<b>${esc(o.lead)}</b>${esc(l.slice(o.lead.length))}` : esc(l)
      this.line(html, pt, cls)
    })
  }

  /** Label on the left, value on the right; shrunk by up to 1.5 pt to share a line, then the label wraps beside the value. */
  pair(left: string, right: string, maxPt: number, bold = false): void {
    const fits = (pt: number) => this.width(left, pt, bold) + COL_PAD + this.width(right, pt, bold) <= this.w
    let pt = maxPt
    while (pt > maxPt - 1.5 && !fits(pt)) pt -= 0.5
    if (!fits(pt)) pt = maxPt
    const rw = this.width(right, pt, bold)
    const lefts = this.wrap(left, pt, bold, Math.max(this.w - rw - COL_PAD, this.w * 0.4))
    const cls = `pair${bold ? ' bold' : ''}`
    lefts.forEach((l, i) =>
      this.line(`<span>${esc(l)}</span>${i === 0 ? `<span>${esc(right)}</span>` : ''}`, pt, cls),
    )
  }
}

// --- Divisions ----------------------------------------------------------------------------------

/** Divisão I: CNPJ, razão social, address without the country, and the document name. */
function cabecalho(f: Flow, nfe: Nfe, logoUri: string | undefined): void {
  const logo = safeLogo(logoUri)
  const t = new Flow(logo ? f.w - LOGO - 2 : f.w, f.font)
  const align = logo ? undefined : 'c'
  const pt = 8
  const cnpj = `CNPJ: ${maskDoc(nfe.emit.doc)}`
  const nome = nfe.emit.xNome
  if (t.width(`${cnpj} ${nome}`, pt, true) <= t.w) {
    t.line(`${esc(cnpj)} <b>${esc(nome)}</b>`, pt, align)
  } else {
    t.text(cnpj, pt, { align })
    t.text(nome, pt, { align, bold: true })
  }
  t.text(endereco(nfe.emit.ender), 7.5, { align })
  t.text('Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica', 7.5, { align })
  if (!logo) {
    f.block(t.parts.join(''), t.h)
    return
  }
  const h = Math.max(LOGO, t.h)
  f.block(
    `<div class="hd" style="height:${mm(h)}"><img alt="" src="${esc(logo)}"><div class="hdt">${t.parts.join('')}</div></div>`,
    h,
  )
}

/** "EMITIDA EM CONTINGÊNCIA / Pendente de autorização" between bands of lines, below the header (3.1.8). */
function faixaContingencia(f: Flow): void {
  const t1 = 'EMITIDA EM CONTINGÊNCIA'
  const t2 = 'Pendente de autorização'
  const pt1 = fitPt(t1, (f.w - 6) / 10, 11, 7, true, f.font)
  const pt2 = fitPt(t2, (f.w - 6) / 10, 7.5, 6, true, f.font)
  const h = lineH(pt1) + lineH(pt2) + 1.6
  f.block(
    `<div class="cont" style="height:${mm(h)}"><div style="font-size:${pt1}pt">${t1}</div>` +
      `<div style="font-size:${pt2}pt">${t2}</div></div>`,
    h,
  )
}

interface ItemRow {
  cod: string
  desc: string
  q: string
  un: string
  vu: string
  vt: string
}

/** Divisão II: código, descrição, quantidade, unidade, valor unitário and valor total of each item. */
function itens(f: Flow, nfe: Nfe): void {
  const pt = 7
  const head: ItemRow = { cod: 'Código', desc: 'Descrição', q: 'Qtde', un: 'UN', vu: 'Vl Unit', vt: 'Vl Total' }
  const rows: ItemRow[] = nfe.itens.map((i) => ({
    cod: i.cProd,
    desc: i.xProd,
    q: decimal(i.qCom, 0, 4),
    un: i.uCom,
    vu: decimal(i.vUnCom, 2, 4),
    vt: formatMoney(i.vProd),
  }))
  const colW = (k: keyof ItemRow) =>
    Math.max(...[head, ...rows].map((r) => f.width(r[k], pt, r === head))) + COL_PAD
  const wq = colW('q')
  const wun = colW('un')
  const wvu = colW('vu')
  const wvt = colW('vt')
  const wcod = Math.min(colW('cod'), f.w * 0.22)
  const wdesc = f.w - wcod - wq - wun - wvu - wvt

  if (wdesc >= f.w * 0.3) {
    const cols: [keyof ItemRow, number, boolean][] = [
      ['cod', wcod, false],
      ['desc', wdesc, false],
      ['q', wq, true],
      ['un', wun, false],
      ['vu', wvu, true],
      ['vt', wvt, true],
    ]
    // Each column carries COL_PAD of its width as the space before it (after it, for the first one).
    const draw = (cells: Partial<ItemRow>, cls: string) =>
      f.line(
        cols
          .map(
            ([k, w, right], i) =>
              `<span${right ? ' class="r"' : ''} style="width:${mm(w)};padding-${i === 0 ? 'right' : 'left'}:${mm(COL_PAD)}">${esc(cells[k] ?? '')}</span>`,
          )
          .join(''),
        pt,
        cls,
      )
    draw(head, 'row bold')
    for (const r of rows) {
      const cod = f.wrap(r.cod, pt, false, wcod - COL_PAD)
      const desc = f.wrap(r.desc, pt, false, wdesc - COL_PAD)
      const n = Math.max(cod.length, desc.length, 1)
      for (let j = 0; j < n; j++) {
        draw(j === 0 ? { ...r, cod: cod[0] ?? '', desc: desc[0] ?? '' } : { cod: cod[j] ?? '', desc: desc[j] ?? '' }, 'row')
      }
    }
    return
  }

  // Narrow paper: code and description on their own lines, the values below them.
  f.text('Código Descrição', pt, { bold: true })
  f.pair('Qtde UN x Vl Unit', 'Vl Total', pt, true)
  for (const r of rows) {
    f.text(`${r.cod} ${r.desc}`, pt)
    f.pair(`${r.q} ${r.un} x ${r.vu}`, r.vt, pt)
  }
}

/** Divisão III: totals, payments and change. */
function totais(f: Flow, nfe: Nfe): void {
  const pt = 8
  const t = nfe.total
  f.pair('Qtde. total de itens', String(nfe.itens.length), pt)
  f.pair('Valor total R$', formatMoney(t.vProd), pt)
  const ajustes: [string, string][] = [
    ['Desconto R$', t.vDesc],
    ['Frete R$', t.vFrete],
    ['Seguro R$', t.vSeg],
    ['Outras despesas R$', t.vOutro],
  ]
  let shown = false
  for (const [label, v] of ajustes) {
    if (num(v) === 0) continue
    f.pair(label, formatMoney(v), pt)
    shown = true
  }
  // "Valor a Pagar" only when something changes the sum of the items (3.1.3).
  if (shown || num(t.vNF) !== num(t.vProd)) f.pair('Valor a Pagar R$', formatMoney(t.vNF), pt, true)

  f.gap(0.8)
  f.pair('FORMA PAGAMENTO', 'VALOR PAGO R$', pt)
  for (const p of nfe.pag.detPag) f.pair(p.xPag || T_PAG[p.tPag] || p.tPag, formatMoney(p.vPag), pt)
  if (nfe.pag.vTroco !== '') f.pair('Troco R$', formatMoney(nfe.pag.vTroco), pt)
}

/** Divisão IV: consulta URL (urlChave, ZX03) and the chave in 11 blocks of 4. */
function consultaChave(f: Flow, nfe: Nfe): void {
  f.text('Consulte pela Chave de Acesso em', 7.5, { align: 'c', bold: true })
  if (nfe.supl.urlChave) f.text(nfe.supl.urlChave, 7.5, { align: 'c' })
  const chave = groupChave(nfe.chave)
  const pt = fitPt(chave, f.w / 10, 8, 6, false, f.font)
  if (f.width(chave, pt) <= f.w) {
    f.line(esc(chave), pt, 'c')
    return
  }
  // Narrow paper: 6 + 5 blocks rather than a lone block on the second line.
  const blocks = chave.split(' ')
  const lines = [blocks.slice(0, 6).join(' '), blocks.slice(6).join(' ')]
  const pt2 = fitPt(lines[0] as string, f.w / 10, 8, 6, false, f.font)
  for (const l of lines) f.line(esc(l), pt2, 'c')
}

/** Divisão VI: the consumer, or "CONSUMIDOR NÃO IDENTIFICADO". */
function consumidor(f: Flow, nfe: Nfe): void {
  const pt = 7.5
  const d = nfe.dest
  const e = nfe.entrega
  const doc = d?.doc ?? ''
  const nome = e?.xNome || d?.xNome || ''
  // The delivery address is mandatory for a home delivery (entrega); otherwise the consumer's, when given.
  const end = e ? endereco(e) : d && d.ender.xLgr ? endereco(d.ender) : ''
  if (!doc && !nome && !end) {
    f.text('CONSUMIDOR NÃO IDENTIFICADO', pt, { align: 'c', bold: true })
    return
  }
  const id = !doc
    ? ''
    : /^[0-9A-Z]{14}$/.test(doc)
      ? `CNPJ: ${maskDoc(doc)}`
      : /^\d{11}$/.test(doc)
        ? `CPF: ${maskDoc(doc)}`
        : `Id. Estrangeiro: ${doc}`
  const text = ['CONSUMIDOR', [id, nome, end].filter(Boolean).join(' - ')].filter(Boolean).join(' ')
  f.text(text, pt, { align: 'c', lead: 'CONSUMIDOR' })
}

interface Prot {
  nProt: string
  dt: string
}

/** Divisão VII: número, série, emission date-time and the authorization protocol. */
function identificacao(f: Flow, nfe: Nfe, prot: Prot | null, via: string): void {
  const n = nfe.ide.nNF.replace(/\D/g, '').padStart(9, '0')
  const serie = nfe.ide.serie.replace(/\D/g, '').padStart(3, '0')
  const id = `NFC-e nº ${n} Série ${serie} ${dateTime(nfe.ide.dhEmi)}${via ? ` - ${via}` : ''}`
  f.text(id, 8, { align: 'c', bold: true })
  if (!prot) return
  f.text(`Protocolo de autorização: ${prot.nProt}`, 7.5, { align: 'c', lead: 'Protocolo de autorização:' })
  f.text(`Data de autorização: ${dateTime(prot.dt)}`, 7.5, { align: 'c', lead: 'Data de autorização:' })
}

/** Divisão VIII: contingency notice, infAdFisco, the authorizer's message and the homologação notice. */
function mensagemFiscal(f: Flow, nfe: Nfe, pending: boolean): void {
  const at = f.h
  const sep = () => {
    if (f.h > at) f.gap(0.8)
  }
  if (pending && nfe.ide.tpEmis === '4') {
    f.text('DANFE-NFC-e impresso em contingência - EPEC', fitPt('DANFE-NFC-e impresso em contingência - EPEC', f.w / 10, 10, 7, true, f.font), { align: 'c', bold: true })
    f.text('Regularmente recebido pela administração tributária autorizadora', 7.5, { align: 'c', bold: true })
    if (nfe.ide.dhCont) f.text(`Data entrada contingência: ${dateTime(nfe.ide.dhCont)}`, 7.5, { align: 'c' })
  } else if (pending) {
    f.text('EMITIDA EM CONTINGÊNCIA', fitPt('EMITIDA EM CONTINGÊNCIA', f.w / 10, 11, 7, true, f.font), { align: 'c', bold: true })
    f.text('Pendente de autorização', 8, { align: 'c' })
  }
  if (nfe.infAdic.infAdFisco) {
    sep()
    f.text(nfe.infAdic.infAdFisco, 7, { align: 'c' })
  }
  if (nfe.prot?.xMsg) {
    sep()
    f.text(nfe.prot.xMsg, 7, { align: 'c' })
  }
  if (nfe.ide.tpAmb === '2') {
    sep()
    f.text('EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO – SEM VALOR FISCAL', 7.5, { align: 'c', bold: true })
  }
}

/** Divisão V: QR Code of infNFeSupl/qrCode, centred (Figura 5). */
function qrCode(f: Flow, content: string): void {
  const m = qrMatrix(content)
  const n = m.length
  // Quiet zone: 4 modules, and at least 10 % of the symbol for the larger ones (3.4).
  const quiet = Math.max(4, Math.ceil(n / 18))
  const module = Math.min(Math.max(QR_MIN_CONTENT / n, QR_MIN_MODULE), f.w / (n + quiet * 2))
  const side = Math.round(module * (n + quiet * 2) * 100) / 100
  f.block(
    `<div class="qrw" style="height:${mm(side)}">${matrixSvg(m, { sizeCm: side / 10, quietModules: quiet, label: 'QR Code de consulta da NFC-e' })}</div>`,
    side,
  )
}

/** Divisão IX: Lei 12.741/2012 taxes and infCpl. */
function mensagemContribuinte(f: Flow, nfe: Nfe): void {
  if (num(nfe.total.vTotTrib) > 0) {
    f.text(`Tributos Totais Incidentes (Lei Federal 12.741/2012): R$ ${formatMoney(nfe.total.vTotTrib)}`, 7, { align: 'c' })
  }
  if (nfe.infAdic.infCpl) f.text(nfe.infAdic.infCpl, 7, { align: 'c' })
}

/** DANFE NFC-e (modelo 65) as a continuous receipt. */
export function renderDanfeNfce(nfe: Nfe, opts: DanfeOptions = {}): string {
  const font = opts.fontFamily ?? 'times'
  const o = opts.nfce ?? {}
  const paper = Math.min(MAX_PAPER, Math.max(MIN_PAPER, Number.isFinite(o.paperWidthMm) ? (o.paperWidthMm as number) : 80))
  const f = new Flow(paper - MARGIN * 2, font)

  const prot: Prot | null = opts.protocol
    ? { nProt: opts.protocol.nProt, dt: opts.protocol.dateTime }
    : nfe.prot
      ? { nProt: nfe.prot.nProt, dt: nfe.prot.dhRecbto }
      : null
  // Off-line (9) or EPEC (4) contingency still waiting for its authorization.
  const pending = (nfe.ide.tpEmis === '9' || nfe.ide.tpEmis === '4') && !prot
  const via = pending ? (o.via === 'estabelecimento' ? 'Via estabelecimento' : 'Via consumidor') : ''

  cabecalho(f, nfe, opts.logoDataUri)
  if (pending) {
    f.gap(1)
    faixaContingencia(f)
  }
  f.gap()
  if (!o.resumido && nfe.itens.length > 0) {
    itens(f, nfe)
    f.gap()
  }
  totais(f, nfe)
  f.gap()
  consultaChave(f, nfe)
  f.gap()
  consumidor(f, nfe)
  f.gap(1)
  identificacao(f, nfe, prot, via)
  f.after(GAP, () => mensagemFiscal(f, nfe, pending))
  if (nfe.supl.qrCode) f.after(GAP, () => qrCode(f, nfe.supl.qrCode))
  f.after(GAP, () => mensagemContribuinte(f, nfe))

  const height = Math.ceil((TOP + f.h + BOTTOM) * 10) / 10
  const docTitle = opts.title ?? `DANFE NFC-e ${nfe.chave}`
  return (
    `<!DOCTYPE html>\n<html lang="pt-BR"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(docTitle)}</title>` +
    `<style>${nfceCss(font, paper, height, MARGIN, TOP)}</style></head><body>\n` +
    `<section class="page">${f.parts.join('')}</section>\n</body></html>`
  )
}
