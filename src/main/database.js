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

// Get all available translations in the database
export async function getTranslations() {
  const database = await openDatabase()
  const stmt = database.prepare(`
    SELECT DISTINCT translation FROM verses ORDER BY translation
  `)
  const results = []
  while (stmt.step()) {
    results.push(stmt.getAsObject().translation)
  }
  stmt.free()
  return results
}

export async function searchVerses(query, translation = 'KJV') {
  if (!query || query.trim().length < 2) return []

  const database = await openDatabase()
  const trimmed = query.trim()

  const looksLikeReference = /^(\d?\s?[a-zA-Z]+)\s+\d/i.test(trimmed)

  if (looksLikeReference) {
    return searchByReference(database, trimmed, translation)
  } else {
    return searchByKeyword(database, trimmed, translation)
  }
}

function searchByReference(database, query, translation) {
  const parts = query.match(/^(\d?\s?[a-zA-Z\s]+?)\s+(\d+)(?::(\d+))?$/)
  if (!parts) return []

  const book = parts[1].trim()
  const chapter = parseInt(parts[2])
  const verse = parts[3] ? parseInt(parts[3]) : null

  let stmt
  const results = []

  if (verse) {
    stmt = database.prepare(`
      SELECT * FROM verses
      WHERE book LIKE ? AND chapter = ? AND verse = ? AND translation = ?
      LIMIT 1
    `)
    stmt.bind([`${book}%`, chapter, verse, translation])
  } else {
    stmt = database.prepare(`
      SELECT * FROM verses
      WHERE book LIKE ? AND chapter = ? AND translation = ?
      ORDER BY verse LIMIT 50
    `)
    stmt.bind([`${book}%`, chapter, translation])
  }

  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  return results
}

function searchByKeyword(database, query, translation) {
  const stmt = database.prepare(`
    SELECT * FROM verses
    WHERE text LIKE ? AND translation = ?
    ORDER BY book, chapter, verse
    LIMIT 20
  `)
  stmt.bind([`%${query}%`, translation])

  const results = []
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  return results
}

export async function getVerse(book, chapter, verse, translation = 'KJV') {
  const database = await openDatabase()

  const stmt = database.prepare(`
    SELECT * FROM verses
    WHERE book = ? AND chapter = ? AND verse = ? AND translation = ?
    LIMIT 1
  `)
  stmt.bind([book, chapter, verse, translation])

  const result = stmt.step() ? stmt.getAsObject() : null
  stmt.free()
  return result
}
