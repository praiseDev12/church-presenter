import initSqlJs from 'sql.js'
import { readFileSync, writeFileSync } from 'fs'
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
`)

const raw = readFileSync(path.join(__dirname, '../resources/kjv.json'), 'utf-8')
const bible = JSON.parse(raw)

const stmt = db.prepare(`
  INSERT INTO verses (book, chapter, verse, text, translation)
  VALUES (?, ?, ?, ?, ?)
`)

let count = 0

for (const bookObj of bible.books) {
  const bookName = bookObj.englishName // "Genesis", "Exodus", etc.

  for (const chapterObj of bookObj.chapters) {
    for (const verseObj of chapterObj.verses) {
      stmt.run([
        bookName,
        chapterObj.chapter, // already a number
        verseObj.number, // already a number
        verseObj.text,
        'KJV'
      ])
      count++
    }
  }
}

stmt.free()

const data = db.export()
writeFileSync(path.join(__dirname, '../resources/bible.db'), Buffer.from(data))

console.log(`Done. Inserted ${count} verses.`)
console.log('Database saved to resources/bible.db')
db.close()
