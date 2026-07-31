// src/renderer/src/App.jsx
import { useState, useCallback, useRef } from 'react'
import './App.css'

export default function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [activeVerse, setActiveVerse] = useState(null)
  const [isBlank, setIsBlank] = useState(false)
  const debounceTimer = useRef(null)

  const performSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 2) {
      setResults([])
      return
    }
    setIsSearching(true)
    try {
      const verses = await window.electron.searchVerses(q)
      setResults(verses)
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleQueryChange = (e) => {
    const val = e.target.value
    setQuery(val)

    // Debounce — wait 300ms after user stops typing
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      performSearch(val)
    }, 300)
  }

  const sendToProjector = (verse) => {
    const payload = {
      type: 'verse',
      book: verse.book,
      chapter: verse.chapter,
      verse: verse.verse,
      text: verse.text,
      translation: verse.translation,
      reference: `${verse.book} ${verse.chapter}:${verse.verse}`
    }
    window.electron.sendToDisplay(payload)
    setActiveVerse(verse)
    setIsBlank(false)
  }

  const toggleBlank = () => {
    const next = !isBlank
    setIsBlank(next)
    window.electron.setBlank(next)
  }

  return (
    <div className="control-panel">
      <header className="control-header">
        <h1>Church Presenter</h1>
        <button className={`btn-blank ${isBlank ? 'active' : ''}`} onClick={toggleBlank}>
          {isBlank ? '● Screen blank' : 'Blank screen'}
        </button>
      </header>

      <div className="control-body">
        {/* Currently showing */}
        {activeVerse && !isBlank && (
          <div className="now-showing">
            <span className="now-label">Now showing</span>
            <span className="now-reference">
              {activeVerse.book} {activeVerse.chapter}:{activeVerse.verse}
            </span>
          </div>
        )}
        {/* Search */}
        <div className="search-section">
          <input
            className="search-input"
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder='Try "John 3:16" or "fear not" or "love your enemies"'
            autoFocus
          />
          {isSearching && <p className="searching-text">Searching...</p>}
        </div>
        {/* Results */}
        <div className="results-list">
          {results.length === 0 && query.length > 1 && !isSearching && (
            <p className="no-results">No results for &quot;{query}&quot;</p>
          )}

          {results.map((verse, i) => (
            <div key={i} className={`result-item ${activeVerse?.id === verse.id ? 'active' : ''}`}>
              <div className="result-header">
                <span className="result-reference">
                  {verse.book} {verse.chapter}:{verse.verse}
                </span>
                <span className="result-translation">{verse.translation}</span>
              </div>
              <p className="result-text">{verse.text}</p>
              <button className="btn-send" onClick={() => sendToProjector(verse)}>
                {activeVerse?.id === verse.id ? '✓ Showing' : 'Send to projector'}
              </button>
            </div>
          ))}
        </div>
        {/* <button
          onClick={async () => {
            const result = await window.electron.debugDb()
            console.log('DB DEBUG:', result)
            alert(JSON.stringify(result, null, 2))
          }}
        >
          Debug DB
        </button> */}
      </div>
    </div>
  )
}
