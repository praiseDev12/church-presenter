const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  // ── Phase 1 ──────────────────────────────────────────────
  sendToDisplay: (payload) => ipcRenderer.send('send-to-display', payload),
  setBlank: (isBlank) => ipcRenderer.send('set-blank', isBlank),
  onReceiveContent: (cb) => ipcRenderer.on('receive-content', (_, p) => cb(p)),
  onSetBlank: (cb) => ipcRenderer.on('set-blank', (_, v) => cb(v)),
  removeListener: (channel) => ipcRenderer.removeAllListeners(channel),

  // ── Phase 2 ──────────────────────────────────────────────
  searchVerses: (query, translation) => ipcRenderer.invoke('search-verses', query, translation),
  getVerse: (book, chapter, verse, translation) =>
    ipcRenderer.invoke('get-verse', book, chapter, verse, translation),
  getTranslations: () => ipcRenderer.invoke('get-translations'),

  // ── Phase 3 ──────────────────────────────────────────────
  getThemes: () => ipcRenderer.invoke('get-themes'),
  getActiveTheme: () => ipcRenderer.invoke('get-active-theme'),
  setTheme: (themeName) => ipcRenderer.send('set-theme', themeName),
  saveCustomTheme: (theme) => ipcRenderer.send('save-custom-theme', theme),
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  moveToDisplay: (displayId) => ipcRenderer.send('move-to-display', displayId),

  // Listeners for display window
  onApplyTheme: (cb) => ipcRenderer.on('apply-theme', (_, theme) => cb(theme)),
  onThemeChanged: (cb) => ipcRenderer.on('theme-changed', (_, theme) => cb(theme)),
  onPreviewUpdate: (cb) => ipcRenderer.on('preview-update', (_, data) => cb(data)),

  // Add to contextBridge.exposeInMainWorld alongside existing functions

  // ── Phase 4 ──────────────────────────────────────────────────
  startTranscription: () => ipcRenderer.send('start-transcription'),
  stopTranscription: () => ipcRenderer.send('stop-transcription'),
  sendAudioChunk: (buffer) => ipcRenderer.send('audio-chunk', buffer),
  setDetectionMode: (mode) => ipcRenderer.send('set-detection-mode', mode),
  displayDetectedVerse: (ref) => ipcRenderer.send('display-detected-verse', ref),

  // Listeners
  onTranscriptUpdate: (cb) => ipcRenderer.on('transcript-update', (_, text) => cb(text)),
  onScriptureDetected: (cb) => ipcRenderer.on('scripture-detected', (_, ref) => cb(ref)),
  onTranscriptionError: (cb) => ipcRenderer.on('transcription-error', (_, msg) => cb(msg))
})
