import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = join(root, 'public', 'audit', 'number-ledger.csv')
const outputPath = join(root, 'src', 'data', 'answer-source-index.json')

function parseCsv(value) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]
    if (quoted) {
      if (character === '"' && value[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (character === '"') {
        quoted = false
      } else {
        field += character
      }
    } else if (character === '"') {
      quoted = true
    } else if (character === ',') {
      row.push(field)
      field = ''
    } else if (character === '\n') {
      row.push(field.replace(/\r$/, ''))
      rows.push(row)
      row = []
      field = ''
    } else {
      field += character
    }
  }

  if (field || row.length > 0) {
    row.push(field.replace(/\r$/, ''))
    rows.push(row)
  }
  return rows
}

const [header, ...rows] = parseCsv(readFileSync(sourcePath, 'utf8'))
const column = Object.fromEntries(header.map((name, index) => [name, index]))
const records = rows
  .filter((row) => row[column.status] === 'PASS' && row[column.source_url])
  .map((row) => ({
    checkId: row[column.check_id],
    release: row[column.release],
    stage: row[column.stage],
    section: row[column.section],
    entity: row[column.entity],
    metric: row[column.metric],
    expected: row[column.expected],
    actual: row[column.actual],
    unit: row[column.unit],
    sourceDocument: row[column.source_document],
    sourcePage: row[column.source_page],
    sourceUrl: row[column.source_url],
    notes: row[column.notes],
  }))

const output = `${JSON.stringify(records)}\n`
if (process.argv.includes('--check')) {
  if (readFileSync(outputPath, 'utf8') !== output) {
    console.error('The staff answer citation index is stale. Run pnpm build:answer-sources.')
    process.exit(1)
  }
  console.log(`Verified ${records.length} cited audit rows in the staff answer index.`)
} else {
  writeFileSync(outputPath, output)
  console.log(`Wrote ${records.length} cited audit rows to ${outputPath}`)
}
