import { barcodeSvg } from '../barcode/code128c'
import { esc } from '../escape'
import {
  formatBRL,
  formatDecimal,
  formatMoney,
  formatNumero,
  formatSerie,
  groupChave,
  maskCep,
  maskDoc,
  maskFone,
  splitDateTime,
} from '../format'
import { contingencyData, ufCode } from '../key'
import type { Box } from '../layout/portrait'
import type { DanfeOptions } from '../options'
import { qrSvg } from '../qrcode/qrcode'
import { box, cm, field, innerWidth, type Ctx } from '../render/dom'
import { enderecoLinhas, safeLogo } from '../render/header'
import { fitPt, PT_CM, textWidthCm, wrapText, type FontKind } from '../text'
import type { Cte, CteDocOriginario, CteParte, CteQuantidade } from './model'
import { dacteCss } from './styles'

// --- Page geometry (cm, A4 portrait) ---------------------------------------------------------------

const L = 0.5
const W = 20.0
const TOP = 0.5
const BOTTOM = 29.1
const ST_H = 0.38
const TH_H = 0.36
const DOC_ROW_H = 0.36
const OBS_LINE_H = 0.32
const HDR_H = 5.5
const QR_BASE_URL = 'https://dfe-portal.svrs.rs.gov.br/cte/QRCode'

const B = (l: number, t: number, w: number, h: number): Box => ({ l, t, w, h })

// --- Official MOC CT-e 4.00 domain tables ----------------------------------------------------------

const MODAL_NAME: Record<string, string> = {
  '01': 'RODOVIÁRIO',
  '02': 'AÉREO',
  '03': 'AQUAVIÁRIO',
  '04': 'FERROVIÁRIO',
  '05': 'DUTOVIÁRIO',
  '06': 'MULTIMODAL',
}

const TP_CTE: Record<string, string> = {
  '0': '0 - Normal',
  '1': '1 - Complemento de Valores',
  '2': '2 - Anulação',
  '3': '3 - Substituição',
  '5': '5 - CT-e Simplificado',
  '6': '6 - Substituição CT-e Simplificado',
}

const TP_SERV: Record<string, string> = {
  '0': '0 - Normal',
  '1': '1 - Subcontratação',
  '2': '2 - Redespacho',
  '3': '3 - Redespacho Intermediário',
  '4': '4 - Serviço Vinculado a Multimodal',
  '6': '6 - Transporte de Pessoas',
  '7': '7 - Transporte de Valores',
  '8': '8 - Excesso de Bagagem',
}

const CST_LABEL: Record<string, string> = {
  '00': '00 - Tributação normal ICMS',
  '20': '20 - Tributação com BC reduzida',
  '40': '40 - ICMS isenção',
  '41': '41 - ICMS não tributada',
  '51': '51 - ICMS diferido',
  '60': '60 - ICMS cobrado por ST',
  '90': '90 - ICMS Outros',
}

const TP_DOC_OUTROS: Record<string, string> = {
  '00': 'Declaração',
  '10': 'Dutoviário',
  '59': 'CF-e SAT',
  '65': 'NFC-e',
  '99': 'Outros',
}

const TP_DOC_ANT_PAP: Record<string, string> = {
  '07': 'ATRE',
  '08': 'DTA',
  '09': 'AWB',
  '10': 'CRT',
  '11': 'Conh. Avulso',
  '12': 'TIF',
  '13': 'BL',
}

const TP_TRAF: Record<string, string> = {
  '0': '0 - Próprio',
  '1': '1 - Mútuo',
  '2': '2 - Rodoferroviário',
  '3': '3 - Rodoviário',
}

const FERRO_RESP: Record<string, string> = {
  '1': '1 - Ferrovia de origem',
  '2': '2 - Ferrovia de destino',
}

const RESP_SEG_OS: Record<string, string> = {
  '4': '4 - Emitente do CT-e',
  '5': '5 - Tomador de Serviço',
}

const CLASSE_AEREO: Record<string, string> = {
  M: 'M - Tarifa Mínima',
  G: 'G - Tarifa Geral',
  E: 'E - Tarifa Específica',
}

const UNI_AP: Record<string, string> = {
  '1': 'KG',
  '2': 'KG G',
  '3': 'LITROS',
  '4': 'TI',
  '5': 'UNIDADES',
}

const INF_MANU: Record<string, string> = {
  '01': '01 - Animal vivo',
  '02': '02 - Artigo perigoso (DGD anexa)',
  '03': '03 - Somente aeronave cargueira',
  '04': '04 - Artigo perigoso (DGD não req.)',
  '05': '05 - Artigo perigoso qtd. isenta',
  '06': '06 - Gelo seco',
  '07': '07 - Não restrito',
  '08': '08 - Artigo perigoso consolidado',
  '09': '09 - Autorização governamental anexa',
  '10': '10 - Baterias íon lítio PI965 CAO',
  '11': '11 - Baterias íon lítio PI966',
  '12': '12 - Baterias íon lítio PI967',
  '13': '13 - Baterias metal lítio PI968 CAO',
  '14': '14 - Baterias metal lítio PI969',
  '15': '15 - Baterias metal lítio PI970',
  '99': '99 - Outro',
}

// --- Small formatters ------------------------------------------------------------------------------

function dateTime(v: string): string {
  const { date, time } = splitDateTime(v)
  return [date, time].filter(Boolean).join(' ')
}

function qty(v: number | string, decimals = 3): string {
  const n = typeof v === 'number' ? v : Number(v)
  if ((typeof v === 'string' && v.trim() === '') || !Number.isFinite(n)) return String(v)
  return n.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: 4 })
}

function icmsClassificacao(cte: Cte): string {
  const { kind, CST } = cte.imp.icms
  if (kind === 'ICMSSN') return `${CST || '90'} - Simples Nacional`
  if (kind === 'ICMSOutraUF') return `${CST || '90'} - ICMS Outra UF`
  return CST_LABEL[CST] ?? CST
}

function partyAddress(p: CteParte): string {
  const e = p.ender
  const base = [e.xLgr, e.nro].filter(Boolean).join(', ') + (e.xCpl ? ` - ${e.xCpl}` : '')
  return [base, e.xBairro].filter(Boolean).join(' - ')
}

function qrContent(cte: Cte): string {
  if (cte.qrCod) return cte.qrCod
  // Contingency QR codes (FS-DA=5, EPEC=4) require the RSA signature (&sign=), so only build for normal/SVC.
  if (cte.ide.tpEmis === '4' || cte.ide.tpEmis === '5' || cte.chave === '') return ''
  return `${QR_BASE_URL}?chCTe=${cte.chave}&tpAmb=${cte.ide.tpAmb || '1'}`
}

/** 36-character additional barcode for FS-DA contingency (MOC 2.19.2). */
function contingencyBarcodeData(cte: Cte): string {
  const ref = cte.dest ?? cte.rem ?? cte.toma
  const uf = ref?.ender.UF ?? ''
  const foreign = !ref || uf === 'EX' || !ufCode(uf)
  const day = Number(splitDateTime(cte.ide.dhEmi).date.slice(0, 2)) || 1
  return contingencyData({
    cUF: foreign ? '99' : (ufCode(uf) as string),
    tpEmis: cte.ide.tpEmis,
    doc: foreign ? '' : ref.doc,
    vNF: cte.vPrest.vTPrest || '0',
    icmsProprio: cte.imp.icms.icmsProprio,
    icmsST: cte.imp.icms.icmsST,
    day,
  })
}

function checkMark(checked: boolean, label: string): string {
  return `<span><span class="sq">${checked ? 'X' : '&nbsp;'}</span>${esc(label)}</span>`
}

/** Single-line key-value cell that fits inside `b` without clipping. */
function kv(
  b: Box,
  label: string,
  value: string,
  ctx: Ctx,
  opts: { bold?: boolean; maxPt?: number; minPt?: number } = {},
): string {
  const maxPt = opts.maxPt ?? 7.5
  const minPt = opts.minPt ?? 5
  const labelW = textWidthCm(label.toUpperCase() + ' ', 5.5, false, ctx.font) + 0.1
  const avail = Math.max(0.4, b.w - 0.16 - labelW)
  const pt = fitPt(value, avail, maxPt, minPt, opts.bold, ctx.font)
  return box(
    b,
    'nb ct-kv',
    `<span class="k">${esc(label)}</span><span class="val${opts.bold ? ' bold' : ''}" style="font-size:${pt}pt;line-height:${cm(b.h)}">${esc(value)}</span>`,
    ctx,
  )
}

function sectionBar(y: number, label: string, ctx: Ctx): string {
  const pt = fitPt(label.toUpperCase(), W - 0.2, 6, 5, true, ctx.font)
  return box(B(L, y, W, ST_H), 'st', esc(label), ctx, pt < 6 ? `;font-size:${pt}pt` : '')
}

// --- Canhoto (Page 1 receipt stub, MOC 2.10 / 2.21.5) ----------------------------------------------

