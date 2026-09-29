import { esc } from '../escape'
import {
  formatBRL,
  formatDecimal,
  formatInt,
  formatMoney,
  maskCep,
  maskDoc,
  maskFone,
  splitDateTime,
} from '../format'
import { ADICIONAIS, DEST, FATURA, IMPOSTO, ISSQN, TRANSP } from '../layout/portrait'
import { LINE_H } from '../layout/paginate'
import type { Endereco, Nfe } from '../model'
import { textWidthCm, wrapText } from '../text'
import { box, field, title, innerWidth, type Ctx } from './dom'

const FRETE: Record<string, string> = {
  '0': '0 - Remetente',
  '1': '1 - Destinatário',
  '2': '2 - Terceiros',
  '3': '3 - Próprio Rem.',
  '4': '4 - Próprio Dest.',
  '9': '9 - Sem transporte',
}

const logradouro = (e: Endereco) => [e.xLgr, e.nro].filter(Boolean).join(', ') + (e.xCpl ? ` - ${e.xCpl}` : '')

export function renderDestinatario(nfe: Nfe, ctx: Ctx): string {
  const d = nfe.dest
  const e = d?.ender
  const saida = splitDateTime(nfe.ide.dhSaiEnt)
  return [
    title(DEST.title, 'Destinatário / Remetente', ctx),
    field(DEST.nome, 'Nome / Razão social', d?.xNome ?? '', ctx),
    field(DEST.cnpj, 'CNPJ / CPF', d ? maskDoc(d.doc) : '', ctx, { bold: true }),
    field(DEST.emissao, 'Data da emissão', splitDateTime(nfe.ide.dhEmi).date, ctx),
    field(DEST.endereco, 'Endereço', e ? logradouro(e) : '', ctx),
    field(DEST.bairro, 'Bairro / Distrito', e?.xBairro ?? '', ctx),
    field(DEST.cep, 'CEP', e ? maskCep(e.CEP) : '', ctx),
    field(DEST.saida, 'Data da entrada / saída', saida.date, ctx, { bold: true }),
    field(DEST.municipio, 'Município', e?.xMun ?? '', ctx),
    field(DEST.fone, 'Fone / Fax', e?.fone ? maskFone(e.fone) : '', ctx),
    field(DEST.uf, 'UF', e?.UF ?? '', ctx),
    field(DEST.ie, 'Inscrição estadual', d?.IE ?? '', ctx),
    field(DEST.hora, 'Hora da entrada / saída', saida.time, ctx, { bold: true }),
  ].join('')
}

/**
 * Fatura/duplicatas: the frame holds two lines at 6pt. Entries that do not fit are returned in
 * `overflow` and printed in Informações Complementares instead (nothing is dropped).
 */
export function fatura(nfe: Nfe, ctx: Ctx): { html: string; overflow: string[] } {
  const parts: string[] = []
  const f = nfe.cobr.fat
  if (f) {
    parts.push(
      `Fatura ${f.nFat}: original ${formatBRL(f.vOrig)}` +
        (Number(f.vDesc) > 0 ? `, desconto ${formatBRL(f.vDesc)}` : '') +
        `, líquido ${formatBRL(f.vLiq)}`,
    )
  }
  for (const d of nfe.cobr.duplicatas) {
    parts.push(`Dup. ${d.nDup} - ${splitDateTime(d.dVenc).date} - ${formatBRL(d.vDup)}`)
  }
  const width = innerWidth(FATURA.box.w)
  const lines: string[] = ['', '']
  const overflow: string[] = []
  let li = 0
  parts.forEach((p, i) => {
    if (overflow.length) return void overflow.push(p)
    const sep = lines[li] ? '   |   ' : ''
    if (textWidthCm(lines[li] + sep + p, 6, false, ctx.font) <= width) {
      lines[li] += sep + p
    } else if (li === 0 && i > 0) {
      li = 1
      lines[1] = p
    } else {
      overflow.push(p)
    }
  })
  const text = lines.filter(Boolean).map(esc).join('<br>')
  const html =
    title(FATURA.title, 'Fatura / Duplicatas', ctx) +
    box(
      FATURA.box,
      'f',
      `<div class="l">Fatura</div><div class="v" style="font-size:6pt;line-height:1.2">${text}</div>`,
      ctx,
    )
  return { html, overflow }
}

export function renderImposto(nfe: Nfe, ctx: Ctx): string {
  const t = nfe.total
  const num = { align: 'right' as const }
  return [
    title(IMPOSTO.title, 'Cálculo do imposto', ctx),
    field(IMPOSTO.bcIcms, 'Base de cálculo do ICMS', formatMoney(t.vBC), ctx, num),
    field(IMPOSTO.icms, 'Valor do ICMS', formatMoney(t.vICMS), ctx, num),
    field(IMPOSTO.bcSt, 'Base de cálculo do ICMS ST', formatMoney(t.vBCST), ctx, num),
    field(IMPOSTO.st, 'Valor do ICMS substituição', formatMoney(t.vST), ctx, num),
    field(IMPOSTO.produtos, 'Valor total dos produtos', formatMoney(t.vProd), ctx, num),
    field(IMPOSTO.frete, 'Valor do frete', formatMoney(t.vFrete), ctx, num),
    field(IMPOSTO.seguro, 'Valor do seguro', formatMoney(t.vSeg), ctx, num),
    field(IMPOSTO.desconto, 'Desconto', formatMoney(t.vDesc), ctx, num),
    field(IMPOSTO.outras, 'Outras despesas acessórias', formatMoney(t.vOutro), ctx, num),
    field(IMPOSTO.ipi, 'Valor do IPI', formatMoney(t.vIPI), ctx, num),
    field(IMPOSTO.total, 'Valor total da nota', formatMoney(t.vNF), ctx, { ...num, bold: true }),
  ].join('')
}

