// src/renderer/src/App.jsx
import { useState, useCallback, useRef, useEffect } from 'react'

export default function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [activeVerse, setActiveVerse] = useState(null)
  const [isBlank, setIsBlank] = useState(false)
  const debounceTimer = useRef(null)

  // Add to existing state in App.jsx
  const [theme, setTheme] = useState(null)
  const [themes, setThemes] = useState({})
  const [previewSrc, setPreviewSrc] = useState(null)
  const [displays, setDisplays] = useState([])
  const [showThemeEditor, setShowThemeEditor] = useState(false)
  const [customTheme, setCustomTheme] = useState(null)

  const [translation, setTranslation] = useState('KJV')
  const [translations, setTranslations] = useState(['KJV'])

  // Load available translations on mount
  useEffect(() => {
    window.electron.getTranslations().then(setTranslations)
  }, [])

  useEffect(() => {
    // Load themes and active theme
    window.electron.getThemes().then(setThemes)
    window.electron.getActiveTheme().then((t) => {
      setTheme(t)
      setCustomTheme(t)
    })

    // Load connected displays
    window.electron.getDisplays().then(setDisplays)

    // Listen for preview thumbnail updates
    window.electron.onPreviewUpdate((dataUrl) => {
      setPreviewSrc(dataUrl)
    })

    // Listen for theme changes confirmed by main process
    window.electron.onThemeChanged((newTheme) => {
      setTheme(newTheme)
      setCustomTheme(newTheme)
    })
  }, [])

  const performSearch = useCallback(
    async (q, trans = translation) => {
      if (!q || q.trim().length < 2) {
        setResults([])
        return
      }
      setIsSearching(true)
      try {
        const verses = await window.electron.searchVerses(q, trans)
        setResults(verses)
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setIsSearching(false)
      }
    },
    [translation]
  )

  // Handle translation change
  const handleTranslationChange = (e) => {
    const newTranslation = e.target.value
    setTranslation(newTranslation)
    if (query.length > 1) {
      performSearch(query, newTranslation)
    }
  }

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
            placeholder='Try "John 3:16" or "fear not"'
            autoFocus
          />
          <select
            className="translation-select"
            value={translation}
            onChange={handleTranslationChange}
          >
            {translations.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {isSearching && <p className="searching-text">Searching...</p>}
        </div>

        {/* Projector Preview */}
        <div className="preview-section">
          <div className="section-header">
            <span className="section-label">Projector preview</span>
            {displays.length > 1 && (
              <select
                className="display-select"
                onChange={(e) => window.electron.moveToDisplay(Number(e.target.value))}
              >
                {displays.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.isPrimary ? 'Primary' : 'Projector'} — {d.label}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="preview-frame">
            {previewSrc ? (
              <img src={previewSrc} alt="Projector preview" className="preview-img" />
            ) : (
              <div className="preview-placeholder">Preview loading...</div>
            )}
          </div>
        </div>

        {/* Theme Selector */}
        <div className="theme-section">
          <div className="section-header">
            <span className="section-label">Theme</span>
            <button className="btn-small" onClick={() => setShowThemeEditor(!showThemeEditor)}>
              {showThemeEditor ? 'Close editor' : 'Customize'}
            </button>
          </div>

          {/* Preset theme buttons */}
          <div className="theme-presets">
            {Object.keys(themes).map((name) => (
              <button
                key={name}
                className={`theme-btn ${theme?.name === name ? 'active' : ''}`}
                style={{
                  background: themes[name].background,
                  color: themes[name].textColor,
                  border: theme?.name === name ? '2px solid #4f46e5' : '2px solid transparent'
                }}
                onClick={() => window.electron.setTheme(name)}
              >
                {name}
              </button>
            ))}
          </div>

          {/* Custom theme editor */}
          {showThemeEditor && customTheme && (
            <div className="theme-editor">
              <div className="editor-row">
                <label>Background</label>
                <input
                  type="color"
                  value={customTheme.background}
                  onChange={(e) => setCustomTheme({ ...customTheme, background: e.target.value })}
                />
              </div>

              <div className="editor-row">
                <label>Text color</label>
                <input
                  type="color"
                  value={customTheme.textColor}
                  onChange={(e) => setCustomTheme({ ...customTheme, textColor: e.target.value })}
                />
              </div>

              <div className="editor-row">
                <label>Reference color</label>
                <input
                  type="color"
                  value={customTheme.referenceColor}
                  onChange={(e) =>
                    setCustomTheme({ ...customTheme, referenceColor: e.target.value })
                  }
                />
              </div>

              <div className="editor-row">
                <label>Font size — {customTheme.fontSize}px</label>
                <input
                  type="range"
                  min="24"
                  max="96"
                  value={customTheme.fontSize}
                  onChange={(e) =>
                    setCustomTheme({ ...customTheme, fontSize: Number(e.target.value) })
                  }
                />
              </div>

              <div className="editor-row">
                <label>Font</label>
                <select
                  value={customTheme.fontFamily}
                  onChange={(e) => setCustomTheme({ ...customTheme, fontFamily: e.target.value })}
                  className="translation-select"
                >
                  <option value="Georgia, serif">Georgia</option>
                  <option value="Palatino, serif">Palatino</option>
                  <option value="'Times New Roman', serif">Times New Roman</option>
                  <option value="Arial, sans-serif">Arial</option>
                  <option value="'Trebuchet MS', sans-serif">Trebuchet</option>
                </select>
              </div>

              <div className="editor-row">
                <label>Text align</label>
                <select
                  value={customTheme.textAlign || 'center'}
                  onChange={(e) => setCustomTheme({ ...customTheme, textAlign: e.target.value })}
                  className="translation-select"
                >
                  <option value="center">Center</option>
                  <option value="left">Left</option>
                </select>
              </div>

              <div className="editor-row">
                <label>Side padding — {customTheme.padding || 10}%</label>
                <input
                  type="range"
                  min="2"
                  max="25"
                  value={customTheme.padding || 10}
                  onChange={(e) =>
                    setCustomTheme({ ...customTheme, padding: Number(e.target.value) })
                  }
                />
              </div>

              <button
                className="btn-primary"
                onClick={() => window.electron.saveCustomTheme(customTheme)}
              >
                Apply custom theme
              </button>
            </div>
          )}
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
