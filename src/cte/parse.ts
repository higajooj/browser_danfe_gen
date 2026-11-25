import { DanfeError } from '../errors'
import { docOf, kid, kids, parseEndereco, parseProt, parseXml, path, txt, type El } from '../parse'
import type {
  Cte,
  CteComponente,
  CteDocAnterior,
  CteDocOriginario,
  CteDocRefOS,
  CteEndereco,
  CteIcms,
  CteIcmsUfFim,
  CteKind,
  CteModal,
  CteModalAereo,
  CteModalAquav,
  CteModalDuto,
  CteModalFerrov,
  CteModalMultimodal,
  CteModalRodo,
  CteModalRodoOS,
  CteParte,
  CteSeguro,
  CteSimpDet,
  CteTribFed,
} from './model'

function parseCteEndereco(el: El): CteEndereco {
  return { ...parseEndereco(el), xPais: txt(el, 'xPais') }
}

function parseParte(el: El, enderTag: string): CteParte | null {
  if (!el) return null
  return {
    doc: docOf(el),
    IE: txt(el, 'IE'),
    xNome: txt(el, 'xNome'),
    xFant: txt(el, 'xFant'),
    fone: txt(el, 'fone') || txt(el, enderTag, 'fone'),
    ISUF: txt(el, 'ISUF'),
    ender: parseCteEndereco(kid(el, enderTag)),
  }
}

function parseIcms(imp: El): CteIcms {
  const grp = kid(imp, 'ICMS')?.children[0] ?? null
  const kind = grp?.localName ?? ''
  const vICMS = txt(grp, 'vICMS') || txt(grp, 'vICMSSTRet') || txt(grp, 'vICMSOutraUF')
  return {
    kind,
    CST: txt(grp, 'CST'),
    vBC: txt(grp, 'vBC') || txt(grp, 'vBCSTRet') || txt(grp, 'vBCOutraUF'),
    pICMS: txt(grp, 'pICMS') || txt(grp, 'pICMSSTRet') || txt(grp, 'pICMSOutraUF'),
    vICMS,
    pRedBC: txt(grp, 'pRedBC') || txt(grp, 'pRedBCOutraUF'),
    vCred: txt(grp, 'vCred'),
    vICMSDeson: txt(grp, 'vICMSDeson'),
    cBenef: txt(grp, 'cBenef'),
    // MOC 2.19.2: own ICMS is highlighted when vICMS exists under ICMS00, ICMS20 or ICMS90.
    icmsProprio: (kind === 'ICMS00' || kind === 'ICMS20' || kind === 'ICMS90') && txt(grp, 'vICMS') !== '',
    // MOC 2.19.2: ST ICMS is highlighted when ICMS60 (vICMSSTRet) is used.
    icmsST: kind === 'ICMS60' && txt(grp, 'vICMSSTRet') !== '',
  }
}

function parseIcmsUfFim(imp: El): CteIcmsUfFim | null {
  const el = kid(imp, 'ICMSUFFim')
  if (!el) return null
  return {
    vBCUFFim: txt(el, 'vBCUFFim'),
    pFCPUFFim: txt(el, 'pFCPUFFim'),
    pICMSUFFim: txt(el, 'pICMSUFFim'),
    pICMSInter: txt(el, 'pICMSInter'),
    vFCPUFFim: txt(el, 'vFCPUFFim'),
    vICMSUFFim: txt(el, 'vICMSUFFim'),
    vICMSUFIni: txt(el, 'vICMSUFIni'),
  }
}

function parseTribFed(imp: El): CteTribFed | null {
  const el = kid(imp, 'infTribFed')
  if (!el) return null
  return {
    vPIS: txt(el, 'vPIS'),
    vCOFINS: txt(el, 'vCOFINS'),
    vIR: txt(el, 'vIR'),
    vINSS: txt(el, 'vINSS'),
    vCSLL: txt(el, 'vCSLL'),
  }
}

