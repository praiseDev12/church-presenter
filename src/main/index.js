// src/main/index.js
import { app, BrowserWindow, screen, ipcMain } from 'electron'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { searchVerses, getVerse, openDatabase, getTranslations } from './database.js'
import { getActiveTheme, setActiveTheme, saveCustomTheme, getAllThemes } from './themeStore.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = join(__filename, '..')

let controlWindow = null
let displayWindow = null
let previewInterval = null

function createWindows() {
  controlWindow = new BrowserWindow({
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#2f3241',
      symbolColor: '#74b1be',
      height: 60
    },
    backgroundColor: '#1e1e1e',
    width: 1100,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    title: 'Church Presenter — Control',
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  const allDisplays = screen.getAllDisplays()
  const primaryDisplay = screen.getPrimaryDisplay()
  const externalDisplay = allDisplays.find((d) => d.id !== primaryDisplay.id)

  displayWindow = new BrowserWindow({
    x: externalDisplay ? externalDisplay.bounds.x : primaryDisplay.bounds.x + 200,
    y: externalDisplay ? externalDisplay.bounds.y : primaryDisplay.bounds.y + 200,
    width: externalDisplay ? externalDisplay.bounds.width : 800,
    height: externalDisplay ? externalDisplay.bounds.height : 500,
    fullscreen: !!externalDisplay,
    title: 'Church Presenter — Display',
    frame: false,
    backgroundColor: '#000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    controlWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    displayWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '#display')
  } else {
    controlWindow.loadFile(join(__dirname, '../renderer/index.html'))
    displayWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'display' })
  }

  if (process.env.NODE_ENV === 'development') {
    controlWindow.webContents.openDevTools()
  }

  // Send the active theme to display window once it loads
  displayWindow.webContents.on('did-finish-load', () => {
    const theme = getActiveTheme()
    displayWindow.webContents.send('apply-theme', theme)
  })

  // Start preview thumbnail — capture display window every 2 seconds
  startPreview()

  // Handle projector being plugged in after app starts
  screen.on('display-added', () => moveDisplayToProjector())
  screen.on('display-removed', () => moveDisplayToProjector())
}

function moveDisplayToProjector() {
  if (!displayWindow) return
  const allDisplays = screen.getAllDisplays()
  const primaryDisplay = screen.getPrimaryDisplay()
  const externalDisplay = allDisplays.find((d) => d.id !== primaryDisplay.id)

  if (externalDisplay) {
    displayWindow.setBounds(externalDisplay.bounds)
    displayWindow.setFullScreen(true)
  } else {
    displayWindow.setFullScreen(false)
    displayWindow.setSize(800, 500)
  }
}

function startPreview() {
  if (previewInterval) clearInterval(previewInterval)
  previewInterval = setInterval(async () => {
    if (!displayWindow || !controlWindow) return
    try {
      const image = await displayWindow.webContents.capturePage()
      const thumbnail = image.resize({ width: 320 }).toDataURL()
      controlWindow.webContents.send('preview-update', thumbnail)
    } catch (err) {
      // silently ignore preview errors
    }
  }, 1500)
}

// ── Existing IPC handlers ────────────────────────────────────

ipcMain.on('send-to-display', (event, payload) => {
  if (displayWindow) {
    displayWindow.webContents.send('receive-content', payload)
  }
})

ipcMain.on('set-blank', (event, isBlank) => {
  if (displayWindow) {
    displayWindow.webContents.send('set-blank', isBlank)
  }
})

ipcMain.handle('search-verses', async (event, query, translation) => {
  return await searchVerses(query, translation)
})

ipcMain.handle('get-verse', async (event, book, chapter, verse, translation) => {
  return await getVerse(book, chapter, verse, translation)
})

ipcMain.handle('get-translations', async () => {
  return await getTranslations()
})

// ── New Phase 3 IPC handlers ─────────────────────────────────

ipcMain.handle('get-themes', () => getAllThemes())

ipcMain.handle('get-active-theme', () => getActiveTheme())

ipcMain.on('set-theme', (event, themeName) => {
  setActiveTheme(themeName)
  const theme = getActiveTheme()
  displayWindow.webContents.send('apply-theme', theme)
  // Send back to control window so preview updates
  controlWindow.webContents.send('theme-changed', theme)
})

ipcMain.on('save-custom-theme', (event, theme) => {
  saveCustomTheme(theme)
  displayWindow.webContents.send('apply-theme', theme)
  controlWindow.webContents.send('theme-changed', theme)
})

ipcMain.on('move-to-display', (event, displayId) => {
  const allDisplays = screen.getAllDisplays()
  const target = allDisplays.find((d) => d.id === displayId)
  if (target && displayWindow) {
    displayWindow.setBounds(target.bounds)
    displayWindow.setFullScreen(true)
  }
})

ipcMain.handle('get-displays', () => {
  return screen.getAllDisplays().map((d) => ({
    id: d.id,
    label: `Display ${d.id} (${d.bounds.width}x${d.bounds.height})`,
    isPrimary: d.id === screen.getPrimaryDisplay().id,
    bounds: d.bounds
  }))
})

app.whenReady().then(createWindows)

app.on('window-all-closed', () => {
  if (previewInterval) clearInterval(previewInterval)
  if (process.platform !== 'darwin') app.quit()
})
