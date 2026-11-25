# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.0] - 2026-11-24

### Added

- CT-e (modelo 57 and CT-e Simplificado) DACTE and CT-e OS (modelo 67) DACTE OS support according to
  MOC CT-e 4.00 – Anexo II, auto-detected by `generateDanfeHtml` and exported as `generateDacteHtml`
  and `parseCte`.
- Support for all six cargo modals (rodoviário, aéreo, aquaviário, ferroviário, dutoviário, multimodal)
  plus `rodoOS`, FS-DA contingency with the 36-character additional barcode, QR Code, homologação
  notices, special cases (`veicNovos`, `peri`, `detCont`), multi-page pagination and optional canhoto
  (`cte.canhoto`).

## [0.4.0] - 2026-11-19

### Added

- National NFS-e support with automatic detection, `generateDanfseHtml`, and `parseNfse`.
- Single-page A4 DANFSe v2.0 with the public consultation QR code, ISSQN and IBS/CBS details, and
  options for a receipt and cancellation or substitution watermarks.

### Fixed

- NFC-e now preserves full unit prices, keeps the consumer distinct from the delivery recipient,
  and prints the authorization timestamp in the emitter's local time.

## [0.3.0] - 2026-11-05

### Added

- DANFE NFC-e for NFC-e (modelo 65) as a receipt roll, auto-detected by `generateDanfeHtml` and exported as
  `generateDanfeNfceHtml`, with paper width, resumido and contingency copy options.
- `parseNfe` reads payments, troco, `infNFeSupl`, `entrega`, `dhCont` and the protocol `xMsg`.

## [0.2.0] - 2026-10-13

### Added

- DAMDFE for MDF-e (modelo 58), auto-detected by `generateDanfeHtml`.
- Built-in QR Code encoder, supporting versions up to 40 and UTF-8.

### Fixed

- DAMDFE emitente block now fits its box, and long table values wrap instead of being clipped.

## [0.1.1] - 2026-10-06

### Fixed

- A chave with an alphanumeric CNPJ is encoded in CODE-128 sets C and A, and keeps its letters when formatted.

## [0.1.0] - 2026-10-06

### Added

- NF-e DANFE rendered as printable HTML in the browser, with XML parsing, pagination and a print helper.
- CODE-128C barcode and chave check digit validation.
- Playground and real-browser verification script.