function parseDocs(infDoc: El): CteDocOriginario[] {
  if (!infDoc) return []
  const out: CteDocOriginario[] = []
  for (const el of Array.from(infDoc.children)) {
    switch (el.localName) {
      case 'infNFe':
        out.push({ kind: 'NFe', chave: txt(el, 'chave'), PIN: txt(el, 'PIN'), dPrev: txt(el, 'dPrev') })
        break
      case 'infNF':
        out.push({
          kind: 'NF',
          mod: txt(el, 'mod'),
          serie: txt(el, 'serie'),
          nDoc: txt(el, 'nDoc'),
          dEmi: txt(el, 'dEmi'),
          vNF: txt(el, 'vNF'),
        })
        break
      case 'infOutros':
        out.push({
          kind: 'Outros',
          tpDoc: txt(el, 'tpDoc'),
          descOutros: txt(el, 'descOutros'),
          nDoc: txt(el, 'nDoc'),
          dEmi: txt(el, 'dEmi'),
          vDocFisc: txt(el, 'vDocFisc'),
        })
        break
      case 'infDCe':
        out.push({ kind: 'DCe', chave: txt(el, 'chave') || txt(el, 'chDCe') })
        break
    }
  }
  return out
}

function parseDocsAnt(docAnt: El): CteDocAnterior[] {
  const out: CteDocAnterior[] = []
  for (const emi of kids(docAnt, 'emiDocAnt')) {
    const emiDoc = docOf(emi)
    const emiNome = txt(emi, 'xNome')
    for (const id of kids(emi, 'idDocAnt')) {
      for (const ele of kids(id, 'idDocAntEle')) {
        out.push({ emiDoc, emiNome, chCTe: txt(ele, 'chCTe') || txt(ele, 'chave'), tpDoc: '', serie: '', nDoc: '' })
      }
      for (const pap of kids(id, 'idDocAntPap')) {
        out.push({
          emiDoc,
          emiNome,
          chCTe: '',
          tpDoc: txt(pap, 'tpDoc'),
          serie: txt(pap, 'serie'),
          nDoc: txt(pap, 'nDoc'),
        })
      }
    }
  }
  return out
}

