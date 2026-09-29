/** Flat, string-based view of an NF-e. Values are kept exactly as written in the XML. */
export interface Endereco {
  xLgr: string
  nro: string
  xCpl: string
  xBairro: string
  cMun: string
  xMun: string
  UF: string
  CEP: string
  fone: string
}

export interface Emitente {
  doc: string
  xNome: string
  xFant: string
  ender: Endereco
  IE: string
  IEST: string
  IM: string
}

export interface Destinatario {
  /** CNPJ, CPF or idEstrangeiro. */
  doc: string
  xNome: string
  ender: Endereco
  IE: string
}

export interface Item {
  nItem: string
  cProd: string
  cEAN: string
  xProd: string
  NCM: string
  CFOP: string
  uCom: string
  qCom: string
  vUnCom: string
  vProd: string
  vDesc: string
  infAdProd: string
  /** orig + CST (or CSOSN for Simples Nacional). */
  cst: string
  vBC: string
  pICMS: string
  vICMS: string
  vBCST: string
  vICMSST: string
  vIPI: string
  pIPI: string
}

export interface Totais {
  vBC: string
  vICMS: string
  vICMSDeson: string
  vFCP: string
  vBCST: string
  vST: string
  vFCPST: string
  vProd: string
  vFrete: string
  vSeg: string
  vDesc: string
  vIPI: string
  vOutro: string
  vNF: string
  vTotTrib: string
  issqn: { vServ: string; vBC: string; vISS: string }
}

export interface Volume {
  qVol: string
  esp: string
  marca: string
  nVol: string
  pesoL: string
  pesoB: string
}

export interface Transporte {
  modFrete: string
  transporta: {
    doc: string
    xNome: string
    IE: string
    xEnder: string
    xMun: string
    UF: string
  }
  veic: { placa: string; UF: string; RNTC: string }
  volumes: Volume[]
}

export interface Duplicata {
  nDup: string
  dVenc: string
  vDup: string
}

export interface Cobranca {
  fat: { nFat: string; vOrig: string; vDesc: string; vLiq: string } | null
  duplicatas: Duplicata[]
}

export interface Protocolo {
  nProt: string
  /** dhRecbto as written in the XML. */
  dhRecbto: string
  cStat: string
  tpAmb: string
}

export interface Nfe {
  chave: string
  versao: string
  ide: {
    cUF: string
    natOp: string
    mod: string
    serie: string
    nNF: string
    /** Emission date-time as written (dhEmi, or dEmi on layout 2.00). */
    dhEmi: string
    /** Exit/entry date-time as written (dhSaiEnt, or dSaiEnt + hSaiEnt). */
    dhSaiEnt: string
    tpNF: string
    tpEmis: string
    tpAmb: string
  }
  emit: Emitente
  dest: Destinatario | null
  itens: Item[]
  total: Totais
  transp: Transporte
  cobr: Cobranca
  infAdic: { infAdFisco: string; infCpl: string; obsCont: { xCampo: string; xTexto: string }[] }
  prot: Protocolo | null
}
