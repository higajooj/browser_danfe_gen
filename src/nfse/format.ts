import { municipiosIbge } from './municipios'

const ufIbge: Readonly<Record<string, string>> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
  '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL', '28': 'SE', '29': 'BA',
  '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP',
  '41': 'PR', '42': 'SC', '43': 'RS',
  '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF',
}

let municipios: Map<string, string> | undefined

export const joined = (...values: string[]): string => values.filter(Boolean).join(' / ')
export const slots = (...values: string[]): string => values.some(Boolean) ? values.map((v) => v || '-').join(' / ') : ''

export function localidade(codigo: string, nome = '', uf = ''): string {
  if (!codigo) return joined(nome, uf)
  municipios ??= new Map(municipiosIbge.split('\n').map((row) => [row.slice(0, 7), row.slice(8)]))
  return joined(nome || municipios.get(codigo) || codigo, uf || ufIbge[codigo.slice(0, 2)] || '')
}

const br = new Intl.NumberFormat('pt-BR')

function cents(value: string): bigint | undefined {
  if (!/^-?\d+(\.\d{1,2})?$/.test(value)) return undefined
  const [whole, fractional = ''] = value.replace(/^-/, '').split('.') as [string, string?]
  const amount = BigInt(whole) * 100n + BigInt(fractional.padEnd(2, '0'))
  return value.startsWith('-') ? -amount : amount
}

function formatCents(value: bigint): string {
  const amount = value < 0n ? -value : value
  return `R$ ${value < 0n ? '-' : ''}${br.format(amount / 100n)},${String(amount % 100n).padStart(2, '0')}`
}

export function money(value: string): string {
  const amount = cents(value)
  return amount === undefined ? value : formatCents(amount)
}

export function sumMoney(...values: string[]): string {
  const amounts = values.filter(Boolean).map(cents)
  if (!amounts.length || amounts.some((amount) => amount === undefined)) return ''
  return formatCents(amounts.reduce<bigint>((sum, amount) => sum + (amount ?? 0n), 0n))
}

export const negate = (value: string): string => value.startsWith('-') ? value.slice(1) : value && `-${value}`
