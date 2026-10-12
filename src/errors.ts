export type DanfeErrorCode = 'invalid-xml' | 'unsupported-document' | 'no-dom-parser' | 'qr-too-long'

export class DanfeError extends Error {
  readonly code: DanfeErrorCode

  constructor(code: DanfeErrorCode, message: string) {
    super(message)
    this.name = 'DanfeError'
    this.code = code
  }
}
