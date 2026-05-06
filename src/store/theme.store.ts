import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'warm' | 'amoled'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'warm',
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'app-theme' }
  )
)
