import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'amoled'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'amoled',
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'app-theme' }
  )
)
