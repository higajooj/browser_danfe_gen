import { DanfeError } from '../errors'
import { kid, kids, parseXml, path, txt, type El } from '../parse'

function fields<K extends string>(el: El, ...names: K[]): Record<K, string> {
  return Object.fromEntries(names.map((name) => [name, txt(el, name)])) as Record<K, string>
}

function parseParty(el: Element, emit: El = null) {
  const end = kid(el, 'end')
  const endEmit = kid(emit, 'enderNac')
  const endNac = kid(end, 'endNac') ?? (end ? null : endEmit)
  const endExt = kid(end, 'endExt')
  return {
    CNPJ: txt(el, 'CNPJ'),
    CPF: txt(el, 'CPF'),
    NIF: txt(el, 'NIF'),
    IM: txt(el, 'IM') || txt(emit, 'IM'),
    xNome: txt(el, 'xNome') || txt(emit, 'xNome'),
    fone: txt(el, 'fone') || txt(emit, 'fone'),
    email: txt(el, 'email') || txt(emit, 'email'),
    end: {
      ...fields(end ?? endEmit, 'xLgr', 'nro', 'xCpl', 'xBairro'),
      ...fields(endNac, 'cMun', 'CEP', 'UF'),
      ...fields(endExt, 'xCidade', 'xEstProvReg', 'cPais', 'cEndPost'),
    },
  }
}

export type NfseParty = ReturnType<typeof parseParty>

function parseIbsCbs(inf: Element, dpsIbs: El) {
  const ibs = kid(inf, 'IBSCBS')
  const trib = path(dpsIbs, 'valores', 'trib')
  const detail = kid(trib, 'gIBSCBS')
  const values = kid(ibs, 'valores')
  const totals = kid(ibs, 'totCIBS')
  return {
    ...fields(dpsIbs, 'cIndOp'),
    CST: txt(trib, 'CST') || txt(detail, 'CST'),
    cClassTrib: txt(trib, 'cClassTrib') || txt(detail, 'cClassTrib'),
    ...fields(ibs, 'cLocalidadeIncid', 'xLocalidadeIncid'),
    ...fields(values, 'vBC', 'vCalcReeRepRes', 'vCalcAjusteBCIBSCBS', 'vCalcAjusteBCLocImoveis'),
    ...fields(kid(values, 'uf'), 'pIBSUF', 'pRedAliqUF', 'pAliqEfetUF'),
    ...fields(kid(values, 'mun'), 'pIBSMun', 'pRedAliqMun', 'pAliqEfetMun'),
    ...fields(kid(values, 'fed'), 'pCBS', 'pRedAliqCBS', 'pAliqEfetCBS'),
    vIBSUF: txt(totals, 'gIBS', 'gIBSUFTot', 'vIBSUF'),
    vIBSMun: txt(totals, 'gIBS', 'gIBSMunTot', 'vIBSMun'),
    vIBSTot: txt(totals, 'gIBS', 'vIBSTot'),
    vCBS: txt(totals, 'gCBS', 'vCBS'),
    vTotNF: txt(totals, 'vTotNF'),
  }
}

function parseComplement(inf: Element, dps: Element, serv: El, dpsIbs: El, trib: El) {
  const info = kid(serv, 'infoCompl')
  const approx = kid(trib, 'totTrib')
  const imovel = kid(dpsIbs, 'imovel')
  const inscricoes = kids(imovel, 'gUnidImob').map((unit) => txt(unit, 'inscImobFisc')).filter(Boolean)
  return {
    ...fields(info, 'xInfComp', 'docRef', 'idDocTec', 'xPed'),
    chSubstda: txt(dps, 'subst', 'chSubstda'),
    cObra: txt(serv, 'obra', 'cObra'),
    inscImobFisc: inscricoes.join(', ') || txt(imovel, 'inscImobFisc') || txt(serv, 'obra', 'inscImobFisc'),
    idAtvEvt: txt(serv, 'atvEvento', 'idAtvEvt'),
    xItemPed: kids(kid(info, 'gItemPed'), 'xItemPed').map((item) => item.textContent?.trim() ?? ''),
    xOutInf: txt(inf, 'xOutInf') || txt(inf, 'valores', 'xOutInf'),
    ...fields(kid(approx, 'vTotTrib'), 'vTotTribFed', 'vTotTribEst', 'vTotTribMun'),
    ...fields(kid(approx, 'pTotTrib'), 'pTotTribFed', 'pTotTribEst', 'pTotTribMun'),
    ...fields(approx, 'pTotTribSN'),
  }
}

