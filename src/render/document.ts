import { esc } from '../escape'
import {
  CONTENT_BOTTOM,
  CONTINUATION_DY,
  ITENS,
  TITLE_H,
  type Box,
} from '../layout/portrait'
import { LINE_H, continuationQuadroHeight, continuationQuadroTop, paginate, type ItemLine, type Page } from '../layout/paginate'
import type { Nfe } from '../model'
import type { DanfeOptions } from '../options'
import { renderAdicionais, renderDestinatario, renderImposto, renderIssqn, renderTransportador, fatura, infoLines, INFO_WIDTH } from './body'
import { box, title, type Ctx } from './dom'
import { renderCanhoto, renderHeader } from './header'
import { renderItemsQuadro, itemToLines, type Row } from './items'
import { css } from './styles'
import { ADICIONAIS } from '../layout/portrait'

const CONT_OVERHEAD = 0.55

function watermark(nfe: Nfe): string {
  return nfe.ide.tpAmb === '2' ? '<div class="wm">SEM VALOR FISCAL</div>' : ''
}

function firstPage(nfe: Nfe, page: Page<Row>, folhas: number, ctx: Ctx, opts: DanfeOptions, info: { lines: string[]; continues: boolean }, fat: string): string {
  return [
    renderCanhoto(nfe, ctx),
    renderHeader(nfe, ctx, opts, page.folha, folhas),
    renderDestinatario(nfe, ctx),
    fat,
    renderImposto(nfe, ctx),
    renderTransportador(nfe, ctx),
    title({ l: 0.25, t: 17.45, w: 4.0, h: TITLE_H }, 'Dados dos produtos / serviços', ctx),
    renderItemsQuadro(ITENS.quadro, page.lines, ctx),
    renderIssqn(nfe, ctx),
    renderAdicionais(info.lines, info.continues, ctx),
  ].join('')
}

function nextPage(nfe: Nfe, page: Page<Row>, folhas: number, ctx: Ctx, opts: DanfeOptions): string {
  const top = continuationQuadroTop()
  const total = continuationQuadroHeight()
  const infH = page.infLines.length ? page.infLines.length * LINE_H + CONT_OVERHEAD : 0
  const quadro: Box = { l: 0.25, t: top - ctx.dy, w: ITENS.quadro.w, h: total - infH }
  const parts = [
    renderHeader(nfe, ctx, opts, page.folha, folhas),
    title({ l: 0.25, t: top - TITLE_H - ctx.dy, w: 4.0, h: TITLE_H }, 'Dados dos produtos / serviços', ctx),
    renderItemsQuadro(quadro, page.lines, ctx),
  ]
  if (page.infLines.length) {
    const b: Box = { l: 0.25, t: CONTENT_BOTTOM - infH - ctx.dy, w: ADICIONAIS.info.w + 7.62, h: infH }
    parts.push(
      box(
        b,
        'f',
        `<div class="l">Informações complementares (continuação)</div>` +
          `<div class="v" style="font-size:6pt;line-height:${LINE_H}cm">${page.infLines.map(esc).join('<br>')}</div>`,
        ctx,
      ),
    )
  }
  return parts.join('')
}

export function renderDocument(nfe: Nfe, opts: DanfeOptions = {}): string {
  const font = opts.fontFamily ?? 'times'
  const ctxFirst: Ctx = { font, dy: 0, logoDataUri: opts.logoDataUri }
  const ctxNext: Ctx = { ...ctxFirst, dy: CONTINUATION_DY }

  const fat = fatura(nfe, ctxFirst)
  const homolog = nfe.ide.tpAmb === '2'
  const info = infoLines(nfe, fat.overflow.length ? [`Duplicatas (continuação): ${fat.overflow.join('; ')}`] : [], homolog, ctxFirst, INFO_WIDTH)
  const itemLines: ItemLine<Row>[] = nfe.itens.flatMap((i) => itemToLines(i, font))
  // Continuation lines are wrapped for the full-width box of later sheets.
  const pag = paginate({ itemLines, infLines: info })

  const folhas = pag.pages.length
  const html = pag.pages
    .map((p, i) => {
      const inner =
        i === 0
          ? firstPage(nfe, p, folhas, ctxFirst, opts, { lines: pag.firstInfLines, continues: pag.infContinues }, fat.html)
          : nextPage(nfe, p, folhas, ctxNext, opts)
      return `<section class="page">${inner}${watermark(nfe)}</section>`
    })
    .join('\n')

  const docTitle = opts.title ?? `DANFE ${nfe.chave}`
  return (
    `<!DOCTYPE html>\n<html lang="pt-BR"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(docTitle)}</title>` +
    `<style>${css(font)}</style></head><body>\n${html}\n</body></html>`
  )
}

