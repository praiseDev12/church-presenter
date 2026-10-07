// src/renderer/src/pages/Display.jsx
import { useState, useEffect } from 'react'

export default function Display() {
  const [verse, setVerse] = useState(null)
  const [isBlank, setIsBlank] = useState(false)
  const [theme, setTheme] = useState({
    background: '#000000',
    textColor: '#FFFFFF',
    referenceColor: '#AAAAAA',
    fontSize: 52,
    fontFamily: 'Georgia, serif',
    textAlign: 'center',
    padding: 10,
    backgroundImage: null
  })

  useEffect(() => {
    // Load active theme on mount
    window.electron.getActiveTheme().then(setTheme)

    window.electron.onReceiveContent((payload) => {
      if (payload.type === 'verse') {
        setVerse(payload)
        setIsBlank(false)
      }
    })

    window.electron.onSetBlank((blank) => setIsBlank(blank))

    window.electron.onApplyTheme((newTheme) => setTheme(newTheme))

    return () => {
      window.electron.removeListener('receive-content')
      window.electron.removeListener('set-blank')
      window.electron.removeListener('apply-theme')
    }
  }, [])

  const screenStyle = {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    cursor: 'none',
    backgroundColor: theme.background,
    backgroundImage: theme.backgroundImage ? `url(${theme.backgroundImage})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    transition: 'background-color 0.5s ease'
  }

  if (isBlank) {
    return <div style={{ ...screenStyle, backgroundColor: '#000000', backgroundImage: 'none' }} />
  }

  if (!verse) {
    return (
      <div style={screenStyle}>
        <p style={{ color: '#1a1a1a', fontSize: 16, fontFamily: 'sans-serif' }}>Ready</p>
      </div>
    )
  }

  return (
    <div style={screenStyle}>
      <div
        key={verse.reference} // triggers fade on new verse
        style={{
          textAlign: theme.textAlign || 'center',
          padding: `0 ${theme.padding || 10}%`,
          animation: 'fadeIn 0.4s ease forwards'
        }}
      >
        <p
          style={{
            color: theme.textColor,
            fontSize: theme.fontSize,
            fontFamily: theme.fontFamily,
            lineHeight: 1.5,
            margin: 0,
            textShadow: theme.backgroundImage ? '0 2px 8px rgba(0,0,0,0.8)' : 'none'
          }}
        >
          {verse.text}
        </p>
        <p
          style={{
            color: theme.referenceColor,
            fontSize: theme.fontSize * 0.45,
            fontFamily: theme.fontFamily,
            marginTop: '1.5rem',
            fontStyle: 'italic',
            textShadow: theme.backgroundImage ? '0 2px 8px rgba(0,0,0,0.8)' : 'none'
          }}
        >
          {verse.reference} — {verse.translation}
        </p>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
