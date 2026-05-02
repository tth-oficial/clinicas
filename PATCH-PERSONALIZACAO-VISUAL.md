# PATCH — PERSONALIZAÇÃO VISUAL
# Aplique estas alterações nos arquivos já gerados.
# Não precisa recriar nada — só substituir os trechos indicados.

---

## 1. CLAUDE.md — substituir a seção "IDENTIDADE VISUAL"

REMOVER:
```
## IDENTIDADE VISUAL

```
Verde Opus:    #1B5E4F  (institucional)
Verde Claro:   #2D8B73  (destaque, CTAs)
Preto Opus:    #0A0F0D  (fundo dominante)
Off-white:     #F4F1EA  (cards, texto)
Cinza escuro:  #1C1F1E  (fundo do app)
```

Fonte: DM Sans (Google Fonts) — 400/500/600/700
Tom: dark, sóbrio, institucional. Sem gradientes coloridos. Parece software sério.
Proporção: 70% escuro · 20% off-white · 10% verde como acento.
```

INSERIR:
```
## IDENTIDADE VISUAL

O sistema não tem identidade visual própria fixa.
Cada clínica tem suas próprias cores, logo e nome — lidos do banco no boot da aplicação.

### Variáveis CSS dinâmicas (injetadas via ThemeProvider no layout raiz)
--cor-primaria        ex: #1B5E4F  (cor principal da clínica)
--cor-destaque        ex: #2D8B73  (botões, CTAs, links ativos)
--cor-fundo           ex: #F0F7F5  (fundo geral do app — claro por padrão)
--cor-sidebar         ex: #1A3C35  (sidebar — mais escura que a primária)
--cor-sidebar-texto   ex: #FFFFFF  (texto da sidebar)
--cor-card            ex: #FFFFFF  (fundo de cards)
--cor-borda           ex: #E2EDE9  (bordas, divisores)
--cor-texto           ex: #1A1A1A  (texto principal)
--cor-texto-suave     ex: #6B7280  (texto secundário)

### Padrão claro (fundo branco/cinza claro)
Fundo do app:    var(--cor-fundo)      → cinza clarinho, nunca branco puro
Cards:           var(--cor-card)       → branco
Sidebar:         var(--cor-sidebar)    → tom escuro da cor primária da clínica
Header:          var(--cor-card)       → branco com borda inferior suave
Texto:           var(--cor-texto)      → quase preto

### Geração automática de variáveis a partir de uma só cor
O sistema recebe apenas a `cor_primaria` da clínica e gera todas as outras
automaticamente via função `gerarTema(corPrimaria)` em lib/theme.ts.
O designer da clínica só precisa fornecer uma cor hex.

### Tipografia
A fonte também é configurável por clínica (campo `fonte` no banco).
Padrão: Plus Jakarta Sans (clean, moderno, ótimo para saúde)
Alternativas comuns: Inter, Nunito, Poppins
Todas via Google Fonts, carregadas dinamicamente.
```

---

## 2. ETAPA-1-FUNDACAO.md — 4 trechos a alterar

### 2a. Na migration SQL — adicionar campos em clinica_config

Localizar o bloco da tabela `clinica_config` e adicionar estas colunas:

```sql
-- Adicionar após cor_fundo TEXT NOT NULL DEFAULT '#0A0F0D':
cor_sidebar TEXT NOT NULL DEFAULT '#1A3C35',
fonte TEXT NOT NULL DEFAULT 'Plus Jakarta Sans',
logo_url TEXT,
favicon_url TEXT,
nome_exibicao TEXT,   -- nome que aparece no sistema (pode ser diferente do nome legal)
slogan TEXT,          -- aparece abaixo do logo na sidebar
```

### 2b. Substituir o seed da clínica demo

REMOVER:
```sql
INSERT INTO clinica_config (clinica_id, agente_nome, agente_prompt)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Luna',
  'Você é Luna...'
);
```

