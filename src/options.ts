export interface DanfeOptions {
  /** `data:image/...` URI of the emitter logo (printed inside the emitente frame). */
  logoDataUri?: string
  /** Spec allows Times New Roman or Courier New (DANFE 3.7); also applied to the DAMDFE. Default: 'times'. */
  fontFamily?: 'times' | 'courier'
  /** <title> of the document; browsers use it as the default PDF file name. Default: `DANFE <chave>` / `DAMDFE <chave>`. */
  title?: string
  /**
   * Authorization protocol to print when the XML has no <protNFe> / <protMDFe> (e.g. EPEC, 3.9.3).
   * `dateTime` is an ISO-like string such as "2021-01-14T16:18:40-04:00".
   */
  protocol?: { nProt: string; dateTime: string }
}
