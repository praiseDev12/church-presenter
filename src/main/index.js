// src/main/index.js
import { app, BrowserWindow, screen, ipcMain } from 'electron'
import { join } from 'path'
import { searchVerses, getVerse, openDatabase } from './database.js'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = join(__filename, '..')

let controlWindow = null
let displayWindow = null

function createWindows() {
  console.log('__dirname is:', __dirname)
  console.log('preload path is:', join(__dirname, '../preload/index.cjs'))
  // --- Control Window ---
  // This is what the operator sees on their laptop screen
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
      contextIsolation: true, // security: keep Node.js separate from renderer
      nodeIntegration: false // security: renderer cannot use Node.js directly
    }
  })

  // --- Display Window ---
  // This is what appears on the projector/TV
  // We check if there is an external monitor plugged in
  const allDisplays = screen.getAllDisplays()
  const primaryDisplay = screen.getPrimaryDisplay()
  const externalDisplay = allDisplays.find((d) => d.id !== primaryDisplay.id)

  displayWindow = new BrowserWindow({
    // If projector is connected, open there. Otherwise open beside control window.
    x: externalDisplay ? externalDisplay.bounds.x : primaryDisplay.bounds.x + 200,
    y: externalDisplay ? externalDisplay.bounds.y : primaryDisplay.bounds.y + 200,
    width: externalDisplay ? externalDisplay.bounds.width : 800,
    height: externalDisplay ? externalDisplay.bounds.height : 500,
    fullscreen: !!externalDisplay, // only go fullscreen if projector is connected
    title: 'Church Presenter — Display',
    frame: false, // no title bar or window chrome on the projector
    backgroundColor: '#000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Load the React app into both windows
  // In development, Vite serves the app at localhost:5173
  // The display window loads the same app but at the /display route
  if (process.env['ELECTRON_RENDERER_URL']) {
    controlWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    displayWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '#display')
  } else {
    controlWindow.loadFile(join(__dirname, '../renderer/index.html'))
    displayWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: 'display'
    })
  }

  // Open DevTools in development — helpful for debugging
  if (process.env.NODE_ENV === 'development') {
    controlWindow.webContents.openDevTools()
  }
}

// --- IPC handlers ---
// This is the post office. Messages from either window arrive here.

// When the control window sends 'send-to-display', forward it to the display window
ipcMain.on('send-to-display', (event, payload) => {
  if (displayWindow) {
    displayWindow.webContents.send('receive-content', payload)
  }
})

ipcMain.handle('search-verses', async (event, query) => {
  return await searchVerses(query)
})

ipcMain.handle('get-verse', async (event, book, chapter, verse) => {
  return await getVerse(book, chapter, verse)
})

// When the control window blanks the screen
ipcMain.on('set-blank', (event, isBlank) => {
  if (displayWindow) {
    displayWindow.webContents.send('set-blank', isBlank)
  }
})

ipcMain.handle('debug-db', async () => {
  const database = await openDatabase()

  // Check total verse count
  const countStmt = database.prepare('SELECT COUNT(*) as count FROM verses')
  countStmt.step()
  const count = countStmt.getAsObject()
  countStmt.free()

  // Get the first 3 verses to see what the data looks like
  const sampleStmt = database.prepare('SELECT * FROM verses LIMIT 3')
  const samples = []
  while (sampleStmt.step()) {
    samples.push(sampleStmt.getAsObject())
  }
  sampleStmt.free()

  return { count, samples }
})

app.whenReady().then(createWindows)

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
