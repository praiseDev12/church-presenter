import { useState, useEffect, useRef } from 'react'

export default function SermonListener({ translation = 'KJV' }) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [pendingVerse, setPendingVerse] = useState(null)
  const [detectionMode, setDetectionMode] = useState('standard')
  const [error, setError] = useState(null)
  const [autoDisplay, setAutoDisplay] = useState(false)
  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const autoTimerRef = useRef(null)
  const transcriptEndRef = useRef(null)

  useEffect(() => {
    const handleTranscript = (text) => {
      setTranscript((prev) => (prev + ' ' + text).slice(-500))
      transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const handleScriptureDetected = (ref) => {
      console.log('UI received scripture:', ref) // ← add this to confirm
      setPendingVerse({ ...ref, translation })

      if (autoDisplay) {
        autoTimerRef.current = setTimeout(() => {
          handleApprove({ ...ref, translation })
        }, 3000)
      }
    }

    const handleError = (msg) => {
      setError(msg)
      setIsListening(false)
    }

    window.electron.onTranscriptUpdate(handleTranscript)
    window.electron.onScriptureDetected(handleScriptureDetected)
    window.electron.onTranscriptionError(handleError)

    return () => {
      window.electron.removeListener('transcript-update')
      window.electron.removeListener('scripture-detected')
      window.electron.removeListener('transcription-error')
    }
  }, []) // ← empty dependency array — runs once on mount

  const startListening = async () => {
    setError(null)
    setTranscript('')
    setPendingVerse(null)

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000 // match Deepgram config
        }
      })
      streamRef.current = stream

      // Start Deepgram connection
      window.electron.startTranscription()

      // Capture audio and send chunks to main process
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          const buffer = await event.data.arrayBuffer()
          window.electron.sendAudioChunk(buffer)
        }
      }

      mediaRecorder.start(250) // send chunk every 250ms
      setIsListening(true)
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access and try again.')
      } else {
        setError('Could not access microphone: ' + err.message)
      }
    }
  }

  const stopListening = () => {
    mediaRecorderRef.current?.stop()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    window.electron.stopTranscription()
    setIsListening(false)
    setPendingVerse(null)
    clearTimeout(autoTimerRef.current)
  }

  const handleApprove = (ref) => {
    window.electron.displayDetectedVerse({ ...(ref || pendingVerse), translation })
    setPendingVerse(null)
    clearTimeout(autoTimerRef.current)
  }

  const handleDismiss = () => {
    setPendingVerse(null)
    clearTimeout(autoTimerRef.current)
  }

  const handleModeChange = (mode) => {
    setDetectionMode(mode)
    window.electron.setDetectionMode(mode)
  }

  return (
    <div className="flex flex-col gap-4 p-4 bg-[#1e1e2e] rounded-xl border border-[#2a2a3e]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white uppercase tracking-widest">
          AI Sermon Listener
        </h2>
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            isListening ? 'bg-green-900 text-green-300' : 'bg-[#2a2a3e] text-gray-500'
          }`}
        >
          {isListening ? '● Live' : '○ Off'}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={isListening ? stopListening : startListening}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isListening
              ? 'bg-red-700 hover:bg-red-600 text-white'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
          }`}
        >
          {isListening ? 'Stop listening' : 'Start listening'}
        </button>

        {/* Auto display toggle */}
        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={autoDisplay}
            onChange={(e) => setAutoDisplay(e.target.checked)}
            className="accent-indigo-500"
          />
          Auto-display (3s)
        </label>
      </div>

      {/* Detection mode */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-gray-500 uppercase tracking-wider">
          Detection sensitivity
        </span>
        <div className="flex gap-2">
          {['conservative', 'standard', 'aggressive'].map((mode) => (
            <button
              key={mode}
              onClick={() => handleModeChange(mode)}
              className={`px-3 py-1 rounded-lg text-xs capitalize transition-colors ${
                detectionMode === mode
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[#2a2a3e] text-gray-400 hover:text-white'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Detected verse notification */}
      {pendingVerse && (
        <div className="bg-indigo-900/40 border border-indigo-600 rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-indigo-300 uppercase tracking-wider font-semibold">
              AI detected
            </span>
            {autoDisplay && (
              <span className="text-xs text-indigo-400">Auto-displaying in 3s...</span>
            )}
          </div>
          <p className="text-white font-semibold">
            {pendingVerse.book} {pendingVerse.chapter}:{pendingVerse.verse}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleApprove()}
              className="px-4 py-1.5 bg-green-700 hover:bg-green-600 text-white text-sm rounded-lg transition-colors"
            >
              Display now
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-1.5 bg-[#2a2a3e] hover:bg-[#3a3a4e] text-gray-300 text-sm rounded-lg transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Live transcript */}
      {isListening && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Live transcript</span>
          <div className="bg-[#12121e] rounded-lg p-3 max-h-28 overflow-y-auto">
            <p className="text-gray-400 text-sm leading-relaxed">{transcript || 'Listening...'}</p>
            <div ref={transcriptEndRef} />
          </div>
        </div>
      )}
    </div>
  )
}
