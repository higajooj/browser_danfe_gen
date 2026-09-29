import { esc } from '../escape'
import { formatDecimal, formatMoney } from '../format'
import { ITEM_COLUMNS, ITENS, type Box, type ItemColumnKey } from '../layout/portrait'
import { LINE_H, type ItemLine } from '../layout/paginate'
import type { Item } from '../model'
import { wrapText, type FontKind } from '../text'
import { box, cm, type Ctx } from './dom'

export type Row = Partial<Record<ItemColumnKey, string>>

const colW = (key: ItemColumnKey) => ITEM_COLUMNS.find((c) => c.key === key)?.w ?? 1
const CELL_PAD = 0.14

/** One product = one or more printed lines (description + infAdProd wrap, long codes break). */
export function itemToLines(item: Item, font: FontKind): ItemLine<Row>[] {
  const cod = wrapText(item.cProd, colW('cod') - CELL_PAD, 6, false, font)
  const descText = item.infAdProd ? `${item.xProd}\n${item.infAdProd}` : item.xProd
  const desc = wrapText(descText, colW('desc') - CELL_PAD, 6, false, font)
  const n = Math.max(cod.length, desc.length, 1)
  const first: Row = {
    ncm: item.NCM,
    cst: item.cst,
    cfop: item.CFOP,
    un: item.uCom,
    qtd: formatDecimal(item.qCom, 4),
    vun: formatDecimal(item.vUnCom, 4),
    vtot: formatMoney(item.vProd),
    bc: formatMoney(item.vBC),
    vicms: formatMoney(item.vICMS),
    vipi: formatMoney(item.vIPI),
    aicms: formatMoney(item.pICMS),
    aipi: formatMoney(item.pIPI),
  }
  return Array.from({ length: n }, (_, i) => ({
    row: { cod: cod[i] ?? '', desc: desc[i] ?? '', ...(i === 0 ? first : {}) },
    last: i === n - 1,
  }))
}

/** Quadro "Dados dos produtos/serviços": header strip, full-height column rules, rows. */
export function renderItemsQuadro(b: Box, lines: ItemLine<Row>[], ctx: Ctx): string {
  let x = 0
  const rules: string[] = []
  const head = ITEM_COLUMNS.map((c) => {
    if (x > 0) rules.push(`<div class="vl" style="left:${cm(x)}"></div>`)
    x += c.w
    return `<div style="width:${cm(c.w)}">${esc(c.label)}</div>`
  }).join('')
  const rows = lines
    .map(({ row, last }) => {
      const cells = ITEM_COLUMNS.map(
        (c) => `<div class="${c.align === 'right' ? 'r' : ''}" style="width:${cm(c.w)}">${esc(row[c.key] ?? '')}</div>`,
      ).join('')
      return `<div class="row${last ? ' last' : ''}">${cells}</div>`
    })
    .join('')
  return box(
    b,
    'q',
    `${rules.join('')}<div class="qh" style="--hh:${cm(ITENS.headerH)}">${head}</div><div style="--lh:${cm(LINE_H)}">${rows}</div>`,
    ctx,
    ';padding:0',
  )
}