export function parseNfseDocument(doc: Document) {
  const root = doc.documentElement
  const inf = kid(root, 'infNFSe')
  const dps = path(inf, 'DPS', 'infDPS')
  const prest = kid(dps, 'prest')
  if (root.localName !== 'NFSe' || root.namespaceURI !== 'http://www.sped.fazenda.gov.br/nfse' || !inf || !dps || !prest) {
    throw new DanfeError('unsupported-document', 'Expected a national NFS-e XML (NFSe/infNFSe with an embedded DPS)')
  }

  const id = inf.getAttribute('Id') ?? ''
  if (!/^NFS[A-Z0-9]{50}$/.test(id)) {
    throw new DanfeError('invalid-xml', 'Invalid national NFS-e access key in infNFSe/@Id')
  }

  const emit = kid(inf, 'emit')
  const toma = kid(dps, 'toma')
  const interm = kid(dps, 'interm')
  const dpsIbs = kid(dps, 'IBSCBS')
  const dest = kid(dps, 'dest') ?? kid(dpsIbs, 'dest')
  const reg = kid(prest, 'regTrib')
  const serv = kid(dps, 'serv')
  const values = kid(inf, 'valores')
  const dpsValues = kid(dps, 'valores')
  const trib = kid(dpsValues, 'trib')
  const mun = kid(trib, 'tribMun')
  const fed = kid(trib, 'tribFed')

  return {
    chave: id.slice(3),
    versao: root.getAttribute('versao') ?? '',
    ide: {
      ...fields(inf, 'xLocEmi', 'nNFSe', 'dhProc', 'ambGer', 'cStat'),
      ...fields(dps, 'cLocEmi', 'tpAmb', 'tpEmit', 'dCompet', 'nDPS', 'serie', 'dhEmi'),
      finNFSe: txt(dps, 'finNFSe') || txt(dpsIbs, 'finNFSe'),
      UFEmi: txt(emit, 'enderNac', 'UF'),
    },
    prest: parseParty(prest, txt(dps, 'tpEmit') === '1' ? emit : null),
    toma: toma ? parseParty(toma, txt(dps, 'tpEmit') === '2' ? emit : null) : null,
    dest: dest ? parseParty(dest) : null,
    interm: interm ? parseParty(interm, txt(dps, 'tpEmit') === '3' ? emit : null) : null,
    indDest: txt(dps, 'indDest') || txt(dpsIbs, 'indDest'),
    regTrib: fields(reg, 'opSimpNac', 'regApTribSN', 'regEspTrib'),
    serv: {
      ...fields(kid(serv, 'cServ'), 'cTribNac', 'cTribMun', 'cNBS', 'xDescServ'),
      ...fields(kid(serv, 'locPrest'), 'cLocPrestacao', 'cPaisPrestacao'),
      ...fields(inf, 'xLocPrestacao', 'xTribNac', 'xTribMun'),
    },
    issqn: {
      ...fields(mun, 'tribISSQN', 'tpImunidade', 'tpRetISSQN', 'cPaisResult'),
      ...fields(kid(mun, 'exigSusp'), 'tpSusp', 'nProcesso'),
      ...fields(inf, 'cLocIncid', 'xLocIncid'),
      ...fields(values, 'tpBM', 'vCalcBM', 'vCalcDR', 'vCalcAjusteBCISSQN', 'vBC', 'pAliqAplic', 'vISSQN'),
      vRedBCBM: txt(mun, 'BM', 'vRedBCBM'),
      vDR: txt(dpsValues, 'vDedRed', 'vDR'),
      vAjusteBCISSQN: txt(dpsValues, 'vAjusteBC', 'vAjusteBCISSQN'),
    },
    federal: {
      ...fields(fed, 'vRetIRRF', 'vRetCP', 'vRetCSLL'),
      ...fields(kid(fed, 'piscofins'), 'tpRetPisCofins', 'vPis', 'vCofins'),
    },
    ibsCbs: {
      ...parseIbsCbs(inf, dpsIbs),
      vAjusteBCIBSCBSComExt: txt(dpsValues, 'vAjusteBC', 'vAjusteBCIBSCBSComExt'),
    },
    totals: {
      ...fields(values, 'vTotalRet', 'vLiq'),
      ...fields(kid(dpsValues, 'vDescCondIncond'), 'vDescIncond', 'vDescCond'),
      vServ: txt(dpsValues, 'vServPrest', 'vServ'),
    },
    complement: parseComplement(inf, dps, serv, dpsIbs, trib),
  }
}

export type Nfse = ReturnType<typeof parseNfseDocument>

/** Parse an issued NFS-e in the national XML layout. */
export function parseNfse(xml: string): Nfse {
  return parseNfseDocument(parseXml(xml))
}