const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))].join(', ')
const sum = (xs: string[]) => xs.reduce((a, b) => a + (Number(b) || 0), 0)

export function renderTransportador(nfe: Nfe, ctx: Ctx): string {
  const t = nfe.transp
  const tr = t.transporta
  const vols = t.volumes
  const qtd = vols.length ? sum(vols.map((v) => v.qVol)) : 0
  const has = (xs: string[]) => xs.some((x) => x !== '')
  return [
    title(TRANSP.title, 'Transportador / Volumes transportados', ctx),
    field(TRANSP.nome, 'Nome / Razão social', tr.xNome, ctx),
    field(TRANSP.frete, 'Frete por conta', FRETE[t.modFrete] ?? t.modFrete, ctx),
    field(TRANSP.antt, 'Código ANTT', t.veic.RNTC, ctx),
    field(TRANSP.placa, 'Placa do veículo', t.veic.placa, ctx),
    field(TRANSP.ufVeic, 'UF', t.veic.UF, ctx),
    field(TRANSP.doc, 'CNPJ / CPF', tr.doc ? maskDoc(tr.doc) : '', ctx),
    field(TRANSP.endereco, 'Endereço', tr.xEnder, ctx),
    field(TRANSP.municipio, 'Município', tr.xMun, ctx),
    field(TRANSP.uf, 'UF', tr.UF, ctx),
    field(TRANSP.ie, 'Inscrição estadual', tr.IE, ctx),
    field(TRANSP.qtd, 'Quantidade', has(vols.map((v) => v.qVol)) ? formatInt(String(qtd)) : '', ctx),
    field(TRANSP.especie, 'Espécie', uniq(vols.map((v) => v.esp)), ctx),
    field(TRANSP.marca, 'Marca', uniq(vols.map((v) => v.marca)), ctx),
    field(TRANSP.numeracao, 'Numeração', uniq(vols.map((v) => v.nVol)), ctx),
    field(TRANSP.pesoB, 'Peso bruto', has(vols.map((v) => v.pesoB)) ? formatDecimal(String(sum(vols.map((v) => v.pesoB))), 3) : '', ctx, { align: 'right' }),
    field(TRANSP.pesoL, 'Peso líquido', has(vols.map((v) => v.pesoL)) ? formatDecimal(String(sum(vols.map((v) => v.pesoL))), 3) : '', ctx, { align: 'right' }),
  ].join('')
}

export function renderIssqn(nfe: Nfe, ctx: Ctx): string {
  const s = nfe.total.issqn
  const money = (v: string) => (v === '' ? '' : formatMoney(v))
  return [
    title(ISSQN.title, 'Cálculo do ISSQN', ctx),
    field(ISSQN.im, 'Inscrição municipal', nfe.emit.IM, ctx),
    field(ISSQN.servicos, 'Valor total dos serviços', money(s.vServ), ctx, { align: 'right' }),
    field(ISSQN.bc, 'Base de cálculo do ISSQN', money(s.vBC), ctx, { align: 'right' }),
    field(ISSQN.iss, 'Valor do ISSQN', money(s.vISS), ctx, { align: 'right' }),
  ].join('')
}

/**
 * Text of Informações Complementares (3.1.8, 3.10.5): infAdFisco + infCpl, plus values the layout
 * has no field for (ICMS desonerado, FCP) and anything that overflowed a fixed-size box.
 */
export function infoLines(nfe: Nfe, extra: string[], homologacao: boolean, ctx: Ctx, widthCm: number): string[] {
  const t = nfe.total
  const paras: string[] = []
  if (homologacao) paras.push('DOCUMENTO EMITIDO EM AMBIENTE DE HOMOLOGAÇÃO - SEM VALOR FISCAL')
  if (nfe.infAdic.infAdFisco) paras.push(nfe.infAdic.infAdFisco)
  if (nfe.infAdic.infCpl) paras.push(nfe.infAdic.infCpl)
  if (Number(t.vICMSDeson) > 0) paras.push(`Valor do ICMS desonerado: ${formatBRL(t.vICMSDeson)}`)
  if (Number(t.vFCP) > 0) paras.push(`Valor total do FCP: ${formatBRL(t.vFCP)}`)
  if (Number(t.vFCPST) > 0) paras.push(`Valor total do FCP ST: ${formatBRL(t.vFCPST)}`)
  paras.push(...extra)
  return paras.flatMap((p) => wrapText(p, widthCm, 6, false, ctx.font))
}

export const INFO_WIDTH = ADICIONAIS.info.w - 0.2

export function renderAdicionais(lines: string[], continues: boolean, ctx: Ctx): string {
  const text = lines.map(esc).join('<br>') + (continues ? '<br><b>CONTINUA NA PRÓXIMA FOLHA</b>' : '')
  return [
    title(ADICIONAIS.title, 'Dados adicionais', ctx),
    box(
      ADICIONAIS.info,
      'f',
      `<div class="l">Informações complementares</div><div class="v" style="font-size:6pt;line-height:${LINE_H}cm">${text}</div>`,
      ctx,
    ),
    box(ADICIONAIS.fisco, 'f', `<div class="l">Reservado ao fisco</div>`, ctx),
  ].join('')
}
