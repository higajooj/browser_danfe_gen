// Real-browser verification (dev only): geometry vs spec table, text overflow, page count, barcode decode.
//   bun scripts/verify.ts <file.xml> [--items N] [--infcpl N]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { execFileSync, spawnSync } from 'node:child_process'
import { basename, resolve } from 'node:path'
import { Window } from 'happy-dom'

;(globalThis as any).DOMParser = new Window().DOMParser
const { generateDanfeHtml } = await import('../src/index')

const args = process.argv.slice(2)
const file = args[0]
if (!file) throw new Error('usage: bun scripts/verify.ts <file.xml> [--items N] [--infcpl N]')
const opt = (n: string) => Number(args[args.indexOf(n) + 1] ?? 0) || 0
let xml = readFileSync(file!, 'utf8')
const items = opt('--items')
if (items) {
  const m = /<det nItem="1">[\s\S]*?<\/det>/.exec(xml)![0]
  xml = xml.replace(m, Array.from({ length: items }, (_, i) => m.replace('nItem="1"', `nItem="${i + 1}"`)).join('\n'))
}
const infN = opt('--infcpl')
if (infN) {
  const long = Array.from({ length: infN }, (_, i) => `LINHA ${i + 1} DE INFORMACOES COMPLEMENTARES`).join('|')
  xml = xml.replace(/<infCpl>[\s\S]*?<\/infCpl>/, `<infCpl>${long}</infCpl>`)
}

const tag = `${basename(file!, '.xml')}${items ? `-i${items}` : ''}${infN ? `-c${infN}` : ''}`
mkdirSync('out', { recursive: true })
const html = generateDanfeHtml(xml, { fontFamily: process.env.DANFE_FONT === 'courier' ? 'courier' : 'times' })
writeFileSync(`out/${tag}.html`, html)

const probe = `<script>
addEventListener('load', () => {
  const PX = 96 / 2.54, tol = 0.02, problems = [], stat = { boxes: 0 }
  document.querySelectorAll('.page').forEach((page, pi) => {
    const pr = page.getBoundingClientRect()
    page.querySelectorAll('.b').forEach((el) => {
      stat.boxes++
      const cs = el.style, r = el.getBoundingClientRect()
      const want = (v) => parseFloat(cs.getPropertyValue(v))
      const got = { l: (r.left - pr.left) / PX, t: (r.top - pr.top) / PX }
      if (Math.abs(got.l - want('--l')) > tol || Math.abs(got.t - want('--t')) > tol)
        problems.push('geometry p' + (pi + 1) + ' ' + el.className + ' want ' + want('--l') + ',' + want('--t') + ' got ' + got.l.toFixed(3) + ',' + got.t.toFixed(3))
      const bw = 0.5 * 96 / 72 / PX
      if (!el.classList.contains('nb')) {
        const gw = r.width / PX - bw, gh = r.height / PX - bw
        if (Math.abs(gw - want('--w')) > tol || Math.abs(gh - want('--h')) > tol)
          problems.push('size p' + (pi + 1) + ' ' + el.className + ' want ' + want('--w') + 'x' + want('--h') + ' got ' + gw.toFixed(3) + 'x' + gh.toFixed(3))
      }
      if (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)
        problems.push('overflow p' + (pi + 1) + ' ' + el.className + ' "' + el.textContent.trim().slice(0, 40) + '" ' + el.scrollWidth + 'x' + el.scrollHeight + ' in ' + el.clientWidth + 'x' + el.clientHeight)
    })
    page.querySelectorAll('.v, .l, .row > div, .qh > div, .emit .txt, .msg').forEach((el) => {
      if (el.scrollWidth > el.clientWidth + 1)
        problems.push('clipped p' + (pi + 1) + ' "' + el.textContent.trim().slice(0, 40) + '" ' + el.scrollWidth + '>' + el.clientWidth)
    })
    const rows = page.querySelector('.q > div[style*="--lh"]')
    const q = page.querySelector('.q')
    if (rows && q && rows.getBoundingClientRect().bottom > q.getBoundingClientRect().bottom + 1)
      problems.push('items overflow the quadro on page ' + (pi + 1))
    const bc = page.querySelector('svg.barcode')
    if (bc) {
      const w = bc.getBoundingClientRect().width / PX, vb = bc.viewBox.baseVal.width
      stat['barcodeCm' + (pi + 1)] = +w.toFixed(3)
      stat['moduleCm' + (pi + 1)] = +(w / vb).toFixed(4)
    }
  })
  document.title = 'done'
  const pre = document.createElement('pre'); pre.id = 'result'
  pre.textContent = JSON.stringify({ problems, stat })
  document.body.appendChild(pre)
})
</script>`
const probed = resolve(`out/${tag}.probe.html`)
writeFileSync(probed, html.replace('</body>', `${probe}</body>`))

const chrome = ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars']
const dom = execFileSync('google-chrome-stable', [...chrome, '--virtual-time-budget=3000', '--dump-dom', `file://${probed}`], {
  encoding: 'utf8', timeout: 60000,
})
const res = JSON.parse(/<pre id="result">([\s\S]*?)<\/pre>/.exec(dom)![1]!.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'))
const pdf = resolve(`out/${tag}.pdf`)
spawnSync('google-chrome-stable', [...chrome, '--no-pdf-header-footer', `--print-to-pdf=${pdf}`, `file://${resolve(`out/${tag}.html`)}`], { timeout: 60000 })
const info = execFileSync('pdfinfo', [pdf], { encoding: 'utf8' })
const pages = Number(/Pages:\s+(\d+)/.exec(info)![1])
const size = /Page size:\s+(.*)/.exec(info)![1]
const htmlPages = (html.match(/<section class="page">/g) ?? []).length

// Decode the barcode of the first sheet with zbar.
spawnSync('pdftoppm', ['-r', '300', '-f', '1', '-l', '1', '-png', pdf, `out/${tag}`])
const png = execFileSync('sh', ['-c', `ls out/${tag}-*.png | head -1`], { encoding: 'utf8' }).trim()
const z = spawnSync('zbarimg', ['-q', '--raw', png], { encoding: 'utf8' })
const chave = /Id="NFe(\d{44})"/.exec(xml)![1]!

console.log(JSON.stringify({ tag, htmlPages, pdfPages: pages, size, stat: res.stat, decoded: z.stdout.trim(), decodedOk: z.stdout.trim().split('\n').includes(chave) }, null, 1))
if (res.problems.length) {
  console.log(`PROBLEMS (${res.problems.length}):`)
  for (const p of res.problems.slice(0, 40)) console.log(' -', p)
}
process.exit(res.problems.length || pages !== htmlPages || !z.stdout.includes(chave) ? 1 : 0)
