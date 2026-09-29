import { DanfeError } from './errors'
import type { Cobranca, Endereco, Item, Nfe, Protocolo, Totais, Transporte } from './model'

type El = Element | null | undefined

const kids = (el: El, name: string): Element[] =>
  el ? Array.from(el.children).filter((c) => c.localName === name) : []

const kid = (el: El, name: string): Element | null => kids(el, name)[0] ?? null

const path = (el: El, ...names: string[]): Element | null => {
  let cur: El = el
  for (const n of names) {
    cur = kid(cur, n)
    if (!cur) return null
  }
  return cur ?? null
}

/** Text of the element at `names` below `el`; '' when absent. */
const txt = (el: El, ...names: string[]): string => path(el, ...names)?.textContent?.trim() ?? ''

function parseXml(xml: string): Document {
  if (typeof DOMParser === 'undefined') {
    throw new DanfeError('no-dom-parser', 'DOMParser is not available in this environment')
  }
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const root = doc.documentElement
  if (!root || root.localName === 'parsererror' || doc.getElementsByTagName('parsererror').length > 0) {
    throw new DanfeError('invalid-xml', 'The XML could not be parsed')
  }
  return doc
}

function parseEndereco(el: El): Endereco {
  return {
    xLgr: txt(el, 'xLgr'),
    nro: txt(el, 'nro'),
    xCpl: txt(el, 'xCpl'),
    xBairro: txt(el, 'xBairro'),
    cMun: txt(el, 'cMun'),
    xMun: txt(el, 'xMun'),
    UF: txt(el, 'UF'),
    CEP: txt(el, 'CEP'),
    fone: txt(el, 'fone'),
  }
}

const docOf = (el: El) => txt(el, 'CNPJ') || txt(el, 'CPF') || txt(el, 'idEstrangeiro')

function parseItem(det: Element): Item {
  const prod = kid(det, 'prod')
  const imposto = kid(det, 'imposto')
  const icms = kid(imposto, 'ICMS')?.children[0] ?? null
  const ipi = path(imposto, 'IPI', 'IPITrib')
  const cst = txt(icms, 'CST') || txt(icms, 'CSOSN')
  return {
    nItem: det.getAttribute('nItem') ?? '',
    cProd: txt(prod, 'cProd'),
    cEAN: txt(prod, 'cEAN'),
    xProd: txt(prod, 'xProd'),
    NCM: txt(prod, 'NCM'),
    CFOP: txt(prod, 'CFOP'),
    uCom: txt(prod, 'uCom'),
    qCom: txt(prod, 'qCom'),
    vUnCom: txt(prod, 'vUnCom'),
    vProd: txt(prod, 'vProd'),
    vDesc: txt(prod, 'vDesc'),
    infAdProd: txt(det, 'infAdProd'),
    cst: cst ? txt(icms, 'orig') + cst : '',
    vBC: txt(icms, 'vBC'),
    pICMS: txt(icms, 'pICMS'),
    vICMS: txt(icms, 'vICMS'),
    vBCST: txt(icms, 'vBCST'),
    vICMSST: txt(icms, 'vICMSST'),
    vIPI: txt(ipi, 'vIPI'),
    pIPI: txt(ipi, 'pIPI'),
  }
}

function parseTotais(total: El): Totais {
  const t = kid(total, 'ICMSTot')
  const s = kid(total, 'ISSQNtot')
  return {
    vBC: txt(t, 'vBC'),
    vICMS: txt(t, 'vICMS'),
    vICMSDeson: txt(t, 'vICMSDeson'),
    vFCP: txt(t, 'vFCP'),
    vBCST: txt(t, 'vBCST'),
    vST: txt(t, 'vST'),
    vFCPST: txt(t, 'vFCPST'),
    vProd: txt(t, 'vProd'),
    vFrete: txt(t, 'vFrete'),
    vSeg: txt(t, 'vSeg'),
    vDesc: txt(t, 'vDesc'),
    vIPI: txt(t, 'vIPI'),
    vOutro: txt(t, 'vOutro'),
    vNF: txt(t, 'vNF'),
    vTotTrib: txt(t, 'vTotTrib'),
    issqn: { vServ: txt(s, 'vServ'), vBC: txt(s, 'vBC'), vISS: txt(s, 'vISS') },
  }
}

