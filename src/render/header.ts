import { barcodeSvg } from '../barcode/code128c'
import { esc } from '../escape'
import {
  formatBRL,
  formatNumero,
  formatSerie,
  groupChave,
  maskDoc,
  splitDateTime,
  maskFone,
  maskCep,
} from '../format'
import { contingencyData, ufCode } from '../key'
import { CANHOTO, HEADER } from '../layout/portrait'
import type { Nfe } from '../model'
import type { DanfeOptions } from '../options'
import { wrapText } from '../text'
import { box, field, innerWidth, cm, type Ctx } from './dom'

function enderecoLinhas(nfe: Nfe): string[] {
  const e = nfe.emit.ender
  const rua = [e.xLgr, e.nro].filter(Boolean).join(', ') + (e.xCpl ? ` - ${e.xCpl}` : '')
  const cidade = [e.xBairro, e.xMun && e.UF ? `${e.xMun} - ${e.UF}` : e.xMun || e.UF].filter(Boolean).join(' - ')
  return [rua, cidade, e.CEP ? `CEP: ${maskCep(e.CEP)}` : '', e.fone ? `Fone: ${maskFone(e.fone)}` : ''].filter(Boolean)
}

function safeLogo(uri: string | undefined): string | undefined {
  return uri && /^data:image\/(png|jpe?g|gif|svg\+xml|webp);/i.test(uri) ? uri : undefined
}

/** Canhoto (3.3.1): receipt stub. First sheet only. */
export function renderCanhoto(nfe: Nfe, ctx: Ctx): string {
  const total = formatBRL(nfe.total.vNF)
  const emissao = splitDateTime(nfe.ide.dhEmi).date
  const dest = nfe.dest ? `${nfe.dest.xNome}` : ''
  const l1 = `RECEBEMOS DE ${nfe.emit.xNome} OS PRODUTOS E/OU SERVIÇOS CONSTANTES DA NOTA FISCAL ELETRÔNICA INDICADA AO LADO`
  const l2 = `EMISSÃO: ${emissao}   VALOR TOTAL: ${total}   DESTINATÁRIO: ${dest}`
  const w = CANHOTO.recebemos.w - 0.3
  const lines = [...wrapText(l1, w, 6, false, ctx.font), ...wrapText(l2, w, 6, false, ctx.font)].slice(0, 3)
  return [
    box(CANHOTO.recebemos, '', `<div class="txt6">${lines.map(esc).join('<br>')}</div>`, ctx),
    box(
      CANHOTO.nfe,
      '',
      `<div class="canh-nfe"><div class="n">NF-e</div><div class="n">Nº ${esc(formatNumero(nfe.ide.nNF))}</div>` +
        `<div class="n">SÉRIE ${esc(formatSerie(nfe.ide.serie))}</div></div>`,
      ctx,
    ),
    field(CANHOTO.data, 'Data de recebimento', '', ctx),
    field(CANHOTO.assinatura, 'Identificação e assinatura do recebedor', '', ctx),
    `<div class="cut" style="top:${cm(CANHOTO.cutY + ctx.dy)}"></div>`,
  ].join('')
}

function renderEmitente(nfe: Nfe, ctx: Ctx, opts: DanfeOptions): string {
  const logo = safeLogo(opts.logoDataUri)
  const textW = HEADER.emitente.w - 0.4 - (logo ? 3.65 : 0)
  const nome = wrapText(nfe.emit.xNome, textW, 12, true, ctx.font)
  const end = enderecoLinhas(nfe).flatMap((l) => wrapText(l, textW, 8, true, ctx.font))
  return box(
    HEADER.emitente,
    '',
    `<div class="emit">${logo ? `<img alt="" src="${esc(logo)}">` : ''}<div class="txt">` +
      `<div class="nome">${nome.map(esc).join('<br>')}</div>` +
      `<div class="end">${end.map(esc).join('<br>')}</div></div></div>`,
    ctx,
  )
}

function renderDanfeBox(nfe: Nfe, ctx: Ctx, folha: number, folhas: number): string {
  return box(
    HEADER.danfe,
    '',
    `<div class="dnf"><div class="t1">DANFE</div>` +
      `<div class="doc">DOCUMENTO<br>AUXILIAR DA<br>NOTA FISCAL<br>ELETRÔNICA</div>` +
      `<div class="io"><div class="lb">0 - ENTRADA<br>1 - SAÍDA</div><div class="sq">${esc(nfe.ide.tpNF)}</div></div>` +
      `<div class="num"><small>Nº</small> ${esc(formatNumero(nfe.ide.nNF))}<br>` +
      `<small>SÉRIE</small> ${esc(formatSerie(nfe.ide.serie))}<br>` +
      `<small>FOLHA</small> ${String(folha).padStart(2, '0')}/${String(folhas).padStart(2, '0')}</div></div>`,
    ctx,
  )
}

