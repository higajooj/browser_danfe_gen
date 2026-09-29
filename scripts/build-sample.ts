// Generates out/<name>.html from an XML file (dev helper; uses happy-dom for DOMParser under Bun/Node).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { basename } from 'node:path'
import { Window } from 'happy-dom'

const win = new Window()
;(globalThis as any).DOMParser = win.DOMParser

const { generateDanfeHtml } = await import('../src/index')
const [src, out] = process.argv.slice(2)
if (!src) throw new Error('usage: bun scripts/build-sample.ts <file.xml> [out.html]')
mkdirSync('out', { recursive: true })
const dest = out ?? `out/${basename(src, '.xml')}.html`
writeFileSync(dest, generateDanfeHtml(readFileSync(src, 'utf8')))
console.log(dest)
