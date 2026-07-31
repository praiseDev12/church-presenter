// src/main/database.js
import { join } from 'path'
import { readFileSync } from 'fs'
import { app } from 'electron'
import initSqlJs from 'sql.js'

let db = null

export async function openDatabase() {
  if (db) return db

  const SQL = await initSqlJs()

  const dbPath = app.isPackaged
    ? join(process.resourcesPath, 'bible.db')
    : join(process.cwd(), 'resources', 'bible.db')

  const fileBuffer = readFileSync(dbPath)
  db = new SQL.Database(fileBuffer)

  console.log('Bible database opened successfully')
  return db
}

export async function searchVerses(query) {
  if (!query || query.trim().length < 2) return []

  const database = await openDatabase()
  const trimmed = query.trim()

  // Decide if this looks like a reference (John 3:16) or keyword (fear not)
  const looksLikeReference = /^(\d?\s?[a-zA-Z]+)\s+\d/i.test(trimmed)

  if (looksLikeReference) {
    return searchByReference(database, trimmed)
  } else {
    return searchByKeyword(database, trimmed)
  }
}

function searchByReference(database, query) {
  // Match patterns like "John 3:16", "John 3 16", "1 John 3:16", "Psalms 23"
  const parts = query.match(/^(\d?\s?[a-zA-Z\s]+?)\s+(\d+)(?::(\d+))?$/)
  if (!parts) return []

  const book = parts[1].trim()
  const chapter = parseInt(parts[2])
  const verse = parts[3] ? parseInt(parts[3]) : null

  let stmt
  let results = []

  if (verse) {
    // Exact verse — John 3:16
    stmt = database.prepare(`
      SELECT * FROM verses
      WHERE book LIKE ? AND chapter = ? AND verse = ?
      LIMIT 1
    `)
    stmt.bind([`${book}%`, chapter, verse])
  } else {
    // Whole chapter — John 3
    stmt = database.prepare(`
      SELECT * FROM verses
      WHERE book LIKE ? AND chapter = ?
      ORDER BY verse
      LIMIT 50
    `)
    stmt.bind([`${book}%`, chapter])
  }

  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  return results
}

function searchByKeyword(database, query) {
  const stmt = database.prepare(`
    SELECT * FROM verses
    WHERE text LIKE ?
    ORDER BY book, chapter, verse
    LIMIT 20
  `)
  stmt.bind([`%${query}%`])

  const results = []
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  return results
}

export async function getVerse(book, chapter, verse) {
  const database = await openDatabase()

  const stmt = database.prepare(`
    SELECT * FROM verses
    WHERE book = ? AND chapter = ? AND verse = ?
    LIMIT 1
  `)
  stmt.bind([book, chapter, verse])

  const result = stmt.step() ? stmt.getAsObject() : null
  stmt.free()
  return result
}