/** Data for the FS / FS-DA additional barcode (3.9.2). */
function contingencyBarcodeData(nfe: Nfe): string {
  const uf = nfe.dest?.ender.UF ?? ''
  const foreign = !nfe.dest || uf === 'EX' || !ufCode(uf)
  const day = Number(splitDateTime(nfe.ide.dhEmi).date.slice(0, 2)) || 1
  return contingencyData({
    cUF: foreign ? '99' : (ufCode(uf) as string),
    tpEmis: nfe.ide.tpEmis,
    doc: foreign ? '' : (nfe.dest?.doc ?? ''),
    vNF: nfe.total.vNF || '0',
    icmsProprio: Number(nfe.total.vICMS) > 0,
    icmsST: Number(nfe.total.vST) > 0,
    day,
  })
}

/** Campo 1 / Campo 2 (3.9) - content depends on the emission type. */
function renderVariable(nfe: Nfe, ctx: Ctx, opts: DanfeOptions): string {
  const tpEmis = nfe.ide.tpEmis
  if (tpEmis === '2' || tpEmis === '5') {
    const data = contingencyBarcodeData(nfe)
    const svg = barcodeSvg(data, { widthCm: 7.4, heightCm: 1.0, label: 'Dados da NF-e' })
    return (
      box(HEADER.campo1, 'bc', svg, ctx) +
      field(HEADER.campo2, 'Dados da NF-e', groupChave(data), ctx, { bold: true, align: 'center' })
    )
  }

  const epec = tpEmis === '4'
  const prot = opts.protocol
    ? { nProt: opts.protocol.nProt, dt: opts.protocol.dateTime }
    : nfe.prot
      ? { nProt: nfe.prot.nProt, dt: nfe.prot.dhRecbto }
      : null
  const site = epec
    ? ['Consulta de autenticidade no portal da NF-e', 'www.nfe.fazenda.gov.br/portal']
    : ['Consulta de autenticidade no portal nacional da NF-e', 'www.nfe.fazenda.gov.br/portal ou no site da Sefaz Autorizadora']
  const w = innerWidth(HEADER.campo1.w)
  const msg = site.flatMap((l) => wrapText(l, w, 8, false, ctx.font)).map(esc).join('<br>')
  const label = epec ? 'Protocolo de autorização do EPEC' : 'Protocolo de autorização de uso'
  let value = 'NF-e sem protocolo de autorização'
  if (prot) {
    const { date, time } = splitDateTime(prot.dt)
    value = [prot.nProt, date, time].filter(Boolean).join(' ')
  }
  return (
    box(HEADER.campo1, '', `<div class="msg">${msg}</div>`, ctx) +
    field(HEADER.campo2, label, value, ctx, { bold: true, align: 'center' })
  )
}

/** Identification block repeated on every sheet (3.5). */
export function renderHeader(nfe: Nfe, ctx: Ctx, opts: DanfeOptions, folha: number, folhas: number): string {
  const svg = barcodeSvg(nfe.chave, { widthCm: 7.9, heightCm: 1.0, label: `Chave de acesso ${nfe.chave}` })
  const ie = (v: string) => v
  const cnpj = maskDoc(nfe.emit.doc)
  return [
    renderEmitente(nfe, ctx, opts),
    renderDanfeBox(nfe, ctx, folha, folhas),
    box(HEADER.barcode, 'bc', svg, ctx),
    field(HEADER.chave, 'Chave de acesso', groupChave(nfe.chave), ctx, { bold: true, align: 'center', minPt: 7 }),
    renderVariable(nfe, ctx, opts),
    field(HEADER.natureza, 'Natureza da operação', nfe.ide.natOp, ctx),
    field(HEADER.ie, 'Inscrição estadual', ie(nfe.emit.IE), ctx),
    field(HEADER.iest, 'Inscrição estadual do subst. trib.', ie(nfe.emit.IEST), ctx),
    field(HEADER.cnpj, 'CNPJ / CPF', cnpj, ctx),
  ].join('')
}

