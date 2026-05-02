import type { Tema } from '@/lib/theme'

// Fallback local — usado apenas se o Supabase não estiver disponível
export const TEMA_FALLBACK: Tema = {
  corPrimaria:     '#1B5E4F',
  corDestaque:     '#2D8B73',
  corFundo:        '#F0F7F5',
  corSidebar:      '#1A3C35',
  corSidebarTexto: '#FFFFFF',
  corCard:         '#FFFFFF',
  corBorda:        '#E2EDE9',
  corTexto:        '#1A1A1A',
  corTextoSuave:   '#6B7280',
  fonte:           'Plus Jakarta Sans',
  nomeExibicao:    'Clínica',
  logoUrl:         null,
  faviconUrl:      null,
  slogan:          null,
}