INSERIR:
```sql
INSERT INTO clinica_config (
  clinica_id, agente_nome, agente_prompt,
  cor_principal, cor_destaque, cor_fundo, cor_sidebar,
  fonte, nome_exibicao, slogan
) VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Luna',
  'Você é Luna, assistente virtual da Clínica Estética Lumina. Sua função é atender pacientes pelo WhatsApp de forma profissional e acolhedora. Você agenda consultas, tira dúvidas sobre procedimentos e qualifica leads. Nunca invente preços — diga que vai verificar com a equipe. Seja sempre gentil e use o nome da pessoa.',
  '#1B5E4F',
  '#2D8B73',
  '#F0F7F5',
  '#1A3C35',
  'Plus Jakarta Sans',
  'Clínica Estética Lumina',
  'Cuidado que transforma'
);
```

### 2c. Substituir a seção de tipografia em `app/layout.tsx`

REMOVER:
```typescript
import { DM_Sans } from 'next/font/google'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
})
```

INSERIR:
```typescript
// A fonte é carregada dinamicamente por clínica via ThemeProvider
// O layout raiz usa apenas uma fonte base como fallback
import { Plus_Jakarta_Sans } from 'next/font/google'

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-base',
  display: 'swap',
})
```

Também alterar no `<html>`:
```typescript
// ANTES:
<html lang="pt-BR" className={dmSans.variable}>
<body className="font-sans antialiased bg-[#1C1F1E] text-[#F4F1EA]">

// DEPOIS:
<html lang="pt-BR" className={jakartaSans.variable}>
<body className="font-sans antialiased bg-[var(--cor-fundo,#F5F7FA)] text-[var(--cor-texto,#1A1A1A)]">
```

### 2d. Substituir o comentário do Dashboard

REMOVER qualquer menção a "dark" ou "tema escuro" nos comentários do dashboard.

---

## 3. ARQUIVOS NOVOS A CRIAR (não existiam antes)

### `lib/theme.ts` — gerador de tema a partir de uma cor

```typescript
import { createClient } from '@/lib/supabase/server'

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

// Converte hex para HSL
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

// Gera tema completo a partir de uma cor primária
export function gerarTema(corPrimaria: string, config?: Partial<Tema>): Tema {
  const [h, s, l] = hexToHsl(corPrimaria)

  // Regra: sidebar = primária mais escura e saturada
  const corSidebar = config?.corSidebar || hslToHex(h, Math.min(s + 10, 100), Math.max(l - 20, 15))

  // Destaque = primária mais viva (levemente mais clara e saturada)
  const corDestaque = hslToHex(h, Math.min(s + 15, 100), Math.min(l + 10, 65))

  // Fundo = primária quase branca (alta luminosidade, baixa saturação)
  const corFundo = hslToHex(h, Math.max(s - 40, 8), 96)

  // Borda = fundo levemente mais escuro
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
    logoUrl: config?.logoUrl || null,
    faviconUrl: config?.faviconUrl || null,
    slogan: config?.slogan || null,
    ...config,
  }
}

// Converte tema em CSS variables string
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

// Busca tema da clínica do usuário logado
export async function getTemaClinica(clinicaId: string): Promise<Tema> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('clinica_config')
    .select('cor_principal, cor_destaque, cor_fundo, cor_sidebar, fonte, nome_exibicao, logo_url, favicon_url, slogan')
    .eq('clinica_id', clinicaId)
    .single()

  if (!data) return gerarTema('#1B5E4F')

  return gerarTema(data.cor_principal, {
    corDestaque: data.cor_destaque,
    corFundo: data.cor_fundo,
    corSidebar: data.cor_sidebar,
    fonte: data.fonte,
    nomeExibicao: data.nome_exibicao,
    logoUrl: data.logo_url,
    faviconUrl: data.favicon_url,
    slogan: data.slogan,
  })
}
```

---

### `components/providers/ThemeProvider.tsx` — injeta CSS variables no DOM

