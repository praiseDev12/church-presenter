// src/main/themeStore.js
import Store from 'electron-store'

const store = new Store({
  name: 'themes',
  defaults: {
    activeTheme: 'Classic Dark',
    customTheme: null
  }
})

// Built-in preset themes
export const PRESET_THEMES = {
  'Classic Dark': {
    name: 'Classic Dark',
    background: '#000000',
    textColor: '#FFFFFF',
    referenceColor: '#AAAAAA',
    fontSize: 52,
    fontFamily: 'Georgia, serif',
    backgroundImage: null,
    textAlign: 'center',
    padding: 10
  },
  'Royal Blue': {
    name: 'Royal Blue',
    background: '#0A1628',
    textColor: '#FFFFFF',
    referenceColor: '#7EB3E8',
    fontSize: 48,
    fontFamily: 'Palatino, serif',
    backgroundImage: null,
    textAlign: 'center',
    padding: 10
  },
  'Light Sunday': {
    name: 'Light Sunday',
    background: '#F8F6F0',
    textColor: '#1A1A1A',
    referenceColor: '#555555',
    fontSize: 48,
    fontFamily: 'Georgia, serif',
    backgroundImage: null,
    textAlign: 'center',
    padding: 10
  },
  'Deep Purple': {
    name: 'Deep Purple',
    background: '#1A0533',
    textColor: '#F0E6FF',
    referenceColor: '#B388FF',
    fontSize: 50,
    fontFamily: 'Georgia, serif',
    backgroundImage: null,
    textAlign: 'center',
    padding: 10
  },
  'Forest Green': {
    name: 'Forest Green',
    background: '#0D2B1A',
    textColor: '#E8F5E9',
    referenceColor: '#81C784',
    fontSize: 48,
    fontFamily: 'Georgia, serif',
    backgroundImage: null,
    textAlign: 'center',
    padding: 10
  }
}

export function getActiveTheme() {
  const activeThemeName = store.get('activeTheme')
  const customTheme = store.get('customTheme')

  if (activeThemeName === 'Custom' && customTheme) {
    return customTheme
  }

  return PRESET_THEMES[activeThemeName] || PRESET_THEMES['Classic Dark']
}

export function setActiveTheme(themeName) {
  store.set('activeTheme', themeName)
}

export function saveCustomTheme(theme) {
  store.set('customTheme', { ...theme, name: 'Custom' })
  store.set('activeTheme', 'Custom')
}

export function getAllThemes() {
  const themes = { ...PRESET_THEMES }
  const custom = store.get('customTheme')
  if (custom) themes['Custom'] = custom
  return themes
}
