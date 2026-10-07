// scripts/seed-bible.js
import initSqlJs from 'sql.js'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

console.log('Starting Bible database seed...')

const SQL = await initSqlJs()
const db = new SQL.Database()

db.run(`
  CREATE TABLE IF NOT EXISTS verses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    book        TEXT NOT NULL,
    chapter     INTEGER NOT NULL,
    verse       INTEGER NOT NULL,
    text        TEXT NOT NULL,
    translation TEXT NOT NULL DEFAULT 'KJV'
  );
  CREATE INDEX IF NOT EXISTS idx_reference ON verses(book, chapter, verse);
  CREATE INDEX IF NOT EXISTS idx_translation ON verses(translation);
`)

const stmt = db.prepare(`
  INSERT INTO verses (book, chapter, verse, text, translation)
  VALUES (?, ?, ?, ?, ?)
`)

// Define all translations to seed
// Add more here as you get more JSON files
const translations = [
  { file: 'kjv.json', code: 'KJV' },
  { file: 'asv.json', code: 'ASV' },
  { file: 'web.json', code: 'WEB' }
]

let totalCount = 0

for (const translation of translations) {
  const filePath = path.join(__dirname, '../resources', translation.file)

  // Skip if file doesn't exist
  if (!existsSync(filePath)) {
    console.log(`Skipping ${translation.file} — file not found`)
    continue
  }

  console.log(`Seeding ${translation.code}...`)

  const raw = readFileSync(filePath, 'utf-8')
  const bible = JSON.parse(raw)
  let count = 0

  for (const bookObj of bible.books) {
    const bookName = bookObj.englishName

    for (const chapterObj of bookObj.chapters) {
      for (const verseObj of chapterObj.verses) {
        stmt.run([bookName, chapterObj.chapter, verseObj.number, verseObj.text, translation.code])
        count++
      }
    }
  }

  console.log(`  → ${count} verses inserted`)
  totalCount += count
}

stmt.free()

const data = db.export()
writeFileSync(path.join(__dirname, '../resources/bible.db'), Buffer.from(data))

console.log(`\nDone. Total verses inserted: ${totalCount}`)
console.log('Database saved to resources/bible.db')
db.close()