```typescript
'use client'

import { useEffect } from 'react'
import { temaParaCss, type Tema } from '@/lib/theme'

interface ThemeProviderProps {
  tema: Tema
  children: React.ReactNode
}

export function ThemeProvider({ tema, children }: ThemeProviderProps) {
  useEffect(() => {
    // Injeta CSS variables no :root
    const styleEl = document.getElementById('opus-theme') || document.createElement('style')
    styleEl.id = 'opus-theme'
    styleEl.textContent = `:root { ${temaParaCss(tema)} }`
    if (!document.getElementById('opus-theme')) {
      document.head.appendChild(styleEl)
    }

    // Carrega fonte Google dinamicamente
    const linkId = 'opus-font'
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link')
      link.id = linkId
      link.rel = 'stylesheet'
      link.href = `https://fonts.googleapis.com/css2?family=${tema.fonte.replace(/ /g, '+')}:wght@400;500;600;700&display=swap`
      document.head.appendChild(link)
    }

    // Atualiza favicon se configurado
    if (tema.faviconUrl) {
      const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
      if (favicon) favicon.href = tema.faviconUrl
    }
  }, [tema])

  return <>{children}</>
}
```

---

### `app/(dashboard)/layout.tsx` — usar ThemeProvider + logo dinâmica

```typescript
import { createClient } from '@/lib/supabase/server'
import { getTemaClinica } from '@/lib/theme'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { getClinicaDoUsuario } from '@/lib/supabase/queries'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const clinica = await getClinicaDoUsuario(user!.id)
  const tema = await getTemaClinica(clinica.id)

  return (
    <ThemeProvider tema={tema}>
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--cor-fundo)' }}>
        <Sidebar clinica={clinica} tema={tema} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header clinica={clinica} tema={tema} />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </ThemeProvider>
  )
}
```

---

### `components/layout/Sidebar.tsx` — logo dinâmica, nome da clínica, sem "Opus"

```typescript
// Props recebidas do layout:
// clinica: { id, nome, ... }
// tema: Tema (com logoUrl, nomeExibicao, slogan, corSidebar, corSidebarTexto)

// Bloco do topo da sidebar (substituir logo fixo):

{tema.logoUrl ? (
  <img
    src={tema.logoUrl}
    alt={tema.nomeExibicao}
    className="h-8 w-auto object-contain"
  />
) : (
  <div className="flex flex-col">
    <span className="text-lg font-bold leading-tight" style={{ color: 'var(--cor-sidebar-texto)' }}>
      {tema.nomeExibicao}
    </span>
    {tema.slogan && (
      <span className="text-xs opacity-60" style={{ color: 'var(--cor-sidebar-texto)' }}>
        {tema.slogan}
      </span>
    )}
  </div>
)}

// Fundo da sidebar:
// style={{ background: 'var(--cor-sidebar)' }}

// Item ativo:
// borda esquerda: style={{ borderColor: 'var(--cor-destaque)' }}
// fundo: 'rgba(255,255,255,0.1)'

// Texto dos itens:
// style={{ color: 'var(--cor-sidebar-texto)' }} com opacity variando (100% ativo, 60% inativo)
```

---

### `components/layout/Header.tsx` — nome da clínica no topo

```typescript
// O header mostra o nome da clínica, não "Opus Clínicas"
// Fundo: var(--cor-card) com borda inferior var(--cor-borda)

<header style={{
  background: 'var(--cor-card)',
  borderBottom: '1px solid var(--cor-borda)'
}}>
  {/* Esquerda: título da página atual */}
  <h1 style={{ color: 'var(--cor-texto)' }}>{tituloPagina}</h1>

  {/* Direita: nome da clínica + avatar */}
  <div className="flex items-center gap-3">
    <span className="text-sm font-medium" style={{ color: 'var(--cor-texto-suave)' }}>
      {clinica.nome}
    </span>
    <Avatar>{/* iniciais do usuário */}</Avatar>
  </div>
