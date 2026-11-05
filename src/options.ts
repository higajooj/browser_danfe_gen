export interface NfceOptions {
  /**
   * Width of the paper roll in mm (Manual DANFE NFC-e 3.3: at least 56 mm). Default 80. The sheet height
   * follows the content, so the document prints as one continuous receipt. 210 prints on A4-wide paper.
   */
  paperWidthMm?: number
  /** DANFE NFC-e resumido (ecológico): leave out the item detail (Divisão II). Default false. */
  resumido?: boolean
  /**
   * Which copy of an NFC-e issued in contingency, still pending authorization, is being printed (3.1.8):
   * the consumer's, or the second copy kept by the emitter ("Via estabelecimento"). Default 'consumidor'.
   */
  via?: 'consumidor' | 'estabelecimento'
}

export interface DanfeOptions {
  /** `data:image/...` URI of the emitter logo (printed inside the emitente frame). */
  logoDataUri?: string
  /** Spec allows Times New Roman or Courier New (DANFE 3.7); also applied to the DAMDFE and DANFE NFC-e. Default: 'times'. */
  fontFamily?: 'times' | 'courier'
  /** <title> of the document; browsers use it as the default PDF file name. Default: `DANFE <chave>` / `DAMDFE <chave>` / `DANFE NFC-e <chave>`. */
  title?: string
  /**
   * Authorization protocol to print when the XML has no <protNFe> / <protMDFe> (e.g. EPEC, 3.9.3).
   * `dateTime` is an ISO-like string such as "2021-01-14T16:18:40-04:00".
   */
  protocol?: { nProt: string; dateTime: string }
  /** DANFE NFC-e (modelo 65) settings; ignored for the other documents. */
  nfce?: NfceOptions
}
