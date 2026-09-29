export interface DanfeOptions {
  /** `data:image/...` URI of the emitter logo (printed inside the emitente frame). */
  logoDataUri?: string
  /** Spec allows Times New Roman or Courier New (3.7). Default: 'times'. */
  fontFamily?: 'times' | 'courier'
  /** <title> of the document; browsers use it as the default PDF file name. Default: `DANFE <chave>`. */
  title?: string
  /**
   * Authorization protocol to print when the XML has no <protNFe> (e.g. EPEC, 3.9.3).
   * `dateTime` is an ISO-like string such as "2021-01-14T16:18:40-04:00".
   */
  protocol?: { nProt: string; dateTime: string }
}
