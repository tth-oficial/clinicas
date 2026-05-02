// Módulo cliente-safe: sem imports de next/headers ou server-only code.
// Use lib/theme-server.ts para buscar o tema do Supabase em Server Components.

export interface Tema {
  corPrimaria: string
  corDestaque: string
  corFundo: string
  corSidebar: string
  corSidebarTexto: string
  corCard: string
  corBorda: string
  corTexto: string
  corTextoSuave: string
  fonte: string
  nomeExibicao: string
  logoUrl: string | null
  faviconUrl: string | null
  slogan: string | null
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export function gerarTema(corPrimaria: string, config?: Partial<Tema>): Tema {
  const [h, s, l] = hexToHsl(corPrimaria)

  const corSidebar = config?.corSidebar || hslToHex(h, Math.min(s + 10, 100), Math.max(l - 20, 15))
  const corDestaque = config?.corDestaque || hslToHex(h, Math.min(s + 15, 100), Math.min(l + 10, 65))
  const corFundo = config?.corFundo || hslToHex(h, Math.max(s - 40, 8), 96)
  const corBorda = hslToHex(h, Math.max(s - 35, 10), 88)

  return {
    corPrimaria,
    corDestaque,
    corFundo,
    corSidebar,
    corSidebarTexto: '#FFFFFF',
    corCard: '#FFFFFF',
    corBorda,
    corTexto: '#1A1A1A',
    corTextoSuave: '#6B7280',
    fonte: config?.fonte || 'Plus Jakarta Sans',
    nomeExibicao: config?.nomeExibicao || 'Clínica',
    logoUrl: config?.logoUrl ?? null,
    faviconUrl: config?.faviconUrl ?? null,
    slogan: config?.slogan ?? null,
  }
}

export function temaParaCss(tema: Tema): string {
  return `
    --cor-primaria: ${tema.corPrimaria};
    --cor-destaque: ${tema.corDestaque};
    --cor-fundo: ${tema.corFundo};
    --cor-sidebar: ${tema.corSidebar};
    --cor-sidebar-texto: ${tema.corSidebarTexto};
    --cor-card: ${tema.corCard};
    --cor-borda: ${tema.corBorda};
    --cor-texto: ${tema.corTexto};
    --cor-texto-suave: ${tema.corTextoSuave};
    --font-clinica: '${tema.fonte}', sans-serif;
  `.trim()
}
