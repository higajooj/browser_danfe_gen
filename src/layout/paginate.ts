import { ADICIONAIS, CONTENT_BOTTOM, CONTINUATION_DY, HEADER, ITENS, TITLE_H } from './portrait'

/** Height of one printed text line of the product table / informações complementares (6pt). */
export const LINE_H = 0.27
/** Height reserved for the title + frame of a continuation box. */
const CONT_BOX_OVERHEAD = 0.55

export interface ItemLine<T> {
  /** Payload for the row (cells for the first line of an item, text-only for continuation lines). */
  row: T
  /** Last printed line of the item: a divider is drawn under it (3.1.7). */
  last: boolean
}

export interface Page<T> {
  /** 1-based sheet number. */
  folha: number
  lines: ItemLine<T>[]
  /** Informações complementares lines printed on this sheet below the items (continuation). */
  infLines: string[]
}

export interface PaginationInput<T> {
  itemLines: ItemLine<T>[]
  infLines: string[]
}

export interface Pagination<T> {
  pages: Page<T>[]
  /** Lines of informações complementares that fit in the first sheet's box. */
  firstInfLines: string[]
  /** True when the first sheet's box must say CONTINUA NA PRÓXIMA FOLHA. */
  infContinues: boolean
  itemsCapacityFirst: number
  itemsCapacityNext: number
}

export const firstSheetItemCapacity = (): number =>
  Math.floor((ITENS.quadro.h - ITENS.headerH) / LINE_H)

/** Vertical space of the items quadro on a continuation sheet (no canhoto, no totals blocks). */
export const continuationQuadroTop = (): number => HEADER.end + CONTINUATION_DY + TITLE_H
export const continuationQuadroHeight = (): number => CONTENT_BOTTOM - continuationQuadroTop()

export const nextSheetItemCapacity = (): number =>
  Math.floor((continuationQuadroHeight() - ITENS.headerH) / LINE_H)

export const firstSheetInfCapacity = (): number =>
  Math.floor((ADICIONAIS.info.h - 0.3) / LINE_H)

/**
 * Split product lines (and overflowing informações complementares) over as many sheets as needed.
 * Pure function of the pre-wrapped lines: no DOM measurement, so the total of sheets ("FOLHA n/N")
 * is known before anything is rendered.
 */
export function paginate<T>(input: PaginationInput<T>): Pagination<T> {
  const cap1 = firstSheetItemCapacity()
  const capN = nextSheetItemCapacity()

  // Informações complementares: box of the first sheet, minus one line for CONTINUA NA PRÓXIMA FOLHA.
  const infCap = firstSheetInfCapacity()
  const infContinues = input.infLines.length > infCap
  const firstInfLines = infContinues ? input.infLines.slice(0, infCap - 1) : input.infLines
  let infRest = infContinues ? input.infLines.slice(infCap - 1) : []

  const pages: Page<T>[] = []
  let cursor = 0
  const take = (n: number) => {
    const chunk = input.itemLines.slice(cursor, cursor + n)
    cursor += chunk.length
    return chunk
  }

  pages.push({ folha: 1, lines: take(cap1), infLines: [] })
  while (cursor < input.itemLines.length) {
    pages.push({ folha: pages.length + 1, lines: take(capN), infLines: [] })
  }

  // Overflowing informações complementares go below the items of the last sheet if there is room,
  // otherwise on further sheets (3.1.8: "no quadro Dados dos Produtos/Serviços" of the next sheet).
  const overhead = Math.ceil(CONT_BOX_OVERHEAD / LINE_H)
  while (infRest.length > 0) {
    const last = pages[pages.length - 1] as Page<T>
    const room = capN - last.lines.length - overhead
    if (last.folha === 1 || room < 2) {
      pages.push({ folha: pages.length + 1, lines: [], infLines: [] })
      continue
    }
    last.infLines = infRest.slice(0, room)
    infRest = infRest.slice(room)
  }

  return {
    pages,
    firstInfLines,
    infContinues,
    itemsCapacityFirst: cap1,
    itemsCapacityNext: capN,
  }
}