function parseModal(infModal: El): CteModal | null {
  const rodo = kid(infModal, 'rodo')
  if (rodo) {
    const m: CteModalRodo = {
      kind: 'rodo',
      RNTRC: txt(rodo, 'RNTRC'),
      occ: kids(rodo, 'occ').map((o) => ({
        serie: txt(o, 'serie'),
        nOcc: txt(o, 'nOcc'),
        dEmi: txt(o, 'dEmi'),
        CNPJ: txt(o, 'emiOcc', 'CNPJ'),
        IE: txt(o, 'emiOcc', 'IE'),
        UF: txt(o, 'emiOcc', 'UF'),
      })),
    }
    return m
  }
  const rodoOS = kid(infModal, 'rodoOS')
  if (rodoOS) {
    const veicEl = kid(rodoOS, 'veic')
    const propEl = kid(veicEl, 'prop')
    const fret = kid(rodoOS, 'infFretamento')
    const m: CteModalRodoOS = {
      kind: 'rodoOS',
      TAF: txt(rodoOS, 'TAF'),
      NroRegEstadual: txt(rodoOS, 'NroRegEstadual'),
      veic: veicEl
        ? {
            placa: txt(veicEl, 'placa'),
            RENAVAM: txt(veicEl, 'RENAVAM'),
            UF: txt(veicEl, 'UF'),
            prop: propEl
              ? {
                  doc: docOf(propEl),
                  TAF: txt(propEl, 'TAF'),
                  NroRegEstadual: txt(propEl, 'NroRegEstadual'),
                  xNome: txt(propEl, 'xNome'),
                  IE: txt(propEl, 'IE'),
                  UF: txt(propEl, 'UF'),
                  tpProp: txt(propEl, 'tpProp'),
                }
              : null,
          }
        : null,
      tpFretamento: txt(fret, 'tpFretamento'),
      dhViagem: txt(fret, 'dhViagem'),
    }
    return m
  }
  const aereo = kid(infModal, 'aereo')
  if (aereo) {
    const nat = kid(aereo, 'natCarga')
    const tar = kid(aereo, 'tarifa')
    const m: CteModalAereo = {
      kind: 'aereo',
      nMinu: txt(aereo, 'nMinu'),
      nOCA: txt(aereo, 'nOCA'),
      dPrevAereo: txt(aereo, 'dPrevAereo'),
      xDime: txt(nat, 'xDime'),
      cInfManu: kids(nat, 'cInfManu').map((c) => c.textContent?.trim() ?? '').filter(Boolean),
      CL: txt(tar, 'CL'),
      cTar: txt(tar, 'cTar'),
      vTar: txt(tar, 'vTar'),
      peri: kids(aereo, 'peri').map((p) => ({
        nONU: txt(p, 'nONU'),
        qTotEmb: txt(p, 'qTotEmb'),
        qTotProd: txt(p, 'infTotAP', 'qTotProd'),
        uniAP: txt(p, 'infTotAP', 'uniAP'),
      })),
    }
    return m
  }
  const aquav = kid(infModal, 'aquav')
  if (aquav) {
    const m: CteModalAquav = {
      kind: 'aquav',
      vPrest: txt(aquav, 'vPrest'),
      vAFRMM: txt(aquav, 'vAFRMM'),
      xNavio: txt(aquav, 'xNavio'),
      balsas: kids(aquav, 'balsa').map((b) => txt(b, 'xBalsa')).filter(Boolean),
      nViag: txt(aquav, 'nViag'),
      direc: txt(aquav, 'direc'),
      irin: txt(aquav, 'irin'),
      tpNav: txt(aquav, 'tpNav'),
      detCont: kids(aquav, 'detCont').map((c) => {
        const doc = kid(c, 'infDoc')
        return {
          nCont: txt(c, 'nCont'),
          lacres: kids(c, 'lacre').map((l) => txt(l, 'nLacre')).filter(Boolean),
          nfes: kids(doc, 'infNFe').map((n) => txt(n, 'chave')).filter(Boolean),
          nfs: kids(doc, 'infNF').map((n) => ({ serie: txt(n, 'serie'), nDoc: txt(n, 'nDoc') })),
        }
      }),
    }
    return m
  }
  const ferrov = kid(infModal, 'ferrov')
  if (ferrov) {
    const tm = kid(ferrov, 'trafMut')
    const m: CteModalFerrov = {
      kind: 'ferrov',
      tpTraf: txt(ferrov, 'tpTraf'),
      fluxo: txt(ferrov, 'fluxo'),
      respFat: txt(tm, 'respFat'),
      ferrEmi: txt(tm, 'ferrEmi'),
      vFrete: txt(tm, 'vFrete') || txt(ferrov, 'vFrete'),
      chCTeFerroOrigem: txt(tm, 'chCTeFerroOrigem'),
      ferroEnv: kids(tm, 'ferroEnv').map((f) => ({
        CNPJ: txt(f, 'CNPJ'),
        cInt: txt(f, 'cInt'),
        IE: txt(f, 'IE'),
        xNome: txt(f, 'xNome'),
      })),
    }
    return m
  }
  const duto = kid(infModal, 'duto')
  if (duto) {
    const m: CteModalDuto = {
      kind: 'duto',
      vTar: txt(duto, 'vTar'),
      dIni: txt(duto, 'dIni'),
      dFim: txt(duto, 'dFim'),
    }
    return m
  }
  const multi = kid(infModal, 'multimodal')
  if (multi) {
    const seg = kid(multi, 'seg')
    const m: CteModalMultimodal = {
      kind: 'multimodal',
      COTM: txt(multi, 'COTM'),
      indNegociavel: txt(multi, 'indNegociavel'),
      seg: seg
        ? {
            respSeg: '',
            xSeg: txt(seg, 'infSeg', 'xSeg'),
            CNPJ: txt(seg, 'infSeg', 'CNPJ'),
            nApol: txt(seg, 'nApol'),
            nAver: txt(seg, 'nAver'),
          }
        : null,
    }
    return m
  }
  return null
}

function parseCobr(el: El) {
  const fat = kid(el, 'fat')
  return {
    fat: fat
      ? { nFat: txt(fat, 'nFat'), vOrig: txt(fat, 'vOrig'), vDesc: txt(fat, 'vDesc'), vLiq: txt(fat, 'vLiq') }
      : null,
    duplicatas: kids(el, 'dup').map((d) => ({ nDup: txt(d, 'nDup'), dVenc: txt(d, 'dVenc'), vDup: txt(d, 'vDup') })),
  }
}

