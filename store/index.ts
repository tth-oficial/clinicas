import { create } from 'zustand'
import type { Clinica } from '@/types'

interface AppState {
  clinicaId: string | null
  clinica: Clinica | null
  setClinica: (clinica: Clinica) => void
  clearClinica: () => void
}

export const useAppStore = create<AppState>(set => ({
  clinicaId: null,
  clinica: null,
  setClinica: (clinica) => set({ clinica, clinicaId: clinica.id }),
  clearClinica: () => set({ clinica: null, clinicaId: null }),
}))
