const digits = (s: string) => s.replace(/\D/g, '')
/** Digits and letters: a CNPJ may carry letters (NT conjunta DFe 2025.001), and so may a chave. */
const alnum = (s: string) => s.replace(/[^0-9A-Za-z]/g, '').toUpperCase()

export function maskCnpj(v: string): string {
  const d = alnum(v)
  if (d.length !== 14) return v
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

export function maskCpf(v: string): string {
  const d = digits(v)
  if (d.length !== 11) return v
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

/** CNPJ or CPF, depending on length. */
export function maskDoc(v: string): string {
  const d = alnum(v)
  return /^\d{11}$/.test(d) ? maskCpf(d) : maskCnpj(d)
}

export function maskCep(v: string): string {
  const d = digits(v)
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : v
}

export function maskFone(v: string): string {
  const d = digits(v)
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 8 || d.length === 9) return `${d.slice(0, d.length - 4)}-${d.slice(-4)}`
  return v
}

/** Access key printed in eleven blocks of four characters (3.1.1). */
export function groupChave(chave: string): string {
  return alnum(chave).replace(/(.{4})(?=.)/g, '$1 ')
}

/** 000.000.023 (9 digits, 3 groups) as on the DANFE header. */
export function formatNumero(n: string): string {
  const d = digits(n).padStart(9, '0')
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}`
}

export function formatSerie(s: string): string {
  return digits(s).padStart(3, '0')
}

/** Decimal string from the XML -> pt-BR with a fixed number of decimals. Empty input stays empty. */
export function formatDecimal(v: string | undefined, decimals = 2): string {
  if (v === undefined || v.trim() === '') return ''
  const n = Number(v)
  if (!Number.isFinite(n)) return v
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/** Money value; missing values print as 0,00 (the box must not be blank). */
export function formatMoney(v: string | undefined): string {
  return formatDecimal(v === undefined || v.trim() === '' ? '0' : v, 2)
}

export function formatBRL(v: string | undefined): string {
  return `R$ ${formatMoney(v)}`
}

/** "2021-01-14T17:15:00-03:00" or "2021-01-14" -> { date: "14/01/2021", time: "17:15:00" }. Kept as written, no tz conversion. */
export function splitDateTime(v: string | undefined): { date: string; time: string } {
  if (!v) return { date: '', time: '' }
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(v.trim())
  if (!m) return { date: v, time: '' }
  const time = m[4] ? `${m[4]}:${m[5]}:${m[6] ?? '00'}` : ''
  return { date: `${m[3]}/${m[2]}/${m[1]}`, time }
}

/** Ordinary number of grouped digits without decimals (quantities that are integral, e.g. volumes). */
export function formatInt(v: string | undefined): string {
  if (!v || v.trim() === '') return ''
  const n = Number(v)
  return Number.isFinite(n) ? n.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : v
}
