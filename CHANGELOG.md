# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