function parseTransp(el: El): Transporte {
  const tr = kid(el, 'transporta')
  const v = kid(el, 'veicTransp')
  return {
    modFrete: txt(el, 'modFrete'),
    transporta: {
      doc: docOf(tr),
      xNome: txt(tr, 'xNome'),
      IE: txt(tr, 'IE'),
      xEnder: txt(tr, 'xEnder'),
      xMun: txt(tr, 'xMun'),
      UF: txt(tr, 'UF'),
    },
    veic: { placa: txt(v, 'placa'), UF: txt(v, 'UF'), RNTC: txt(v, 'RNTC') || txt(el, 'RNTC') },
    volumes: kids(el, 'vol').map((vol) => ({
      qVol: txt(vol, 'qVol'),
      esp: txt(vol, 'esp'),
      marca: txt(vol, 'marca'),
      nVol: txt(vol, 'nVol'),
      pesoL: txt(vol, 'pesoL'),
      pesoB: txt(vol, 'pesoB'),
    })),
  }
}

function parseCobr(el: El): Cobranca {
  const fat = kid(el, 'fat')
  return {
    fat: fat
      ? { nFat: txt(fat, 'nFat'), vOrig: txt(fat, 'vOrig'), vDesc: txt(fat, 'vDesc'), vLiq: txt(fat, 'vLiq') }
      : null,
    duplicatas: kids(el, 'dup').map((d) => ({ nDup: txt(d, 'nDup'), dVenc: txt(d, 'dVenc'), vDup: txt(d, 'vDup') })),
  }
}

function parseProt(el: El): Protocolo | null {
  const inf = kid(el, 'infProt')
  if (!inf) return null
  return { nProt: txt(inf, 'nProt'), dhRecbto: txt(inf, 'dhRecbto'), cStat: txt(inf, 'cStat'), tpAmb: txt(inf, 'tpAmb') }
}

/** Parse an <nfeProc> or bare <NFe> document. Throws DanfeError otherwise. */
export function parseNfe(xml: string): Nfe {
  const doc = parseXml(xml)
  const root = doc.documentElement
  let nfe: El
  let protEl: El = null
  if (root.localName === 'nfeProc') {
    nfe = kid(root, 'NFe')
    protEl = kid(root, 'protNFe')
  } else if (root.localName === 'NFe') {
    nfe = root
  }
  const inf = kid(nfe, 'infNFe')
  if (!nfe || !inf) {
    throw new DanfeError('unsupported-document', `Expected an NF-e (nfeProc/NFe), got <${root.localName}>`)
  }

  const ide = kid(inf, 'ide')
  const emit = kid(inf, 'emit')
  const dest = kid(inf, 'dest')
  const infAdic = kid(inf, 'infAdic')
  const chave = (inf.getAttribute('Id') ?? '').replace(/^NFe/, '') || txt(protEl, 'infProt', 'chNFe')

  const dSaiEnt = txt(ide, 'dSaiEnt')
  const hSaiEnt = txt(ide, 'hSaiEnt')

  return {
    chave,
    versao: inf.getAttribute('versao') ?? '',
    ide: {
      cUF: txt(ide, 'cUF'),
      natOp: txt(ide, 'natOp'),
      mod: txt(ide, 'mod'),
      serie: txt(ide, 'serie'),
      nNF: txt(ide, 'nNF'),
      dhEmi: txt(ide, 'dhEmi') || txt(ide, 'dEmi'),
      dhSaiEnt: txt(ide, 'dhSaiEnt') || (dSaiEnt && hSaiEnt ? `${dSaiEnt}T${hSaiEnt}` : dSaiEnt),
      tpNF: txt(ide, 'tpNF'),
      tpEmis: txt(ide, 'tpEmis'),
      tpAmb: txt(ide, 'tpAmb'),
    },
    emit: {
      doc: docOf(emit),
      xNome: txt(emit, 'xNome'),
      xFant: txt(emit, 'xFant'),
      ender: parseEndereco(kid(emit, 'enderEmit')),
      IE: txt(emit, 'IE'),
      IEST: txt(emit, 'IEST'),
      IM: txt(emit, 'IM'),
    },
    dest: dest
      ? { doc: docOf(dest), xNome: txt(dest, 'xNome'), ender: parseEndereco(kid(dest, 'enderDest')), IE: txt(dest, 'IE') }
      : null,
    itens: kids(inf, 'det').map(parseItem),
    total: parseTotais(kid(inf, 'total')),
    transp: parseTransp(kid(inf, 'transp')),
    cobr: parseCobr(kid(inf, 'cobr')),
    infAdic: {
      infAdFisco: txt(infAdic, 'infAdFisco'),
      infCpl: txt(infAdic, 'infCpl'),
      obsCont: kids(infAdic, 'obsCont').map((o) => ({ xCampo: o.getAttribute('xCampo') ?? '', xTexto: txt(o, 'xTexto') })),
    },
    prot: parseProt(protEl),
  }
}