function renderCanhoto(cte: Cte, ctx: Ctx): { html: string; nextY: number } {
  const isOS = cte.kind === 'cteOS'
  const isAereo = !isOS && cte.ide.modal === '02'
  const y0 = TOP

  if (isAereo) {
    const h = 2.34
    const decl =
      'DECLARO QUE RECEBI OS VOLUMES DESTE CONHECIMENTO EM PERFEITO ESTADO PELO QUE DOU POR CUMPRIDO O PRESENTE CONTRATO DE TRANSPORTE'
    const legal1 =
      'O transporte coberto por este conhecimento de transporte rege-se pelo Código Brasileiro de Aeronáutica - Lei nº 7.565, de 19/12/1986 - e pelas regulamentações da ANAC, de cujo teor o expedidor/remetente declara ter pleno conhecimento.'
    const legal2 =
      'O expedidor/remetente aceita como corretas todas as especificações contidas neste documento, certificando que a carga, incluindo artigos perigosos, foi devidamente declarada e acondicionada para o transporte aéreo.'
    const dPt = fitPt(decl, W - 0.2, 6, 4.5, true, ctx.font)
    const l1Pt = fitPt(legal1, W - 0.2, 5, 4, false, ctx.font)
    const l2Pt = fitPt(legal2, W - 0.2, 5, 4, false, ctx.font)
    const nOCA = cte.modal?.kind === 'aereo' ? cte.modal.nOCA : ''
    const parts = [
      box(
        B(L, y0, W, 0.72),
        '',
        `<div class="ct-canh-hdr" style="font-size:${dPt}pt;line-height:0.30cm">${esc(decl)}</div>` +
          `<div class="c" style="font-size:${l1Pt}pt;line-height:0.20cm;white-space:nowrap">${esc(legal1)}</div>` +
          `<div class="c" style="font-size:${l2Pt}pt;line-height:0.20cm;white-space:nowrap">${esc(legal2)}</div>`,
        ctx,
      ),
      box(B(L, y0 + 0.72, 4.6, 0.5), '', '<div class="l bold" style="padding-top:0.14cm">EXPEDIDOR / REMETENTE</div>', ctx),
      field(B(L + 4.6, y0 + 0.72, 7.7, 0.5), 'Nome', '', ctx, { maxPt: 7.5 }),
      field(B(L + 12.3, y0 + 0.72, 7.7, 0.5), 'Assinatura', '', ctx, { maxPt: 7.5 }),
      box(B(L, y0 + 1.22, 4.6, 0.5), '', '<div class="l bold" style="padding-top:0.14cm">DESTINATÁRIO / RECEBEDOR</div>', ctx),
      field(B(L + 4.6, y0 + 1.22, 7.7, 0.5), 'Data / Hora', '', ctx, { maxPt: 7.5 }),
      field(B(L + 12.3, y0 + 1.22, 7.7, 0.5), 'RG', '', ctx, { maxPt: 7.5 }),
      field(B(L, y0 + 1.72, 4.2, 0.62), 'Número operacional', nOCA, ctx, { maxPt: 7.5, bold: true }),
      field(B(L + 4.2, y0 + 1.72, 11.4, 0.62), 'Chave de acesso', groupChave(cte.chave), ctx, { maxPt: 7.5, minPt: 6, bold: true }),
      field(B(L + 15.6, y0 + 1.72, 4.4, 0.62), 'Data e hora da emissão', dateTime(cte.ide.dhEmi), ctx, { maxPt: 7.5 }),
      `<div class="cut" style="top:${cm(y0 + h + 0.12)}"></div>`,
    ]
    return { html: parts.join(''), nextY: y0 + h + 0.25 }
  }

  const h = 1.9
  const decl =
    'DECLARO QUE RECEBI OS VOLUMES DESTE CONHECIMENTO EM PERFEITO ESTADO PELO QUE DOU POR CUMPRIDO O PRESENTE CONTRATO DE TRANSPORTE'
  const dPt = fitPt(decl, W - 0.2, 6, 4.5, true, ctx.font)
  const docLabel = isOS ? 'CT-e OS' : 'CT-e'
  const numText = `Nº ${formatNumero(cte.ide.nCT)}`
  const serText = `SÉRIE ${formatSerie(cte.ide.serie)}`
  const nPt = fitPt(numText, 3.8, 9, 6.5, true, ctx.font)

  const parts = [
    box(B(L, y0, W, 0.4), 'ct-canh-hdr', esc(decl), ctx, `;font-size:${dPt}pt`),
    field(B(L, y0 + 0.4, 6.2, 0.75), 'Nome', '', ctx, { maxPt: 8 }),
    field(B(L, y0 + 1.15, 6.2, 0.75), 'RG', '', ctx, { maxPt: 8 }),
    box(B(L + 6.2, y0 + 0.4, 4.8, 1.5), 'ct-canh-sig', 'Assinatura / Carimbo', ctx),
    field(B(L + 11.0, y0 + 0.4, 4.8, 0.75), 'Término da prestação - data / hora', '', ctx, { maxPt: 8 }),
    field(B(L + 11.0, y0 + 1.15, 4.8, 0.75), 'Início da prestação - data / hora', '', ctx, { maxPt: 8 }),
    box(
      B(L + 15.8, y0 + 0.4, 4.2, 1.5),
      'ct-canh-n',
      `<div style="font-size:9pt">${esc(docLabel)}</div>` +
        `<div style="font-size:${nPt}pt">${esc(numText)}</div>` +
        `<div style="font-size:8pt">${esc(serText)}</div>`,
      ctx,
    ),
    `<div class="cut" style="top:${cm(y0 + h + 0.12)}"></div>`,
  ]
  return { html: parts.join(''), nextY: y0 + h + 0.25 }
}

// --- Sheet Header (repeated on every page, MOC 2.12) -----------------------------------------------

function emitenteLayout(cte: Cte, textW: number, maxH: number, font: FontKind) {
  const linhas = enderecoLinhas(cte)
  const isTail = (l: string) => /^(CEP|Fone): /.test(l)
  const compact = [...linhas.filter((l) => !isTail(l)), linhas.filter(isTail).join('  ')].filter(Boolean)
  const ids = [`CNPJ/CPF: ${maskDoc(cte.emit.doc)}`, cte.emit.IE ? `IE: ${cte.emit.IE}` : ''].filter(Boolean).join('  ')

  const attempt = (nomePt: number, endPt: number, src: string[]) => {
    const nome = wrapText(cte.emit.xNome, textW, nomePt, true, font).slice(0, 2)
    const end = src.flatMap((l) => wrapText(l, textW, endPt, false, font))
    const idsPt = fitPt(ids, textW, endPt, 5, true, font)
    const h = (nome.length * nomePt * 1.12 + end.length * endPt * 1.22 + idsPt * 1.22) * PT_CM
    return { nome, end, ids, nomePt, endPt, idsPt, h }
  }

  let best = attempt(9.5, 7, linhas)
  if (best.h > maxH) best = attempt(9.5, 7, compact)
  for (let step = 1; best.h > maxH && step <= 8; step++) {
    best = attempt(Math.max(6, 9.5 - step * 0.5), Math.max(5, 7 - step * 0.5), compact)
  }
  return best
}

