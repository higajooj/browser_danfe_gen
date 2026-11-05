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

/** One detPag of the pag group (YA01a). */
export interface Pagamento {
  /** 0 = à vista, 1 = a prazo; often absent. */
  indPag: string
  tPag: string
  /** Description of the payment method; required when tPag = 99. */
  xPag: string
  vPag: string
}

/** infNFeSupl (ZX01): QR Code and consulta URL of an NFC-e. */
export interface NfeSupl {
  qrCode: string
  urlChave: string
}

export interface Protocolo {
  nProt: string
  /** dhRecbto as written in the XML. */
  dhRecbto: string
  cStat: string
  tpAmb: string
  /** Message of the tax authority returned with the authorization (an NFC-e may print it). */
  xMsg: string
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
    /** Date-time the emitter entered contingency (dhCont), as written. */
    dhCont: string
  }
  emit: Emitente
  dest: Destinatario | null
  /** Delivery address (entrega, G01), when different from the destinatário's. */
  entrega: (Endereco & { doc: string; xNome: string }) | null
  itens: Item[]
  total: Totais
  transp: Transporte
  cobr: Cobranca
  pag: { detPag: Pagamento[]; vTroco: string }
  infAdic: { infAdFisco: string; infCpl: string; obsCont: { xCampo: string; xTexto: string }[] }
  /** Only on an NFC-e (modelo 65). */
  supl: NfeSupl
  prot: Protocolo | null
}