/** Parse an already-loaded CT-e, CT-e OS or CT-e Simplificado XML document. Throws DanfeError otherwise. */
export function parseCteDocument(doc: Document): Cte {
  const root = doc.documentElement
  let cteEl: El = null
  let protEl: El = null
  let kind: CteKind = 'cte'

  switch (root.localName) {
    case 'cteProc':
      cteEl = kid(root, 'CTe')
      protEl = kid(root, 'protCTe')
      kind = 'cte'
      break
    case 'CTe':
      cteEl = root
      kind = 'cte'
      break
    case 'cteOSProc':
      cteEl = kid(root, 'CTeOS')
      protEl = kid(root, 'protCTe')
      kind = 'cteOS'
      break
    case 'CTeOS':
      cteEl = root
      kind = 'cteOS'
      break
    case 'cteSimpProc':
      cteEl = kid(root, 'CTeSimp')
      protEl = kid(root, 'protCTe')
      kind = 'cteSimp'
      break
    case 'CTeSimp':
      cteEl = root
      kind = 'cteSimp'
      break
    default:
      throw new DanfeError(
        'unsupported-document',
        `Expected a CT-e (cteProc/CTe, cteOSProc/CTeOS or cteSimpProc/CTeSimp), got <${root.localName}>`,
      )
  }

  const inf = kid(cteEl, 'infCte') ?? kid(cteEl, 'infCTe')
  if (!cteEl || !inf) {
    throw new DanfeError(
      'unsupported-document',
      `Expected a CT-e (cteProc/CTe, cteOSProc/CTeOS or cteSimpProc/CTeSimp), got <${root.localName}>`,
    )
  }

  const ide = kid(inf, 'ide')
  const mod = txt(ide, 'mod')
  if (mod === '67') kind = 'cteOS'

  const compl = kid(inf, 'compl')
  const fluxo = kid(compl, 'fluxo')
  const emit = kid(inf, 'emit')
  const rem = parseParte(kid(inf, 'rem'), 'enderReme')
  const exped = parseParte(kid(inf, 'exped'), 'enderExped')
  const receb = parseParte(kid(inf, 'receb'), 'enderReceb')
  const dest = parseParte(kid(inf, 'dest'), 'enderDest')

  const toma3 = kid(ide, 'toma3') ?? kid(ide, 'toma03')
  const toma4 = kid(ide, 'toma4')
  const tomaDirect = kid(inf, 'toma')
  let tomaTipo = txt(toma3, 'toma') || txt(toma4, 'toma') || txt(tomaDirect, 'toma')
  let toma: CteParte | null = null
  if (tomaDirect) {
    toma = parseParte(tomaDirect, 'enderToma')
  } else if (toma4) {
    toma = parseParte(toma4, 'enderToma')
    if (!tomaTipo) tomaTipo = '4'
  } else if (tomaTipo) {
    const map: Record<string, CteParte | null> = { '0': rem, '1': exped, '2': receb, '3': dest }
    toma = map[tomaTipo] ?? null
  }

  const imp = kid(inf, 'imp')
  const norm = kid(inf, 'infCTeNorm')
  const simpDets: CteSimpDet[] =
    kind === 'cteSimp'
      ? kids(inf, 'det').map((d) => ({
          nItem: d.getAttribute('nItem') ?? '',
          xMunIni: txt(d, 'xMunIni'),
          xMunFim: txt(d, 'xMunFim'),
          vPrest: txt(d, 'vPrest'),
          vRec: txt(d, 'vRec'),
          nfes: kids(d, 'infNFe').map((n) => txt(n, 'chNFe') || txt(n, 'chave')).filter(Boolean),
          docsAnt: kids(d, 'infDocAnt').map((a) => txt(a, 'chCTe')).filter(Boolean),
        }))
      : []

  const vPrestEl = kid(inf, 'vPrest')
  const totalEl = kid(inf, 'total')
  let comp: CteComponente[] = kids(vPrestEl, 'Comp').map((c) => ({ xNome: txt(c, 'xNome'), vComp: txt(c, 'vComp') }))
  if (kind === 'cteSimp' && comp.length === 0) {
    comp = kids(inf, 'det').flatMap((d) =>
      kids(d, 'Comp').map((c) => ({ xNome: txt(c, 'xNome'), vComp: txt(c, 'vComp') })),
    )
  }

  const cargaEl = kid(norm, 'infCarga') ?? kid(inf, 'infCarga')
  const servEl = kid(norm, 'infServico')
  const modalEl = kid(norm, 'infModal') ?? kid(inf, 'infModal')
  const subEl = kid(norm, 'infCteSub') ?? kid(inf, 'infCteSub')
  const cobrEl = kid(norm, 'cobr') ?? kid(inf, 'cobr')

  const docs: CteDocOriginario[] =
    kind === 'cteSimp'
      ? simpDets.flatMap((d) => d.nfes.map((chave): CteDocOriginario => ({ kind: 'NFe', chave, PIN: '', dPrev: '' })))
      : parseDocs(kid(norm, 'infDoc'))

  const docsAnt: CteDocAnterior[] =
    kind === 'cteSimp'
      ? simpDets.flatMap((d) =>
          d.docsAnt.map((chCTe): CteDocAnterior => ({ emiDoc: '', emiNome: '', chCTe, tpDoc: '', serie: '', nDoc: '' })),
        )
      : parseDocsAnt(kid(norm, 'docAnt'))

  const docsRefOS: CteDocRefOS[] = kids(norm, 'infDocRef').map((d) => ({
    nDoc: txt(d, 'nDoc'),
    serie: txt(d, 'serie'),
    subserie: txt(d, 'subserie'),
    dEmi: txt(d, 'dEmi'),
    vDoc: txt(d, 'vDoc'),
    chBPe: txt(d, 'chBPe'),
  }))

  const seguros: CteSeguro[] = kids(norm, 'seg').map((s) => ({
    respSeg: txt(s, 'respSeg'),
    xSeg: txt(s, 'xSeg'),
    CNPJ: txt(s, 'CNPJ'),
    nApol: txt(s, 'nApol'),
    nAver: txt(s, 'nAver'),
  }))

  const chave = (inf.getAttribute('Id') ?? '').replace(/^CTe/, '') || txt(protEl, 'infProt', 'chCTe')

  return {
    kind,
    chave,
    versao: inf.getAttribute('versao') ?? '',
    ide: {
      cUF: txt(ide, 'cUF'),
      CFOP: txt(ide, 'CFOP'),
      natOp: txt(ide, 'natOp'),
      mod,
      serie: txt(ide, 'serie'),
      nCT: txt(ide, 'nCT'),
      dhEmi: txt(ide, 'dhEmi'),
      tpImp: txt(ide, 'tpImp'),
      tpEmis: txt(ide, 'tpEmis'),
      tpAmb: txt(ide, 'tpAmb'),
      tpCTe: txt(ide, 'tpCTe'),
      indGlobalizado: txt(ide, 'indGlobalizado'),
      modal: txt(ide, 'modal'),
      tpServ: txt(ide, 'tpServ'),
      cMunIni: txt(ide, 'cMunIni'),
      xMunIni: txt(ide, 'xMunIni'),
      UFIni: txt(ide, 'UFIni'),
      cMunFim: txt(ide, 'cMunFim'),
      xMunFim: txt(ide, 'xMunFim'),
      UFFim: txt(ide, 'UFFim'),
      retira: txt(ide, 'retira'),
      xDetRetira: txt(ide, 'xDetRetira'),
      indIEToma: txt(ide, 'indIEToma') || txt(tomaDirect, 'indIEToma'),
      tomaTipo,
      percurso: kids(ide, 'infPercurso').map((p) => txt(p, 'UFPer')).filter(Boolean),
      dhCont: txt(ide, 'dhCont'),
      xJust: txt(ide, 'xJust'),
    },
    compl: {
      xCaracAd: txt(compl, 'xCaracAd'),
      xCaracSer: txt(compl, 'xCaracSer'),
      xEmi: txt(compl, 'xEmi'),
      fluxo: {
        xOrig: txt(fluxo, 'xOrig'),
        xPass: kids(fluxo, 'pass').map((p) => txt(p, 'xPass')).filter(Boolean),
        xDest: txt(fluxo, 'xDest'),
        xRota: txt(fluxo, 'xRota'),
      },
      xObs: txt(compl, 'xObs'),
      obsCont: kids(compl, 'ObsCont').map((o) => ({ xCampo: o.getAttribute('xCampo') ?? '', xTexto: txt(o, 'xTexto') })),
      obsFisco: kids(compl, 'ObsFisco').map((o) => ({ xCampo: o.getAttribute('xCampo') ?? '', xTexto: txt(o, 'xTexto') })),
    },
    emit: {
      doc: docOf(emit),
      xNome: txt(emit, 'xNome'),
      xFant: txt(emit, 'xFant'),
      ender: parseEndereco(kid(emit, 'enderEmit')),
      IE: txt(emit, 'IE'),
      IEST: txt(emit, 'IEST'),
      IM: '',
      CRT: txt(emit, 'CRT'),
    },
    rem,
    exped,
    receb,
    dest,
    toma,
    vPrest: {
      vTPrest: txt(vPrestEl, 'vTPrest') || txt(totalEl, 'vTPrest'),
      vRec: txt(vPrestEl, 'vRec') || txt(totalEl, 'vTRec'),
      comp,
    },
    imp: {
      icms: parseIcms(imp),
      vTotTrib: txt(imp, 'vTotTrib'),
      infAdFisco: txt(imp, 'infAdFisco'),
      vTotDFe: txt(imp, 'vTotDFe') || txt(totalEl, 'vTotDFe'),
      icmsUFFim: parseIcmsUfFim(imp),
      tribFed: parseTribFed(imp),
    },
    carga: cargaEl
      ? {
          vCarga: txt(cargaEl, 'vCarga'),
          proPred: txt(cargaEl, 'proPred'),
          xOutCat: txt(cargaEl, 'xOutCat'),
          vCargaAverb: txt(cargaEl, 'vCargaAverb'),
          quantidades: kids(cargaEl, 'infQ').map((q) => ({
            cUnid: txt(q, 'cUnid'),
            tpMed: txt(q, 'tpMed'),
            qCarga: txt(q, 'qCarga'),
          })),
        }
      : null,
    servico: servEl ? { xDescServ: txt(servEl, 'xDescServ'), qCarga: txt(servEl, 'infQ', 'qCarga') } : null,
    docs,
    docsAnt,
    docsRefOS,
    gtves: kids(norm, 'infGTVe').map((g) => txt(g, 'chCTe')).filter(Boolean),
    cteComp: kids(inf, 'infCteComp').map((c) => txt(c, 'chCTe') || txt(c, 'chave')).filter(Boolean),
    cteSub: subEl
      ? {
          chCte: txt(subEl, 'chCte'),
          refCTeCanc: txt(subEl, 'refCTeCanc'),
          indAlteraToma: txt(subEl, 'indAlteraToma'),
        }
      : null,
    cteMultimodalVinc: kids(path(norm, 'infServVinc'), 'infCTeMultimodal')
      .map((m) => txt(m, 'chCTeMultimodal'))
      .filter(Boolean),
    globalizadoObs: txt(norm, 'infGlobalizado', 'xObs'),
    seguros,
    veicNovos: kids(norm, 'veicNovos').map((v) => ({
      chassi: txt(v, 'chassi'),
      cCor: txt(v, 'cCor'),
      xCor: txt(v, 'xCor'),
      cMod: txt(v, 'cMod'),
      vUnit: txt(v, 'vUnit'),
      vFrete: txt(v, 'vFrete'),
    })),
    cobr: parseCobr(cobrEl),
    modal: parseModal(modalEl),
    simpDets,
    qrCod: txt(cteEl, 'infCTeSupl', 'qrCodCTe'),
    prot: parseProt(protEl),
  }
}

/** Parse a CT-e (`cteProc`/`CTe`), CT-e OS (`cteOSProc`/`CTeOS`) or CT-e Simplificado (`cteSimpProc`/`CTeSimp`) XML string. */
export function parseCte(xml: string): Cte {
  return parseCteDocument(parseXml(xml))
}