function renderHeader(cte: Cte, ctx: Ctx, opts: DanfeOptions, y0: number, folha: number, folhas: number): string {
  const isOS = cte.kind === 'cteOS'
  const logo = safeLogo(ctx.logoDataUri)
  const emitW = 6.6
  const emitH = 2.5
  const textW = emitW - 0.24 - (logo ? 2.05 : 0)
  const em = emitenteLayout(cte, textW, emitH - 0.16, ctx.font)

  const parts: string[] = []

  // Emitente box
  parts.push(
    box(
      B(L, y0, emitW, emitH),
      '',
      `<div class="ct-emit">${logo ? `<img alt="" src="${esc(logo)}">` : ''}<div class="txt">` +
        `<div class="nome" style="font-size:${em.nomePt}pt">${em.nome.map(esc).join('<br>')}</div>` +
        `<div class="end" style="font-size:${em.endPt}pt">${em.end.map(esc).join('<br>')}</div>` +
        `<div class="end bold" style="font-size:${em.idsPt}pt">${esc(em.ids)}</div>` +
        `</div></div>`,
      ctx,
    ),
  )

  // Left stacked fields below emitente (total height 3.0cm)
  const tpCteLabel = TP_CTE[cte.ide.tpCTe] ?? cte.ide.tpCTe
  const tpServLabel = TP_SERV[cte.ide.tpServ] ?? cte.ide.tpServ
  const cfopNat = [cte.ide.CFOP, cte.ide.natOp].filter(Boolean).join(' - ')
  if (isOS) {
    parts.push(field(B(L, y0 + 2.5, emitW, 1.0), 'Tipo do CT-e', tpCteLabel, ctx, { bold: true, maxPt: 9 }))
    parts.push(field(B(L, y0 + 3.5, emitW, 1.0), 'Tipo do serviço', tpServLabel, ctx, { bold: true, maxPt: 9 }))
    parts.push(field(B(L, y0 + 4.5, emitW, 1.0), 'CFOP - Natureza da operação', cfopNat, ctx, { maxPt: 8.5, minPt: 6 }))
  } else {
    parts.push(field(B(L, y0 + 2.5, emitW, 0.75), 'Tipo do CT-e', tpCteLabel, ctx, { bold: true, maxPt: 8.5 }))
    parts.push(field(B(L, y0 + 3.25, emitW, 0.75), 'Tipo do serviço', tpServLabel, ctx, { bold: true, maxPt: 8.5 }))
    const isGlob = cte.ide.indGlobalizado === '1'
    parts.push(
      box(
        B(L, y0 + 4.0, 2.7, 0.75),
        'f',
        `<div class="l" style="font-size:5pt">IND. CT-e GLOBALIZADO</div>` +
          `<div class="ct-chk">${checkMark(isGlob, 'SIM')}${checkMark(!isGlob, 'NÃO')}</div>`,
        ctx,
      ),
    )
    parts.push(
      field(B(L + 2.7, y0 + 4.0, emitW - 2.7, 0.75), 'Inf. do CT-e globalizado', cte.globalizadoObs, ctx, {
        maxPt: 7.5,
        minPt: 5.5,
      }),
    )
    parts.push(field(B(L, y0 + 4.75, emitW, 0.75), 'CFOP - Natureza da operação', cfopNat, ctx, { maxPt: 8.5, minPt: 5.5 }))
  }

  // Right top strip (l = L + 6.6, w = 13.4)
  const rx = L + emitW
  const dacteTitle = isOS ? 'DACTE OS' : 'DACTE'
  const dacteSub1 = 'Documento Auxiliar do Conhecimento'
  const dacteSub2 = isOS ? 'de Transporte Eletrônico para Outros Serviços' : 'de Transporte Eletrônico'
  const sub2Pt = fitPt(dacteSub2, 6.0, 6, 4.5, true, ctx.font)
  parts.push(
    box(
      B(rx, y0, 6.2, 0.9),
      'ct-title',
      `<div class="t1">${dacteTitle}</div>` +
        `<div class="t2">${dacteSub1}</div>` +
        `<div class="t2" style="font-size:${sub2Pt}pt">${dacteSub2}</div>`,
      ctx,
    ),
  )
  const modalName = MODAL_NAME[cte.ide.modal] ?? cte.ide.modal
  parts.push(field(B(rx + 6.2, y0, 4.2, 0.9), 'Modal', modalName, ctx, { bold: true, align: 'center', maxPt: 10 }))
  parts.push(
    field(B(rx + 10.4, y0, 3.0, 0.9), 'Folha', `${folha}/${folhas}`, ctx, { bold: true, align: 'center', maxPt: 10 }),
  )

  // Row 2: Modelo, Série, Número, Emissão, SUFRAMA
  const sufram = cte.dest?.ISUF || cte.toma?.ISUF || ''
  parts.push(field(B(rx, y0 + 0.9, 1.4, 0.75), 'Modelo', cte.ide.mod || (isOS ? '67' : '57'), ctx, { bold: true, align: 'center', maxPt: 8.5 }))
  parts.push(field(B(rx + 1.4, y0 + 0.9, 1.4, 0.75), 'Série', formatSerie(cte.ide.serie), ctx, { bold: true, align: 'center', maxPt: 8.5 }))
  parts.push(field(B(rx + 2.8, y0 + 0.9, 2.8, 0.75), 'Número', formatNumero(cte.ide.nCT), ctx, { bold: true, align: 'center', maxPt: 8.5 }))
  parts.push(field(B(rx + 5.6, y0 + 0.9, 4.0, 0.75), 'Data e hora de emissão', dateTime(cte.ide.dhEmi), ctx, { bold: true, align: 'center', maxPt: 8.5 }))
  parts.push(field(B(rx + 9.6, y0 + 0.9, 3.8, 0.75), 'Insc. SUFRAMA destinatário', sufram, ctx, { align: 'center', maxPt: 8.5 }))

  // Lower right: Barcode + Chave + Variable Fields 1 & 2 (w = 10.2cm) | QR Code (w = 3.2cm)
  const midW = 10.2
  const qrW = 13.4 - midW
  const qrX = rx + midW
  const yLow = y0 + 1.65

  // Barcode 1 (MOC 2.17: 9cm wide x 1.50cm tall, module ~0.03cm)
  parts.push(
    box(
      B(rx, yLow, midW, 1.65),
      'ct-bc',
      barcodeSvg(cte.chave, { widthCm: 9.0, heightCm: 1.5, label: `Chave de acesso ${cte.chave}` }),
      ctx,
    ),
  )

  // Chave de acesso (11 blocks of 4, MOC 2.4)
  parts.push(
    field(B(rx, yLow + 1.65, midW, 0.65), 'Chave de acesso', groupChave(cte.chave), ctx, {
      bold: true,
      align: 'center',
      maxPt: 8.5,
      minPt: ctx.font === 'courier' ? 6 : 6.5,
    }),
  )

  // Variable Campos 1 & 2 (MOC 2.19 & 2.20)
  const fsda = cte.ide.tpEmis === '5'
  const epec = cte.ide.tpEmis === '4'
  const hom = cte.ide.tpAmb === '2'
  const prot = opts.protocol
    ? { nProt: opts.protocol.nProt, dt: opts.protocol.dateTime }
    : cte.prot
      ? { nProt: cte.prot.nProt, dt: cte.prot.dhRecbto }
      : null

  if (fsda) {
    const data = contingencyBarcodeData(cte)
    parts.push(
      box(
        B(rx, yLow + 2.3, midW, 0.9),
        'ct-bc',
        barcodeSvg(data, { widthCm: 8.2, heightCm: 0.78, label: 'Dados do CT-e' }),
        ctx,
      ),
    )
    parts.push(
      field(B(rx, yLow + 3.2, midW, 0.65), 'Dados do CT-e', groupChave(data), ctx, {
        bold: true,
        align: 'center',
        maxPt: 8.5,
        minPt: 6,
      }),
    )
  } else {
    const w = innerWidth(midW)
    const msgPt = ctx.font === 'courier' ? 6.5 : 7
    const msgLines = hom
      ? ['EMITIDO EM AMBIENTE DE HOMOLOGAÇÃO – SEM VALOR FISCAL']
      : epec
        ? ['Consulta de autenticidade no portal nacional do CT-e', 'www.cte.fazenda.gov.br/portal']
        : ['Consulta de autenticidade no portal nacional do CT-e', 'www.cte.fazenda.gov.br/portal ou no site da Sefaz Autorizadora']
    const wrapped = msgLines.flatMap((l) => wrapText(l, w, msgPt, hom, ctx.font))
    parts.push(
      box(B(rx, yLow + 2.3, midW, 0.9), `ct-msg${hom ? ' hom' : ''}`, wrapped.map(esc).join('<br>'), ctx),
    )
    const protLabel = epec ? 'Protocolo de autorização do EPEC' : 'Protocolo de autorização de uso'
    const protVal = prot
      ? [prot.nProt, dateTime(prot.dt)].filter(Boolean).join(' - ')
      : `${isOS ? 'CT-e OS' : 'CT-e'} sem protocolo de autorização`
    parts.push(
      field(B(rx, yLow + 3.2, midW, 0.65), protLabel, protVal, ctx, {
        bold: true,
        align: 'center',
        maxPt: 8.5,
        minPt: 6,
      }),
    )
  }

  // Campo 3: QR Code (MOC 2.18: minimum 25mm x 25mm; 2.8cm = 28mm with quiet zone)
  const qr = qrContent(cte)
  parts.push(
    box(
      B(qrX, yLow, qrW, 3.85),
      'ct-qr',
      qr ? qrSvg(qr, { sizeCm: 2.8, label: `QR Code de consulta do ${isOS ? 'CT-e OS' : 'CT-e'}` }) : '',
      ctx,
    ),
  )

  return parts.join('')
}

// --- Flow layout engine ----------------------------------------------------------------------------

interface Atom {
  h: number
  draw: (y: number, ctx: Ctx) => string
  lead?: Atom
}

interface Placed {
  y: number
  atom: Atom
}