</header>
```

---

### `components/shared/KPICard.tsx` — usar CSS variables

```typescript
// Cards sempre brancos (var(--cor-card)) com borda suave
// Accent color dos ícones: var(--cor-primaria)
// Variação positiva: var(--cor-destaque)
// Nunca usar cores hardcoded — sempre CSS variables

<div style={{
  background: 'var(--cor-card)',
  border: '1px solid var(--cor-borda)',
  borderRadius: '12px',
}}>
  <div style={{ color: 'var(--cor-primaria)' }}>
    {icone}
  </div>
  <p style={{ color: 'var(--cor-texto-suave)' }}>{label}</p>
  <p style={{ color: 'var(--cor-texto)' }}>{valor}</p>
  <span style={{ color: positivo ? 'var(--cor-destaque)' : '#EF4444' }}>
    {variacao}
  </span>
</div>
```

---

### `components/shared/Badge.tsx` — usar CSS variables

```typescript
// Badge primário (status ativo, confirmado):
// background: 'color-mix(in srgb, var(--cor-primaria) 15%, transparent)'
// color: 'var(--cor-primaria)'

// Nunca usar classes Tailwind com cores fixas para elementos que devem seguir o tema
// Usar inline style com CSS variables
```

---

## 4. ETAPA-7 — Tela de Configurações: aba Identidade

Substituir o que estava especificado por esta versão mais completa:

### Aba Identidade Visual

```
┌─────────────────────────────────────────────────────┐
│ LOGO                                                  │
│ ┌──────────────────┐                                 │
│ │   [logo atual]   │  [Upload nova logo]             │
│ │   ou iniciais    │  PNG, SVG — recomendado 200px   │
│ └──────────────────┘                                 │
│                                                       │
│ FAVICON                                               │
│ [upload]  32×32px, aparece na aba do navegador       │
│                                                       │
│ NOME DE EXIBIÇÃO                                      │
│ [Clínica Estética Lumina________________]            │
│ Aparece no sistema e nas comunicações                │
│                                                       │
│ SLOGAN (opcional)                                     │
│ [Cuidado que transforma_________________]            │
│ Aparece abaixo do logo na sidebar                    │
│                                                       │
│ COR PRINCIPAL                                         │
│ [color picker]  #1B5E4F                              │
│                                                       │
│ PREVIEW DO TEMA (gerado automaticamente)             │
│ ┌──────────────────────────────────────────┐        │
│ │ [sidebar preview]  [card preview]        │        │
│ │ [botão primário]   [badge ativo]         │        │
│ └──────────────────────────────────────────┘        │
│                                                       │
│ FONTE                                                 │
│ [select: Plus Jakarta Sans ▼]                        │
│ Plus Jakarta Sans · Inter · Nunito · Poppins         │
│                                                       │
│               [Salvar e aplicar]                     │
└─────────────────────────────────────────────────────┘
```

O preview atualiza em tempo real conforme o usuário muda as opções.
Ao salvar: grava no Supabase → ThemeProvider re-renderiza → sistema muda de aparência instantaneamente.

---

## REGRA GERAL PARA TODO O CÓDIGO

**Nunca usar:**
- `bg-[#0A0F0D]` ou qualquer cor hex hardcoded no Tailwind
- Classes como `bg-green-800`, `text-green-600` para elementos temáticos
- Qualquer referência a "Opus Clínicas" visível no front-end

**Sempre usar:**
- `style={{ background: 'var(--cor-primaria)' }}` para elementos temáticos
- `style={{ color: 'var(--cor-texto)' }}` para textos
- Classes Tailwind neutras: `rounded-lg`, `p-4`, `flex`, `gap-2` — sem cor

**Exceção permitida:**
- Cores fixas para estados semânticos universais:
  - Erro: `#EF4444` (vermelho)
  - Sucesso neutro: `#22C55E` (verde — mas só para checkmarks, não como cor primária)
  - Aviso: `#F59E0B` (amarelo)
  - Esses nunca mudam independente do tema da clínica
```
