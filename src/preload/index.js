// src/preload/index.js
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  // ── Functions the CONTROL WINDOW calls ──────────────────────

  // Send content to the projector
  sendToDisplay: (payload) => {
    ipcRenderer.send('send-to-display', payload)
  },

  // Blank or unblank the projector screen
  setBlank: (isBlank) => {
    ipcRenderer.send('set-blank', isBlank)
  },

  // ── Functions the DISPLAY WINDOW listens to ─────────────────

  // Called when new content arrives from the control window
  onReceiveContent: (callback) => {
    ipcRenderer.on('receive-content', (event, payload) => callback(payload))
  },

  // Called when the screen blank state changes
  onSetBlank: (callback) => {
    ipcRenderer.on('set-blank', (event, isBlank) => callback(isBlank))
  },

  // ── Utility ─────────────────────────────────────────────────

  // Clean up listeners when a React component unmounts
  // (important to prevent memory leaks)
  removeListener: (channel) => {
    ipcRenderer.removeAllListeners(channel)
  },

  // invoke returns a Promise with the result — like an async function call
  searchVerses: (query) => ipcRenderer.invoke('search-verses', query),
  getVerse: (book, chapter, verse) => ipcRenderer.invoke('get-verse', book, chapter, verse),

  debugDb: () => ipcRenderer.invoke('debug-db')
})
