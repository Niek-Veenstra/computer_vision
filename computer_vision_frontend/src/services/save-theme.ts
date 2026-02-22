type Theme = 'dark' | 'light'

const key = 'theme'
const saveThemeImpl = {
  saveTheme: (theme: string) => {
    localStorage.setItem(key, theme)
  },
  getTheme: () =>
    (localStorage.getItem(key) as Theme) ??
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
}

export const saveThemeService: {
  saveTheme: (theme: string) => void
  getTheme: () => Theme
} = saveThemeImpl
