// src/renderer/src/pages/Display.jsx
import { useState, useEffect } from 'react'
import './Display.css'

export default function Display() {
  const [verse, setVerse] = useState(null)
  const [isBlank, setIsBlank] = useState(false)

  useEffect(() => {
    window.electron.onReceiveContent((payload) => {
      if (payload.type === 'verse') {
        setVerse(payload)
        setIsBlank(false)
      }
    })

    window.electron.onSetBlank((blank) => {
      setIsBlank(blank)
    })

    return () => {
      window.electron.removeListener('receive-content')
      window.electron.removeListener('set-blank')
    }
  }, [])

  if (isBlank) return <div className="display-blank" />

  if (!verse) {
    return (
      <div className="display-waiting">
        <p className="waiting-text">Ready</p>
      </div>
    )
  }

  return (
    <div className="display-screen">
      {/* key forces remount on new verse, re-triggering the CSS fade */}
      <div className="display-content" key={verse.reference}>
        <p className="display-text">{verse.text}</p>
        <p className="display-reference">
          {verse.reference} — {verse.translation}
        </p>
      </div>
    </div>
  )
}
