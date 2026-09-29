import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const fixture = (name: string): string =>
  readFileSync(resolve(process.cwd(), 'test/fixtures', `${name}.xml`), 'utf8')