function paginate(atoms: Atom[], firstTop: number, nextTop: number): Placed[][] {
  const pages: Placed[][] = [[]]
  let y = firstTop
  for (const atom of atoms) {
    let page = pages[pages.length - 1] as Placed[]
    if (y + atom.h > BOTTOM && page.length > 0) {
      page = []
      pages.push(page)
      y = nextTop
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

// --- Party blocks (MOC 2.7 & sections 3/4) ---------------------------------------------------------

function drawPartyHalf(l: number, y: number, w: number, title: string, p: CteParte | null, ctx: Ctx): string {
  const h = 1.9
  const rh = 0.38
  const parts = [box(B(l, y, w, h), '', '', ctx)]
  const name = p?.xNome ?? ''
  const addr = p ? partyAddress(p) : ''
  const mun = p?.ender.xMun ?? ''
  const cep = p?.ender.CEP ? maskCep(p.ender.CEP) : ''
  const doc = p?.doc ? maskDoc(p.doc) : ''
  const ie = p?.IE ?? ''
  const uf = p?.ender.UF ?? ''
  const pais = p ? p.ender.xPais || (uf && uf !== 'EX' ? 'BRASIL' : '') : ''
  const fone = p?.fone ? maskFone(p.fone) : ''

  parts.push(kv(B(l, y, w, rh), `${title}:`, name, ctx, { bold: true, maxPt: 7.5 }))
  parts.push(kv(B(l, y + rh, w, rh), 'Endereço:', addr, ctx, { maxPt: 7 }))
  parts.push(kv(B(l, y + rh * 2, w * 0.68, rh), 'Município:', mun, ctx, { maxPt: 7 }))
  parts.push(kv(B(l + w * 0.68, y + rh * 2, w * 0.32, rh), 'CEP:', cep, ctx, { maxPt: 7 }))
  parts.push(kv(B(l, y + rh * 3, w * 0.56, rh), 'CNPJ/CPF:', doc, ctx, { bold: true, maxPt: 7 }))
  parts.push(kv(B(l + w * 0.56, y + rh * 3, w * 0.44, rh), 'IE:', ie, ctx, { maxPt: 7 }))
  parts.push(kv(B(l, y + rh * 4, w * 0.18, rh), 'UF:', uf, ctx, { maxPt: 7 }))
  parts.push(kv(B(l + w * 0.18, y + rh * 4, w * 0.44, rh), 'País:', pais, ctx, { maxPt: 7 }))
  parts.push(kv(B(l + w * 0.62, y + rh * 4, w * 0.38, rh), 'Fone:', fone, ctx, { maxPt: 7 }))
  return parts.join('')
}

function drawPartyFull(y: number, title: string, p: CteParte | null, ctx: Ctx): string {
  const h = 1.2
  const rh = 0.4
  const parts = [box(B(L, y, W, h), '', '', ctx)]
  const name = p?.xNome ?? ''
  const addr = p ? partyAddress(p) : ''
  const mun = p?.ender.xMun ?? ''
  const cep = p?.ender.CEP ? maskCep(p.ender.CEP) : ''
  const doc = p?.doc ? maskDoc(p.doc) : ''
  const ie = p?.IE ?? ''
  const uf = p?.ender.UF ?? ''
  const pais = p ? p.ender.xPais || (uf && uf !== 'EX' ? 'BRASIL' : '') : ''
  const fone = p?.fone ? maskFone(p.fone) : ''

  parts.push(kv(B(L, y, 11.2, rh), `${title}:`, name, ctx, { bold: true, maxPt: 7.5 }))
  parts.push(kv(B(L + 11.2, y, 5.6, rh), 'Município:', mun, ctx, { maxPt: 7 }))
  parts.push(kv(B(L + 16.8, y, 3.2, rh), 'CEP:', cep, ctx, { maxPt: 7 }))
  parts.push(kv(B(L, y + rh, 12.6, rh), 'Endereço:', addr, ctx, { maxPt: 7 }))
  parts.push(kv(B(L + 12.6, y + rh, 2.2, rh), 'UF:', uf, ctx, { maxPt: 7 }))
  parts.push(kv(B(L + 14.8, y + rh, 5.2, rh), 'País:', pais, ctx, { maxPt: 7 }))
  parts.push(kv(B(L, y + rh * 2, 6.8, rh), 'CNPJ/CPF:', doc, ctx, { bold: true, maxPt: 7 }))
  parts.push(kv(B(L + 6.8, y + rh * 2, 6.4, rh), 'IE:', ie, ctx, { maxPt: 7 }))
  parts.push(kv(B(L + 13.2, y + rh * 2, 6.8, rh), 'Fone:', fone, ctx, { maxPt: 7 }))
  return parts.join('')
}

function partyAtoms(cte: Cte): Atom[] {
  if (cte.kind === 'cteOS') {
    return [{ h: 1.2, draw: (y, ctx) => drawPartyFull(y, 'Tomador / Usuário do Serviço', cte.toma, ctx) }]
  }
  if (cte.kind === 'cteSimp') {
    return [{ h: 1.2, draw: (y, ctx) => drawPartyFull(y, 'Tomador do Serviço', cte.toma, ctx) }]
  }
  const atoms: Atom[] = [
    {
      h: 1.9,
      draw: (y, ctx) =>
        drawPartyHalf(L, y, 10.0, 'Remetente', cte.rem, ctx) +
        drawPartyHalf(L + 10.0, y, 10.0, 'Destinatário', cte.dest, ctx),
    },
  ]
  // MOC 2.7: omit absent Expedidor/Recebedor; if only one is present, place Tomador in the other slot.
  if (cte.exped && cte.receb) {
    atoms.push({
      h: 1.9,
      draw: (y, ctx) =>
        drawPartyHalf(L, y, 10.0, 'Expedidor', cte.exped, ctx) +
        drawPartyHalf(L + 10.0, y, 10.0, 'Recebedor', cte.receb, ctx),
    })
    atoms.push({ h: 1.2, draw: (y, ctx) => drawPartyFull(y, 'Tomador do Serviço', cte.toma, ctx) })
  } else if (cte.exped) {
    atoms.push({
      h: 1.9,
      draw: (y, ctx) =>
        drawPartyHalf(L, y, 10.0, 'Expedidor', cte.exped, ctx) +
        drawPartyHalf(L + 10.0, y, 10.0, 'Tomador do Serviço', cte.toma, ctx),
    })
  } else if (cte.receb) {
    atoms.push({
      h: 1.9,
      draw: (y, ctx) =>
        drawPartyHalf(L, y, 10.0, 'Tomador do Serviço', cte.toma, ctx) +
        drawPartyHalf(L + 10.0, y, 10.0, 'Recebedor', cte.receb, ctx),
    })
  } else {
    atoms.push({ h: 1.2, draw: (y, ctx) => drawPartyFull(y, 'Tomador do Serviço', cte.toma, ctx) })
  }
  return atoms
}

// --- Route, Carga, Serviço, Componentes, Imposto ---------------------------------------------------

function routeAtom(cte: Cte): Atom {
  const ini = [cte.ide.UFIni, cte.ide.xMunIni].filter(Boolean).join(' - ')
  const fim = [cte.ide.UFFim, cte.ide.xMunFim].filter(Boolean).join(' - ')
  if (cte.kind === 'cteOS') {
    const perc = cte.ide.percurso.join(' - ')
    return {
      h: 0.7,
      draw: (y, ctx) =>
        field(B(L, y, 6.6, 0.7), 'Início da prestação', ini, ctx, { bold: true, maxPt: 8.5 }) +
        field(B(L + 6.6, y, 6.7, 0.7), 'Percurso do veículo', perc, ctx, { bold: true, maxPt: 8.5 }) +
        field(B(L + 13.3, y, 6.7, 0.7), 'Término da prestação', fim, ctx, { bold: true, maxPt: 8.5 }),
    }
  }
  let iniTxt = ini
  let fimTxt = fim
  if (cte.kind === 'cteSimp' && cte.simpDets.length > 0) {
    const mIni = [...new Set(cte.simpDets.map((d) => d.xMunIni).filter(Boolean))]
    const mFim = [...new Set(cte.simpDets.map((d) => d.xMunFim).filter(Boolean))]
    iniTxt = [cte.ide.UFIni, mIni.length === 1 ? mIni[0] : mIni.length > 1 ? `${mIni[0]} (+${mIni.length - 1})` : '']
      .filter(Boolean)
      .join(' - ')
    fimTxt = [cte.ide.UFFim, mFim.length === 1 ? mFim[0] : mFim.length > 1 ? `${mFim[0]} (+${mFim.length - 1})` : '']
      .filter(Boolean)
      .join(' - ')
  }
  return {
    h: 0.7,
    draw: (y, ctx) =>
      field(B(L, y, 10.0, 0.7), 'Início da prestação', iniTxt, ctx, { bold: true, maxPt: 8.5 }) +
      field(B(L + 10.0, y, 10.0, 0.7), 'Término da prestação', fimTxt, ctx, { bold: true, maxPt: 8.5 }),
  }
}

interface CargaSlots {
  bruto: string
  base: string
  aferido: string
  cubagem: string
  volumes: string
  extras: { label: string; value: string }[]
}

const UNID_SUFFIX: Record<string, string> = {
  '00': 'M³',
  '01': 'KG',
  '02': 'TON',
  '03': 'UND',
  '04': 'L',
  '05': 'MMBTU',
}

/** Map infQ items to the 5 MOC carga slots, converting TON (02) -> KG (x1000) per MOC section 3. */
function mapQuantidades(list: CteQuantidade[]): CargaSlots {
  const slots: CargaSlots = { bruto: '', base: '', aferido: '', cubagem: '', volumes: '', extras: [] }
  for (const q of list) {
    const num = Number(q.qCarga)
    const med = q.tpMed.toUpperCase()
    const isWeight = q.cUnid === '01' || q.cUnid === '02'
    const kg = isWeight && Number.isFinite(num) ? num * (q.cUnid === '02' ? 1000 : 1) : num

    if (q.cUnid === '00' || med.includes('CUBAG')) {
      if (!slots.cubagem) {
        slots.cubagem = qty(q.qCarga, 3)
        continue
      }
    } else if (isWeight) {
      if ((med.includes('AFERID') || med.includes('AUFERID') || med === '03') && !slots.aferido) {
        slots.aferido = qty(kg, 3)
        continue
      }
      if ((med.includes('BASE') || med.includes('CUBAD') || med === '04' || med === '05') && !slots.base) {
        slots.base = qty(kg, 3)
        continue
      }
      if ((med.includes('BRUTO') || med.includes('DECLAR') || med === '02' || !slots.bruto) && !slots.bruto) {
        slots.bruto = qty(kg, 3)
        continue
      }
      if (!slots.base) {
        slots.base = qty(kg, 3)
        continue
      }
      if (!slots.aferido) {
        slots.aferido = qty(kg, 3)
        continue
      }
    } else if (q.cUnid === '03' || med.includes('VOL') || med.includes('CAIXA') || med.includes('UNID')) {
      if (!slots.volumes) {
        slots.volumes = qty(q.qCarga, 0)
        continue
      }
    }
    const u = UNID_SUFFIX[q.cUnid] ?? q.cUnid
    slots.extras.push({ label: `${q.tpMed || 'QTD'} (${u})`, value: qty(q.qCarga, 2) })
  }
  return slots
}

function cargaOrServicoAtom(cte: Cte): Atom | null {
  if (cte.kind === 'cteOS') {
    const desc = cte.servico?.xDescServ ?? ''
    const q = cte.servico?.qCarga ? qty(cte.servico.qCarga, 2) : ''
    const h = ST_H + TH_H + 0.65
    return {
      h,
      draw: (y, ctx) => {
        const parts = [
          sectionBar(y, 'Informações da prestação do serviço', ctx),
          box(B(L, y + ST_H, 3.2, TH_H), 'ct-th r', 'Quantidade', ctx),
          box(B(L + 3.2, y + ST_H, 16.8, TH_H), 'ct-th', 'Descrição do serviço prestado', ctx),
          box(
            B(L, y + ST_H + TH_H, 3.2, 0.65),
            'ct-td r bold',
            esc(q),
            ctx,
            `;font-size:${fitPt(q, 3.0, 9, 6.5, true, ctx.font)}pt`,
          ),
          box(
            B(L + 3.2, y + ST_H + TH_H, 16.8, 0.65),
            'ct-td',
            esc(desc),
            ctx,
            `;font-size:${fitPt(desc, 16.6, 9, 6.5, false, ctx.font)}pt`,
          ),
        ]
        return parts.join('')
      },
    }
  }

  if (!cte.carga) return null
  const c = cte.carga
  const slots = mapQuantidades(c.quantidades)
  const cells: [string, string][] = [
    ['Peso bruto (KG)', slots.bruto],
    ['Peso base cálculo (KG)', slots.base],
    ['Peso aferido (KG)', slots.aferido],
    ['Cubagem (M³)', slots.cubagem],
    ['Quantidade de volumes (UND)', slots.volumes],
  ]
  // Fill any unused standard slots with non-standard infQ entries (e.g. LITROS, MMBTU) so no data is dropped.
  for (const ex of slots.extras) {
    const idx = cells.findIndex(([, v]) => v === '')
    if (idx !== -1) cells[idx] = [ex.label, ex.value]
  }

  return {
    h: 1.4,
    draw: (y, ctx) => {
      const parts = [
        field(B(L, y, 8.5, 0.7), 'Produto predominante', c.proPred, ctx, { bold: true, maxPt: 8.5 }),
        field(B(L + 8.5, y, 6.5, 0.7), 'Outras características da carga', c.xOutCat, ctx, { maxPt: 8.5 }),
        field(B(L + 15.0, y, 5.0, 0.7), 'Valor total da carga', c.vCarga ? formatBRL(c.vCarga) : '', ctx, {
          bold: true,
          align: 'right',
          maxPt: 8.5,
        }),
        box(
          B(L, y + 0.7, 1.2, 0.7),
          '',
          '<div class="l bold c" style="padding-top:0.14cm">QTD<br>CARGA</div>',
          ctx,
        ),
      ]
      const cw = (W - 1.2) / 5
      cells.forEach(([label, val], i) => {
        parts.push(field(B(L + 1.2 + i * cw, y + 0.7, cw, 0.7), label, val, ctx, { bold: true, align: 'right', maxPt: 8.5 }))
      })
      return parts.join('')
    },
  }
}

function componentesAtom(cte: Cte): Atom {
  const comp = cte.vPrest.comp
  const cols = 4
  const rowsPerCol = Math.max(3, Math.ceil(comp.length / cols))
  const rowH = 0.36
  const bodyH = Math.max(1.36, TH_H + rowsPerCol * rowH)
  const h = ST_H + bodyH
  const colW = 3.8
  const totW = W - cols * colW // 4.8cm

  return {
    h,
    draw: (y, ctx) => {
      const parts = [sectionBar(y, 'Componentes do valor da prestação de serviço', ctx)]
      const yBody = y + ST_H
      for (let c = 0; c < cols; c++) {
        const cx = L + c * colW
        parts.push(box(B(cx, yBody, colW, bodyH), '', '', ctx))
        parts.push(box(B(cx, yBody, colW * 0.6, TH_H), 'nb ct-th', 'Nome', ctx))
        parts.push(box(B(cx + colW * 0.6, yBody, colW * 0.4, TH_H), 'nb ct-th r', 'Valor', ctx))
        for (let r = 0; r < rowsPerCol; r++) {
          const item = comp[c * rowsPerCol + r]
          if (!item) continue
          const ry = yBody + TH_H + r * rowH
          const nPt = fitPt(item.xNome, colW * 0.6 - 0.14, 7, 5, false, ctx.font)
          const vTxt = formatMoney(item.vComp)
          const vPt = fitPt(vTxt, colW * 0.4 - 0.14, 7, 5, false, ctx.font)
          parts.push(
            box(B(cx, ry, colW * 0.6, rowH), 'nb ct-td', esc(item.xNome), ctx, `;font-size:${nPt}pt`),
          )
          parts.push(
            box(
              B(cx + colW * 0.6, ry, colW * 0.4, rowH),
              'nb ct-td r',
              esc(vTxt),
              ctx,
              `;font-size:${vPt}pt`,
            ),
          )
        }
      }
      const tx = L + cols * colW
      const half = bodyH / 2
      parts.push(
        field(B(tx, yBody, totW, half), 'Valor total da prestação do serviço', formatBRL(cte.vPrest.vTPrest), ctx, {
          bold: true,
          align: 'right',
          maxPt: 9,
        }),
      )
      parts.push(
        field(B(tx, yBody + half, totW, half), 'Valor a receber', formatBRL(cte.vPrest.vRec), ctx, {
          bold: true,
          align: 'right',
          maxPt: 9,
        }),
      )
      return parts.join('')
    },
  }
}

function impostoAtom(cte: Cte): Atom {
  const icms = cte.imp.icms
  const fed = cte.imp.tribFed
  const hasFed = fed !== null && [fed.vPIS, fed.vCOFINS, fed.vIR, fed.vINSS, fed.vCSLL].some((v) => v !== '')
  const h = ST_H + 0.7 + (hasFed ? 0.68 : 0)

  return {
    h,
    draw: (y, ctx) => {
      const y1 = y + ST_H
      const parts = [
        sectionBar(y, 'Informações relativas ao imposto', ctx),
        field(B(L, y1, 7.2, 0.7), 'Classificação tributária do serviço', icmsClassificacao(cte), ctx, {
          bold: true,
          maxPt: 8.5,
        }),
        field(B(L + 7.2, y1, 3.4, 0.7), 'Base de cálculo', icms.vBC ? formatMoney(icms.vBC) : '', ctx, {
          align: 'right',
          maxPt: 8.5,
        }),
        field(B(L + 10.6, y1, 2.8, 0.7), 'Alíquota do ICMS', icms.pICMS ? `${formatDecimal(icms.pICMS, 2)}%` : '', ctx, {
          align: 'right',
          maxPt: 8.5,
        }),
        field(B(L + 13.4, y1, 3.4, 0.7), 'Valor do ICMS', icms.vICMS ? formatMoney(icms.vICMS) : '', ctx, {
          bold: true,
          align: 'right',
          maxPt: 8.5,
        }),
        field(
          B(L + 16.8, y1, 3.2, 0.7),
          '% Red. BC. Calc.',
          icms.pRedBC ? `${formatDecimal(icms.pRedBC, 2)}%` : '',
          ctx,
          { align: 'right', maxPt: 8.5 },
        ),
      ]
      if (hasFed && fed) {
        const y2 = y1 + 0.7
        const fw = W / 5
        const feds: [string, string][] = [
          ['PIS', fed.vPIS ? formatBRL(fed.vPIS) : ''],
          ['COFINS', fed.vCOFINS ? formatBRL(fed.vCOFINS) : ''],
          ['IR', fed.vIR ? formatBRL(fed.vIR) : ''],
          ['INSS', fed.vINSS ? formatBRL(fed.vINSS) : ''],
          ['CSLL', fed.vCSLL ? formatBRL(fed.vCSLL) : ''],
        ]
        feds.forEach(([label, val], i) => {
          parts.push(field(B(L + i * fw, y2, fw, 0.68), label, val, ctx, { align: 'right', maxPt: 8 }))
        })
      }
      return parts.join('')
    },
  }
}

// --- Flowing tables: Documentos Originários, DocAnt, Casos Específicos, etc. -----------------------

interface DocRow {
  tp: string
  /** If true, `val` spans the CNPJ/CPF + Série/Nº columns (used for 44-char NF-e / DC-e keys). */
  isKey: boolean
  docEmit: string
  val: string
}

function docRowOf(d: CteDocOriginario, remDoc: string): DocRow {
  switch (d.kind) {
    case 'NFe':
      return { tp: 'NF-e', isKey: true, docEmit: '', val: d.chave }
    case 'DCe':
      return { tp: 'DC-e', isKey: true, docEmit: '', val: d.chave }
    case 'NF':
      return {
        tp: d.mod ? `NF ${d.mod}` : 'NF',
        isKey: false,
        docEmit: remDoc ? maskDoc(remDoc) : '',
        val: [d.serie, d.nDoc].filter(Boolean).join('/'),
      }
    case 'Outros':
      return {
        tp: TP_DOC_OUTROS[d.tpDoc] ?? d.tpDoc ?? 'Outros',
        isKey: false,
        docEmit: remDoc ? maskDoc(remDoc) : '',
        val: [d.nDoc, d.descOutros].filter(Boolean).join(' - '),
      }
  }
}

function drawHalfDoc(l: number, y: number, r: DocRow | undefined, ctx: Ctx): string {
  const tpW = 1.5
  const docW = 3.6
  const numW = 4.9 // sum = 10.0cm
  if (!r) return box(B(l, y, 10.0, DOC_ROW_H), '', '', ctx)
  const tpPt = fitPt(r.tp, tpW - 0.14, 6.5, 5, true, ctx.font)
  if (r.isKey) {
    const kPt = fitPt(r.val, docW + numW - 0.14, 7, 5, false, ctx.font)
    return (
      box(B(l, y, tpW, DOC_ROW_H), 'ct-td bold', esc(r.tp), ctx, `;font-size:${tpPt}pt`) +
      box(B(l + tpW, y, docW + numW, DOC_ROW_H), 'ct-td', esc(r.val), ctx, `;font-size:${kPt}pt`)
    )
  }
  const ePt = fitPt(r.docEmit, docW - 0.14, 6.5, 5, false, ctx.font)
  const vPt = fitPt(r.val, numW - 0.14, 6.5, 5, false, ctx.font)
  return (
    box(B(l, y, tpW, DOC_ROW_H), 'ct-td bold', esc(r.tp), ctx, `;font-size:${tpPt}pt`) +
    box(B(l + tpW, y, docW, DOC_ROW_H), 'ct-td', esc(r.docEmit), ctx, `;font-size:${ePt}pt`) +
    box(B(l + tpW + docW, y, numW, DOC_ROW_H), 'ct-td', esc(r.val), ctx, `;font-size:${vPt}pt`)
  )
}

function drawDocsOriginariosHead(y: number, ctx: Ctx): string {
  const half = (l: number) =>
    box(B(l, y + ST_H, 1.5, TH_H), 'ct-th', 'TP Doc.', ctx) +
    box(B(l + 1.5, y + ST_H, 3.6, TH_H), 'ct-th', 'CNPJ/CPF Emitente / Chave', ctx) +
    box(B(l + 5.1, y + ST_H, 4.9, TH_H), 'ct-th', 'Série / Nº Documento', ctx)
  return sectionBar(y, 'Documentos originários', ctx) + half(L) + half(L + 10.0)
}

function docsOriginariosAtoms(cte: Cte): Atom[] {
  if (cte.kind === 'cteOS') return []
  // MOC 2.21.4: for aquaviário with detCont and no infDoc, detCont replaces Documentos Originários.
  if (cte.modal?.kind === 'aquav' && cte.modal.detCont.length > 0 && cte.docs.length === 0) return []

  const remDoc = cte.rem?.doc ?? ''
  const items = cte.docs.map((d) => docRowOf(d, remDoc))
  const pairs: [DocRow | undefined, DocRow | undefined][] = []
  for (let i = 0; i < Math.max(1, items.length); i += 2) {
    pairs.push([items[i], items[i + 1]])
  }

  const headAtom: Atom = { h: ST_H + TH_H, draw: (y, ctx) => drawDocsOriginariosHead(y, ctx) }
  const drawPair = (pair: [DocRow | undefined, DocRow | undefined], y: number, ctx: Ctx) =>
    drawHalfDoc(L, y, pair[0], ctx) + drawHalfDoc(L + 10.0, y, pair[1], ctx)

  const first: Atom = {
    h: headAtom.h + DOC_ROW_H,
    draw: (y, ctx) => headAtom.draw(y, ctx) + drawPair(pairs[0]!, y + headAtom.h, ctx),
  }
  const rest: Atom[] = pairs.slice(1).map((pair) => ({
    h: DOC_ROW_H,
    lead: headAtom,
    draw: (y, ctx) => drawPair(pair, y, ctx),
  }))
  return [first, ...rest]
}

interface SimpleCol {
  label: string
  w: number
  align?: 'r'
  bold?: boolean
}

function simpleTableAtoms(title: string, cols: SimpleCol[], rows: string[][]): Atom[] {
  if (rows.length === 0) return []
  const headAtom: Atom = {
    h: ST_H + TH_H,
    draw: (y, ctx) => {
      let x = L
      let out = sectionBar(y, title, ctx)
      for (const c of cols) {
        const pt = fitPt(c.label.toUpperCase(), c.w - 0.12, 5.5, 4.5, true, ctx.font)
        out += box(
          B(x, y + ST_H, c.w, TH_H),
          `ct-th${c.align === 'r' ? ' r' : ''}`,
          esc(c.label),
          ctx,
          pt < 5.5 ? `;font-size:${pt}pt` : '',
        )
        x += c.w
      }
      return out
    },
  }
  const drawRow = (row: string[], y: number, ctx: Ctx) => {
    let x = L
    let out = ''
    cols.forEach((c, i) => {
      const val = row[i] ?? ''
      const pt = fitPt(val, c.w - 0.14, 7, 5, c.bold, ctx.font)
      out += box(
        B(x, y, c.w, DOC_ROW_H),
        `ct-td${c.align === 'r' ? ' r' : ''}${c.bold ? ' bold' : ''}`,
        esc(val),
        ctx,
        `;font-size:${pt}pt`,
      )
      x += c.w
    })
    return out
  }
  const first: Atom = {
    h: headAtom.h + DOC_ROW_H,
    draw: (y, ctx) => headAtom.draw(y, ctx) + drawRow(rows[0]!, y + headAtom.h, ctx),
  }
  const rest: Atom[] = rows.slice(1).map((row) => ({
    h: DOC_ROW_H,
    lead: headAtom,
    draw: (y, ctx) => drawRow(row, y, ctx),
  }))
  return [first, ...rest]
}

function docsAntAtoms(cte: Cte): Atom[] {
  const rows: string[][] = cte.docsAnt.map((d) => [
    d.chCTe ? 'CT-e' : TP_DOC_ANT_PAP[d.tpDoc] ?? d.tpDoc,
    [d.emiDoc ? maskDoc(d.emiDoc) : '', d.emiNome].filter(Boolean).join(' - '),
    d.chCTe || [d.serie, d.nDoc].filter(Boolean).join('/'),
  ])
  for (const ch of cte.cteMultimodalVinc) {
    rows.push(['CT-e Multimodal', '', ch])
  }
  return simpleTableAtoms(
    'Documentos de transporte anterior / vinculados',
    [
      { label: 'Tipo', w: 2.6, bold: true },
      { label: 'Emitente', w: 7.4 },
      { label: 'Chave de acesso / Série / Nº', w: 10.0 },
    ],
    rows,
  )
}

function docsRefOSAtoms(cte: Cte): Atom[] {
  if (cte.kind !== 'cteOS') return []
  const rows: string[][] = cte.docsRefOS.map((d) => [
    d.chBPe ? 'BP-e' : 'Doc. Ref.',
    d.chBPe || [d.serie, d.subserie, d.nDoc].filter(Boolean).join('/'),
    d.dEmi ? splitDateTime(d.dEmi).date : '',
    d.vDoc ? formatBRL(d.vDoc) : '',
  ])
  for (const ch of cte.gtves) {
    rows.push(['GTV-e', ch, '', ''])
  }
  return simpleTableAtoms(
    'Documentos referenciados',
    [
      { label: 'Tipo', w: 2.4, bold: true },
      { label: 'Número / Chave de acesso', w: 11.4 },
      { label: 'Emissão', w: 2.6 },
      { label: 'Valor', w: 3.6, align: 'r' },
    ],
    rows,
  )
}

function casosEspecificosAtoms(cte: Cte): Atom[] {
  const out: Atom[] = []
  if (cte.veicNovos.length > 0) {
    out.push(
      ...simpleTableAtoms(
        'Informações sobre os veículos novos transportados',
        [
          { label: 'Chassi', w: 4.4, bold: true },
          { label: 'Cor', w: 5.2 },
          { label: 'Marca / Modelo', w: 3.6 },
          { label: 'Vr. Unit. do veículo', w: 3.4, align: 'r' },
          { label: 'Frete unitário', w: 3.4, align: 'r' },
        ],
        cte.veicNovos.map((v) => [
          v.chassi,
          [v.cCor, v.xCor].filter(Boolean).join(' - '),
          v.cMod,
          formatBRL(v.vUnit),
          formatBRL(v.vFrete),
        ]),
      ),
    )
  }
  if (cte.modal?.kind === 'aereo' && cte.modal.peri.length > 0) {
    out.push(
      ...simpleTableAtoms(
        'Informações sobre os artigos perigosos',
        [
          { label: 'Número ONU/UN', w: 3.0, bold: true },
          { label: 'Qtd. total de volumes contendo artigos perigosos', w: 7.0 },
          { label: 'Qtd. total de artigos perigosos', w: 6.4, align: 'r' },
          { label: 'Unidade de medida', w: 3.6 },
        ],
        cte.modal.peri.map((p) => [p.nONU, p.qTotEmb, qty(p.qTotProd, 2), UNI_AP[p.uniAP] ?? p.uniAP]),
      ),
    )
  }
  return out
}

function fluxoAtom(cte: Cte): Atom | null {
  if (cte.kind === 'cteOS') return null
  const f = cte.compl.fluxo
  return {
    h: ST_H + 0.68,
    draw: (y, ctx) =>
      sectionBar(y, 'Previsão do fluxo da carga', ctx) +
      field(B(L, y + ST_H, 6.6, 0.68), 'Sigla ou cód. int. filial/porto/estação/aeroporto de origem', f.xOrig, ctx, { maxPt: 8 }) +
      field(
        B(L + 6.6, y + ST_H, 6.8, 0.68),
        'Sigla ou cód. int. filial/porto/estação/aeroporto de passagem',
        f.xPass.join(' / '),
        ctx,
        { maxPt: 8 },
      ) +
      field(B(L + 13.4, y + ST_H, 6.6, 0.68), 'Sigla ou cód. int. filial/porto/estação/aeroporto de destino', f.xDest, ctx, { maxPt: 8 }),
  }
}

// --- Observações Gerais ----------------------------------------------------------------------------

function buildObsLines(cte: Cte, font: FontKind): string[] {
  const parts: string[] = []
  if (cte.ide.tpEmis === '5') {
    parts.push('DACTE em Contingência - impresso em decorrência de problemas técnicos.')
  }
  if (cte.compl.xObs) parts.push(cte.compl.xObs)
  if (cte.imp.infAdFisco) parts.push(cte.imp.infAdFisco)
  if (cte.cteSub?.chCte) parts.push(`CT-e substituído: ${cte.cteSub.chCte}`)
  if (cte.cteComp.length > 0) parts.push(`CT-e complementado: ${cte.cteComp.join(', ')}`)
  if (cte.imp.icms.vCred && Number(cte.imp.icms.vCred) > 0) {
    parts.push(`Crédito outorgado/presumido: ${formatBRL(cte.imp.icms.vCred)}`)
  }
  if (cte.imp.icmsUFFim) {
    const u = cte.imp.icmsUFFim
    parts.push(
      `DIFAL — BC: ${formatBRL(u.vBCUFFim)} | FCP UF Fim: ${formatBRL(u.vFCPUFFim)} | ICMS UF Fim: ${formatBRL(u.vICMSUFFim)} | ICMS UF Ini: ${formatBRL(u.vICMSUFIni)}`,
    )
  }
  if (cte.imp.vTotTrib && Number(cte.imp.vTotTrib) > 0) {
    parts.push(`Valor aproximado dos tributos: ${formatBRL(cte.imp.vTotTrib)}`)
  }
  if (cte.imp.vTotDFe && Number(cte.imp.vTotDFe) > 0) {
    parts.push(`Valor total do documento fiscal (com IBS/CBS): ${formatBRL(cte.imp.vTotDFe)}`)
  }
  const w = innerWidth(W)
  return parts.flatMap((p) => wrapText(p, w, 7, false, font))
}

function observacoesAtoms(cte: Cte, font: FontKind): Atom[] {
  const lines = buildObsLines(cte, font)
  const body = lines.length > 0 ? lines : ['']
  const headAtom: Atom = { h: ST_H, draw: (y, ctx) => sectionBar(y, 'Observações gerais', ctx) }

  // Group into compact line atoms; minimum 3 lines visual height when on a single chunk.
  const minLines = Math.max(3, Math.min(body.length, 4))
  const firstSlice = body.slice(0, minLines)
  const firstH = Math.max(minLines * OBS_LINE_H + 0.1, 1.05)

  const drawLines = (ls: string[], y: number, h: number, ctx: Ctx) =>
    box(
      B(L, y, W, h),
      'ct-obs',
      ls.map(esc).join('<br>'),
      ctx,
      `;font-size:7pt;line-height:${OBS_LINE_H}cm`,
    )

  const atoms: Atom[] = [
    {
      h: ST_H + firstH,
      draw: (y, ctx) => headAtom.draw(y, ctx) + drawLines(firstSlice, y + ST_H, firstH, ctx),
    },
  ]
  for (let i = minLines; i < body.length; i++) {
    const line = body[i]!
    atoms.push({
      h: OBS_LINE_H + 0.06,
      lead: headAtom,
      draw: (y, ctx) => box(B(L, y, W, OBS_LINE_H + 0.06), 'ct-td', esc(line), ctx, ';font-size:7pt'),
    })
  }
  return atoms
}

// --- Modal-specific sections (all 6 modals + CT-e OS) ----------------------------------------------

function seguroOSAtoms(cte: Cte): Atom[] {
  if (cte.kind !== 'cteOS') return []
  const rows =
    cte.seguros.length > 0
      ? cte.seguros.map((s) => [RESP_SEG_OS[s.respSeg] ?? s.respSeg, s.xSeg, s.nApol])
      : [['', '', '']]
  return simpleTableAtoms(
    'Seguro da viagem',
    [
      { label: 'Responsável', w: 5.0 },
      { label: 'Nome da seguradora', w: 9.0 },
      { label: 'Número da apólice', w: 6.0 },
    ],
    rows,
  )
}

function modalAtoms(cte: Cte): Atom[] {
  const m = cte.modal
  if (cte.kind === 'cteOS') {
    const r = m?.kind === 'rodoOS' ? m : null
    const prop = r?.veic?.prop
    const hasProp = prop !== null && prop !== undefined
    const h = ST_H + 0.72 + (hasProp ? 0.72 : 0)
    return [
      {
        h,
        draw: (y, ctx) => {
          const y1 = y + ST_H
          const parts = [
            sectionBar(y, 'Informações específicas do modal rodoviário', ctx),
            field(B(L, y1, 4.2, 0.72), 'Termo de aut. de fretamento (TAF)', r?.TAF ?? '', ctx, { bold: true, maxPt: 8.5 }),
            field(B(L + 4.2, y1, 4.4, 0.72), 'Nº de registro estadual', r?.NroRegEstadual ?? '', ctx, { maxPt: 8.5 }),
            field(B(L + 8.6, y1, 3.2, 0.72), 'Placa do veículo', r?.veic?.placa ?? '', ctx, { bold: true, maxPt: 8.5 }),
            field(B(L + 11.8, y1, 3.8, 0.72), 'RENAVAM do veículo', r?.veic?.RENAVAM ?? '', ctx, { maxPt: 8.5 }),
            field(B(L + 15.6, y1, 4.4, 0.72), 'CNPJ / CPF proprietário', prop?.doc ? maskDoc(prop.doc) : '', ctx, { maxPt: 8.5 }),
          ]
          if (hasProp && prop) {
            const y2 = y1 + 0.72
            parts.push(field(B(L, y2, 8.6, 0.72), 'Proprietário do veículo', prop.xNome, ctx, { maxPt: 8 }))
            parts.push(field(B(L + 8.6, y2, 5.7, 0.72), 'TAF proprietário', prop.TAF, ctx, { maxPt: 8 }))
            parts.push(field(B(L + 14.3, y2, 5.7, 0.72), 'Nº reg. estadual proprietário', prop.NroRegEstadual, ctx, { maxPt: 8 }))
          }
          return parts.join('')
        },
      },
    ]
  }

  if (!m) {
    // Fallback by ide.modal when infModal is absent (e.g. CT-e Complementar)
    if (cte.ide.modal === '01') {
      return [
        {
          h: ST_H + 0.72,
          draw: (y, ctx) =>
            sectionBar(y, 'Informações específicas do modal rodoviário', ctx) +
            field(B(L, y + ST_H, 5.0, 0.72), 'RNTRC da empresa', '', ctx, { bold: true, maxPt: 8.5 }) +
            box(
              B(L + 5.0, y + ST_H, 15.0, 0.72),
              'ct-msg',
              'ESSE CONHECIMENTO DE TRANSPORTE ATENDE À LEGISLAÇÃO DE TRANSPORTE RODOVIÁRIO EM VIGOR',
              ctx,
              ';font-size:6.5pt',
            ),
        },
      ]
    }
    return []
  }

  switch (m.kind) {
    case 'rodo': {
      const atoms: Atom[] = [
        {
          h: ST_H + 0.72,
          draw: (y, ctx) =>
            sectionBar(y, 'Informações específicas do modal rodoviário', ctx) +
            field(B(L, y + ST_H, 5.0, 0.72), 'RNTRC da empresa', m.RNTRC, ctx, { bold: true, maxPt: 8.5 }) +
            box(
              B(L + 5.0, y + ST_H, 15.0, 0.72),
              'ct-msg',
              'ESSE CONHECIMENTO DE TRANSPORTE ATENDE À LEGISLAÇÃO DE TRANSPORTE RODOVIÁRIO EM VIGOR',
              ctx,
              ';font-size:6.5pt',
            ),
        },
      ]
      if (m.occ.length > 0) {
        atoms.push(
          ...simpleTableAtoms(
            'Ordens de coleta associadas (OCC)',
            [
              { label: 'Série', w: 2.0 },
              { label: 'Nº OCC', w: 3.4, bold: true },
              { label: 'Emissão', w: 3.0 },
              { label: 'CNPJ Emitente', w: 5.4 },
              { label: 'IE', w: 4.2 },
              { label: 'UF', w: 2.0 },
            ],
            m.occ.map((o) => [o.serie, o.nOcc, splitDateTime(o.dEmi).date, maskDoc(o.CNPJ), o.IE, o.UF]),
          ),
        )
      }
      return atoms
    }

    case 'aereo': {
      const retiraSim = cte.ide.retira === '0'
      const manu = m.cInfManu.map((c) => INF_MANU[c] ?? c).join('; ')
      return [
        {
          h: ST_H + 2.16,
          draw: (y, ctx) => {
            const y1 = y + ST_H
            const y2 = y1 + 0.72
            const y3 = y2 + 0.72
            return [
              sectionBar(y, 'Informações específicas do modal aéreo', ctx),
              field(B(L, y1, 6.2, 0.72), 'Número operacional do conhecimento aéreo', m.nOCA, ctx, { bold: true, maxPt: 8.5 }),
              field(B(L + 6.2, y1, 4.4, 0.72), 'Classe', CLASSE_AEREO[m.CL] ?? m.CL, ctx, { maxPt: 8 }),
              field(B(L + 10.6, y1, 4.4, 0.72), 'Código da tarifa', m.cTar, ctx, { maxPt: 8 }),
              field(B(L + 15.0, y1, 5.0, 0.72), 'Valor da tarifa', m.vTar ? formatBRL(m.vTar) : '', ctx, {
                align: 'right',
                maxPt: 8.5,
              }),
              field(B(L, y2, 6.2, 0.72), 'Número da minuta', m.nMinu, ctx, { maxPt: 8.5 }),
              box(
                B(L + 6.2, y2, 3.2, 0.72),
                'f',
                `<div class="l">RETIRA</div><div class="ct-chk">${checkMark(retiraSim, 'SIM')}${checkMark(!retiraSim, 'NÃO')}</div>`,
                ctx,
              ),
              field(B(L + 9.4, y2, 10.6, 0.72), 'Dados relativos à retirada da carga', cte.ide.xDetRetira, ctx, { maxPt: 8 }),
              field(B(L, y3, 5.0, 0.72), 'Característica adicional do serviço', cte.compl.xCaracSer, ctx, { maxPt: 8 }),
              field(B(L + 5.0, y3, 3.6, 0.72), 'Data prevista de entrega', splitDateTime(m.dPrevAereo).date, ctx, {
                align: 'center',
                maxPt: 8,
              }),
              field(B(L + 8.6, y3, 4.2, 0.72), 'Natureza da carga - Dimensão', m.xDime, ctx, { maxPt: 8 }),
              field(B(L + 12.8, y3, 7.2, 0.72), 'Informações de manuseio', manu, ctx, { maxPt: 7.5, minPt: 5.5 }),
            ].join('')
          },
        },
      ]
    }

    case 'aquav': {
      const atoms: Atom[] = []
      if (m.detCont.length > 0) {
        const hasDocsInCont = m.detCont.some((c) => c.nfes.length > 0 || c.nfs.length > 0)
        if (hasDocsInCont && cte.docs.length === 0) {
          // MOC 2.21.4: detCont with embedded documents replaces Documentos Originários.
          const remDoc = cte.rem?.doc ? maskDoc(cte.rem.doc) : ''
          const rows: string[][] = []
          for (const c of m.detCont) {
            const lacre = c.lacres.join(', ')
            for (const ch of c.nfes) rows.push(['NF-e', remDoc, ch, lacre, c.nCont])
            for (const nf of c.nfs) rows.push(['NF', remDoc, `${nf.serie}/${nf.nDoc}`, lacre, c.nCont])
            if (c.nfes.length === 0 && c.nfs.length === 0) rows.push(['', '', '', lacre, c.nCont])
          }
          atoms.push(
            ...simpleTableAtoms(
              'Detalhamento do container - informações específicas do modal aquaviário (I)',
              [
                { label: 'TP Doc.', w: 1.5, bold: true },
                { label: 'CNPJ/CPF Emit.', w: 3.4 },
                { label: 'Série / Nº / Chave', w: 8.5 },
                { label: 'Nro. Lacre', w: 3.3 },
                { label: 'Nro. Container', w: 3.3, bold: true },
              ],
              rows,
            ),
          )
        } else {
          atoms.push(
            ...simpleTableAtoms(
              'Detalhamento do container - informações específicas do modal aquaviário (I)',
              [
                { label: 'Lacre', w: 10.0 },
                { label: 'Identificação do container', w: 10.0, bold: true },
              ],
              m.detCont.map((c) => [c.lacres.join(', '), c.nCont]),
            ),
          )
        }
      }
      atoms.push({
        h: ST_H + 0.72,
        draw: (y, ctx) =>
          sectionBar(y, 'Informações específicas do modal aquaviário (II)', ctx) +
          field(B(L, y + ST_H, 7.6, 0.72), 'Identificação do navio / rebocador', m.xNavio, ctx, { bold: true, maxPt: 8.5 }) +
          field(B(L + 7.6, y + ST_H, 7.4, 0.72), 'Identificação da balsa', m.balsas.join(', '), ctx, { maxPt: 8.5 }) +
          field(B(L + 15.0, y + ST_H, 5.0, 0.72), 'Vlr. do AFRMM', m.vAFRMM ? formatBRL(m.vAFRMM) : '', ctx, {
            align: 'right',
            bold: true,
            maxPt: 8.5,
          }),
      })
      return atoms
    }

    case 'ferrov': {
      const atoms: Atom[] = [
        {
          h: ST_H + 0.72,
          draw: (y, ctx) =>
            sectionBar(y, 'Informações específicas do modal ferroviário', ctx) +
            field(B(L, y + ST_H, 3.6, 0.72), 'Tipo de tráfego', TP_TRAF[m.tpTraf] ?? m.tpTraf, ctx, { bold: true, maxPt: 8 }) +
            field(B(L + 3.6, y + ST_H, 3.4, 0.72), 'Fluxo ferroviário', m.fluxo, ctx, { maxPt: 8 }) +
            field(
              B(L + 7.0, y + ST_H, 4.8, 0.72),
              'Ferrovia responsável pelo faturamento',
              FERRO_RESP[m.respFat] ?? m.respFat,
              ctx,
              { maxPt: 8 },
            ) +
            field(
              B(L + 11.8, y + ST_H, 4.4, 0.72),
              'Ferrovia emitente do CT-e',
              FERRO_RESP[m.ferrEmi] ?? m.ferrEmi,
              ctx,
              { maxPt: 8 },
            ) +
            field(B(L + 16.2, y + ST_H, 3.8, 0.72), 'Valor do frete', m.vFrete ? formatBRL(m.vFrete) : '', ctx, {
              align: 'right',
              bold: true,
              maxPt: 8,
            }),
        },
      ]
      if (m.ferroEnv.length > 0) {
        atoms.push(
          ...simpleTableAtoms(
            'Informações das ferrovias envolvidas',
            [
              { label: 'CNPJ', w: 4.0, bold: true },
              { label: 'IE', w: 3.4 },
              { label: 'Cód. Interno', w: 3.0 },
              { label: 'Razão Social', w: 9.6 },
            ],
            m.ferroEnv.map((f) => [maskDoc(f.CNPJ), f.IE, f.cInt, f.xNome]),
          ),
        )
      }
      return atoms
    }

    case 'duto': {
      const icms = cte.imp.icms
      return [
        {
          h: ST_H + 0.72,
          draw: (y, ctx) =>
            sectionBar(y, 'Informações específicas do modal dutoviário', ctx) +
            field(B(L, y + ST_H, 3.6, 0.72), 'Valor da tarifa', m.vTar ? formatDecimal(m.vTar, 6) : '', ctx, {
              align: 'right',
              maxPt: 8,
            }) +
            field(B(L + 3.6, y + ST_H, 3.2, 0.72), 'Data início prestação', splitDateTime(m.dIni).date, ctx, {
              align: 'center',
              maxPt: 8,
            }) +
            field(B(L + 6.8, y + ST_H, 3.2, 0.72), 'Data fim prestação', splitDateTime(m.dFim).date, ctx, {
              align: 'center',
              maxPt: 8,
            }) +
            field(B(L + 10.0, y + ST_H, 3.6, 0.72), 'Base de cálculo', icms.vBC ? formatBRL(icms.vBC) : '', ctx, {
              align: 'right',
              maxPt: 8,
            }) +
            field(
              B(L + 13.6, y + ST_H, 2.8, 0.72),
              'Alíquota',
              icms.pICMS ? `${formatDecimal(icms.pICMS, 2)}%` : '',
              ctx,
              { align: 'right', maxPt: 8 },
            ) +
            field(B(L + 16.4, y + ST_H, 3.6, 0.72), 'Valor do imposto', icms.vICMS ? formatBRL(icms.vICMS) : '', ctx, {
              align: 'right',
              maxPt: 8,
            }),
        },
      ]
    }

    case 'multimodal': {
      const neg = m.indNegociavel === '1'
      const atoms: Atom[] = [
        {
          h: ST_H + 0.72,
          draw: (y, ctx) =>
            sectionBar(y, 'Informações específicas do transporte multimodal de cargas', ctx) +
            field(
              B(L, y + ST_H, 13.0, 0.72),
              'Nº do certificado do operador de transporte multimodal (COTM)',
              m.COTM,
              ctx,
              { bold: true, maxPt: 8.5 },
            ) +
            box(
              B(L + 13.0, y + ST_H, 7.0, 0.72),
              'f',
              `<div class="l">INDICADOR NEGOCIÁVEL</div>` +
                `<div class="ct-chk">${checkMark(neg, 'NEGOCIÁVEL')}${checkMark(!neg, 'NÃO NEGOCIÁVEL')}</div>`,
              ctx,
            ),
        },
      ]
      if (m.seg) {
        const s = m.seg
        atoms.push({
          h: ST_H + 0.72,
          draw: (y, ctx) =>
            sectionBar(y, 'Informações do seguro do multimodal', ctx) +
            field(B(L, y + ST_H, 4.2, 0.72), 'CNPJ da seguradora', s.CNPJ ? maskDoc(s.CNPJ) : '', ctx, { maxPt: 8 }) +
            field(B(L + 4.2, y + ST_H, 6.8, 0.72), 'Nome da seguradora', s.xSeg, ctx, { maxPt: 8 }) +
            field(B(L + 11.0, y + ST_H, 4.5, 0.72), 'Número da apólice', s.nApol, ctx, { maxPt: 8 }) +
            field(B(L + 15.5, y + ST_H, 4.5, 0.72), 'Número da averbação', s.nAver, ctx, { maxPt: 8 }),
        })
      }
      return atoms
    }

    case 'rodoOS':
      return []
  }
}

// --- Uso Exclusivo do Emissor | Reservado ao Fisco (MOC 2.9 & sections 3/4) ------------------------

function bottomReserveAtom(cte: Cte, font: FontKind): Atom {
  const leftW = 12.5
  const rightW = W - leftW
  const contText = cte.compl.obsCont.map((o) => `${o.xCampo}: ${o.xTexto}`).join(' | ')
  const fiscoText = cte.compl.obsFisco.map((o) => `${o.xCampo}: ${o.xTexto}`).join(' | ')
  const contLines = contText ? wrapText(contText, leftW - 0.2, 6.5, false, font) : []
  const fiscoLines = fiscoText ? wrapText(fiscoText, rightW - 0.2, 6.5, false, font) : []
  const maxL = Math.max(4, contLines.length, fiscoLines.length)
  const bodyH = Math.max(1.3, maxL * 0.28 + 0.14)

  return {
    h: ST_H + bodyH,
    draw: (y, ctx) =>
      box(B(L, y, leftW, ST_H), 'st', 'Uso exclusivo do emissor do CT-e', ctx) +
      box(B(L + leftW, y, rightW, ST_H), 'st', 'Reservado ao fisco', ctx) +
      box(
        B(L, y + ST_H, leftW, bodyH),
        'ct-obs',
        contLines.map(esc).join('<br>'),
        ctx,
        ';font-size:6.5pt;line-height:0.28cm',
      ) +
      box(
        B(L + leftW, y + ST_H, rightW, bodyH),
        'ct-obs',
        fiscoLines.map(esc).join('<br>'),
        ctx,
        ';font-size:6.5pt;line-height:0.28cm',
      ),
  }
}

// --- Public renderer -------------------------------------------------------------------------------

export function renderDacte(cte: Cte, opts: DanfeOptions = {}): string {
  const font = opts.fontFamily ?? 'times'
  const ctx: Ctx = { font, dy: 0, logoDataUri: opts.logoDataUri }
  const showCanhoto = opts.cte?.canhoto !== false
  const canhoto = showCanhoto ? renderCanhoto(cte, ctx) : { html: '', nextY: TOP }

  const firstBodyTop = canhoto.nextY + HDR_H + 0.12
  const nextBodyTop = TOP + HDR_H + 0.12

  const atoms: Atom[] = []
  // When FS-DA + homologação, Campo 1 holds the contingency barcode, so show the MOC 2.20 notice right below the header.
  if (cte.ide.tpAmb === '2' && cte.ide.tpEmis === '5') {
    atoms.push({
      h: 0.44,
      draw: (y, c) =>
        box(B(L, y, W, 0.44), 'ct-hom-bar', 'EMITIDO EM AMBIENTE DE HOMOLOGAÇÃO – SEM VALOR FISCAL', c),
    })
  }

  atoms.push(routeAtom(cte))
  atoms.push(...partyAtoms(cte))
  const cs = cargaOrServicoAtom(cte)
  if (cs) atoms.push(cs)
  atoms.push(componentesAtom(cte))
  atoms.push(impostoAtom(cte))
  atoms.push(...docsOriginariosAtoms(cte))
  atoms.push(...docsAntAtoms(cte))
  atoms.push(...docsRefOSAtoms(cte))
  atoms.push(...casosEspecificosAtoms(cte))
  const fl = fluxoAtom(cte)
  if (fl) atoms.push(fl)
  atoms.push(...observacoesAtoms(cte, font))
  atoms.push(...seguroOSAtoms(cte))
  atoms.push(...modalAtoms(cte))
  atoms.push(bottomReserveAtom(cte, font))

  const pages = paginate(atoms, firstBodyTop, nextBodyTop)
  const folhas = pages.length
  const watermark = cte.ide.tpAmb === '2' ? '<div class="wm">SEM VALOR FISCAL</div>' : ''

  const html = pages
    .map((placed, i) => {
      const hdrY = i === 0 ? canhoto.nextY : TOP
      const hdr = renderHeader(cte, ctx, opts, hdrY, i + 1, folhas)
      const body = placed.map((p) => p.atom.draw(p.y, ctx)).join('')
      return `<section class="page">${i === 0 ? canhoto.html : ''}${hdr}${body}${watermark}</section>`
    })
    .join('\n')

  const docName = cte.kind === 'cteOS' ? 'DACTE OS' : 'DACTE'
  const docTitle = opts.title ?? `${docName} ${cte.chave}`
  return (
    `<!DOCTYPE html>\n<html lang="pt-BR"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(docTitle)}</title>` +
    `<style>${dacteCss(font)}</style></head><body>\n${html}\n</body></html>`
  )
}
