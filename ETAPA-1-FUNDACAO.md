# ETAPA 1 — FUNDAÇÃO
# Cole este prompt no Claude Code para iniciar o projeto.
# Leia o CLAUDE.md antes de qualquer coisa.

---

## OBJETIVO DESTA ETAPA

Construir a fundação completa do sistema:
- Projeto Next.js configurado e funcionando
- Banco de dados Supabase com todas as tabelas
- Autenticação funcional (login/logout)
- Layout base (sidebar + header)
- Dashboard com dados reais do Supabase
- Deploy funcionando na Vercel

Ao final desta etapa, o sistema deve estar rodando em produção com login, dashboard e dados reais.

---

## PASSO 1 — Setup do Projeto

```bash
npx create-next-app@latest opus-clinicas \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*"

cd opus-clinicas

# Dependências principais
npm install @supabase/supabase-js @supabase/ssr
npm install openai
npm install zustand
npm install react-hook-form @hookform/resolvers zod
npm install recharts
npm install lucide-react
npm install date-fns
npm install clsx tailwind-merge

# shadcn/ui setup
npx shadcn@latest init
# Escolher: Default, Zinc, CSS variables: yes

# Componentes shadcn necessários nesta etapa
npx shadcn@latest add button card input label toast sonner
npx shadcn@latest add dropdown-menu avatar separator skeleton
npx shadcn@latest add badge progress tooltip

# Fonte DM Sans
npm install next/font
```

---

## PASSO 2 — Variáveis de Ambiente

Criar `.env.local` na raiz:

```bash
NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
OPENAI_API_KEY=sua_key_aqui
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=sua_key_aqui
WEBHOOK_SECRET=gerar_string_aleatoria_forte
CRON_SECRET=gerar_string_aleatoria_forte
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Criar `.env.example` com as mesmas chaves mas sem valores (commitar este).
Adicionar `.env.local` no `.gitignore`.

---

## PASSO 3 — Migrations do Supabase

Criar pasta `supabase/migrations/` e o arquivo `001_initial_schema.sql`:

```sql
-- Habilitar extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─────────────────────────────────────────────
-- CLÍNICAS
-- ─────────────────────────────────────────────
CREATE TABLE clinicas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  logo_url TEXT,
  responsavel TEXT,
  especialidade TEXT,
  cidade TEXT,
  whatsapp TEXT,
  plano TEXT NOT NULL DEFAULT 'medio' CHECK (plano IN ('entrada', 'medio', 'alto')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- CONFIGURAÇÕES DA CLÍNICA
-- ─────────────────────────────────────────────
CREATE TABLE clinica_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  -- Visual
  cor_principal TEXT NOT NULL DEFAULT '#1B5E4F',
  cor_destaque TEXT NOT NULL DEFAULT '#2D8B73',
  cor_fundo TEXT NOT NULL DEFAULT '#0A0F0D',
  -- OpenAI
  openai_api_key TEXT,
  openai_model TEXT NOT NULL DEFAULT 'gpt-4o',
  -- Evolution API / WhatsApp
  evolution_url TEXT,
  evolution_api_key TEXT,
  evolution_instance TEXT,
  -- Agente IA
  agente_nome TEXT NOT NULL DEFAULT 'Assistente',
  agente_prompt TEXT,
  agente_tom TEXT NOT NULL DEFAULT 'profissional e acolhedor',
  -- Módulos ativos
  modulos_ativos TEXT[] NOT NULL DEFAULT ARRAY[
    'dashboard','crm','whatsapp','agendamento',
    'anti_noshow','leads','followup','nutricao',
    'reaquecimento','ia_decisao','relatorio'
  ],
  -- Google Calendar
  google_calendar_token JSONB,
  google_calendar_id TEXT,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(clinica_id)
);

-- ─────────────────────────────────────────────
-- USUÁRIOS → CLÍNICAS (relação)
-- ─────────────────────────────────────────────
CREATE TABLE usuarios_clinicas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  papel TEXT NOT NULL DEFAULT 'admin' CHECK (papel IN ('admin', 'operador', 'visualizador')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, clinica_id)
);

-- ─────────────────────────────────────────────
-- CONTATOS
-- ─────────────────────────────────────────────
CREATE TABLE contatos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  origem TEXT DEFAULT 'manual',
  notas TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ultimo_atendimento TIMESTAMPTZ,
  total_procedimentos INTEGER NOT NULL DEFAULT 0,
  total_gasto DECIMAL(10,2) NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contatos_clinica ON contatos(clinica_id);
CREATE INDEX idx_contatos_telefone ON contatos(clinica_id, telefone);

-- ─────────────────────────────────────────────
-- LEADS / PIPELINE
-- ─────────────────────────────────────────────
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  contato_id UUID NOT NULL REFERENCES contatos(id) ON DELETE CASCADE,
  servico TEXT NOT NULL,
  valor_estimado DECIMAL(10,2),
  origem TEXT,
  etapa TEXT NOT NULL DEFAULT 'lead' CHECK (
    etapa IN ('lead','consulta_agendada','negociacao','procedimento','pos_venda')
  ),
  temperatura TEXT NOT NULL DEFAULT 'morno' CHECK (
    temperatura IN ('quente','morno','frio')
  ),
  status TEXT NOT NULL DEFAULT 'novo' CHECK (
    status IN ('novo','em_contato','agendado','negociando','convertido','perdido')
  ),
  posicao_kanban INTEGER NOT NULL DEFAULT 0,
  notas TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_clinica ON leads(clinica_id);
CREATE INDEX idx_leads_etapa ON leads(clinica_id, etapa);

-- ─────────────────────────────────────────────
-- AGENDAMENTOS
-- ─────────────────────────────────────────────
CREATE TABLE agendamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  contato_id UUID NOT NULL REFERENCES contatos(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  servico TEXT NOT NULL,
  profissional TEXT,
  data_hora TIMESTAMPTZ NOT NULL,
  duracao_minutos INTEGER NOT NULL DEFAULT 60,
  valor DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'agendado' CHECK (
    status IN ('agendado','confirmado','realizado','no_show','cancelado','remarcado')
  ),
  notas TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agendamentos_clinica ON agendamentos(clinica_id);
CREATE INDEX idx_agendamentos_data ON agendamentos(clinica_id, data_hora);

-- ─────────────────────────────────────────────
-- CONVERSAS WHATSAPP
-- ─────────────────────────────────────────────
CREATE TABLE conversas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  contato_id UUID NOT NULL REFERENCES contatos(id) ON DELETE CASCADE,
  agente_ativo TEXT NOT NULL DEFAULT 'qualificacao',
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','resolvida','aguardando_humano')),
  nao_lidas INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversas_clinica ON conversas(clinica_id);

-- ─────────────────────────────────────────────
-- MENSAGENS
-- ─────────────────────────────────────────────
CREATE TABLE mensagens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversa_id UUID NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
  clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  de TEXT NOT NULL CHECK (de IN ('cliente','agente','sistema')),
  texto TEXT,
  midia_url TEXT,
  tipo_midia TEXT,
  enviado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lido BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_mensagens_conversa ON mensagens(conversa_id);
CREATE INDEX idx_mensagens_clinica_data ON mensagens(clinica_id, enviado_em DESC);

-- ─────────────────────────────────────────────
-- CADÊNCIAS
-- ─────────────────────────────────────────────
CREATE TABLE cadencias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('anti_noshow','followup','nutricao','reaquecimento')),
  contato_id UUID NOT NULL REFERENCES contatos(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  agendamento_id UUID REFERENCES agendamentos(id) ON DELETE SET NULL,
  etapa_atual INTEGER NOT NULL DEFAULT 0,
  total_etapas INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','pausada','concluida','cancelada')),
  proxima_execucao TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cadencias_clinica ON cadencias(clinica_id);
CREATE INDEX idx_cadencias_execucao ON cadencias(status, proxima_execucao) WHERE status = 'ativa';

CREATE TABLE cadencia_etapas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cadencia_id UUID NOT NULL REFERENCES cadencias(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  mensagem_template TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','enviado','sem_resposta','respondido')),
  enviado_em TIMESTAMPTZ,
  resposta_recebida TEXT,
  UNIQUE(cadencia_id, numero)
);

-- ─────────────────────────────────────────────
-- CAMPANHAS
-- ─────────────────────────────────────────────
CREATE TABLE campanhas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('reaquecimento','promocional','lembrete','pesquisa')),
  mensagem_template TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','ativa','pausada','concluida')),
  total_contatos INTEGER NOT NULL DEFAULT 0,
  enviados INTEGER NOT NULL DEFAULT 0,
  responderam INTEGER NOT NULL DEFAULT 0,
  convertidos INTEGER NOT NULL DEFAULT 0,
  receita_gerada DECIMAL(10,2) NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  disparado_em TIMESTAMPTZ,
  concluido_em TIMESTAMPTZ
);

-- ─────────────────────────────────────────────
-- MÉTRICAS DIÁRIAS (snapshot para relatórios)
-- ─────────────────────────────────────────────
CREATE TABLE metricas_diarias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  receita DECIMAL(10,2) NOT NULL DEFAULT 0,
  leads_novos INTEGER NOT NULL DEFAULT 0,
  consultas_realizadas INTEGER NOT NULL DEFAULT 0,
  procedimentos_realizados INTEGER NOT NULL DEFAULT 0,
  no_show_count INTEGER NOT NULL DEFAULT 0,
  no_show_total INTEGER NOT NULL DEFAULT 0,
  taxa_conversao DECIMAL(5,2),
  UNIQUE(clinica_id, data)
);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
ALTER TABLE clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinica_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE cadencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE cadencia_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE metricas_diarias ENABLE ROW LEVEL SECURITY;

-- Policy: usuário só acessa clínicas onde está vinculado
CREATE POLICY "usuarios_acessam_proprias_clinicas" ON clinicas
  FOR ALL USING (
    id IN (
      SELECT clinica_id FROM usuarios_clinicas WHERE user_id = auth.uid()
    )
  );

-- Policies das outras tabelas (mesmo padrão)
CREATE POLICY "acesso_por_clinica" ON contatos
  FOR ALL USING (clinica_id IN (SELECT clinica_id FROM usuarios_clinicas WHERE user_id = auth.uid()));

CREATE POLICY "acesso_por_clinica" ON leads
  FOR ALL USING (clinica_id IN (SELECT clinica_id FROM usuarios_clinicas WHERE user_id = auth.uid()));

CREATE POLICY "acesso_por_clinica" ON agendamentos
  FOR ALL USING (clinica_id IN (SELECT clinica_id FROM usuarios_clinicas WHERE user_id = auth.uid()));

CREATE POLICY "acesso_por_clinica" ON conversas
  FOR ALL USING (clinica_id IN (SELECT clinica_id FROM usuarios_clinicas WHERE user_id = auth.uid()));

CREATE POLICY "acesso_por_clinica" ON mensagens
  FOR ALL USING (clinica_id IN (SELECT clinica_id FROM usuarios_clinicas WHERE user_id = auth.uid()));

CREATE POLICY "acesso_por_clinica" ON cadencias
  FOR ALL USING (clinica_id IN (SELECT clinica_id FROM usuarios_clinicas WHERE user_id = auth.uid()));

CREATE POLICY "acesso_por_clinica" ON campanhas
  FOR ALL USING (clinica_id IN (SELECT clinica_id FROM usuarios_clinicas WHERE user_id = auth.uid()));

CREATE POLICY "acesso_por_clinica" ON metricas_diarias
  FOR ALL USING (clinica_id IN (SELECT clinica_id FROM usuarios_clinicas WHERE user_id = auth.uid()));

CREATE POLICY "acesso_config" ON clinica_config
  FOR ALL USING (clinica_id IN (SELECT clinica_id FROM usuarios_clinicas WHERE user_id = auth.uid()));

-- ─────────────────────────────────────────────
-- FUNÇÃO: atualizar updated_at automaticamente
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN NEW.atualizado_em = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clinicas BEFORE UPDATE ON clinicas FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();
CREATE TRIGGER trg_contatos BEFORE UPDATE ON contatos FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();
CREATE TRIGGER trg_leads BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();
CREATE TRIGGER trg_agendamentos BEFORE UPDATE ON agendamentos FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();
CREATE TRIGGER trg_conversas BEFORE UPDATE ON conversas FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();
CREATE TRIGGER trg_cadencias BEFORE UPDATE ON cadencias FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();

-- ─────────────────────────────────────────────
-- SEED — dados iniciais para desenvolvimento
-- ─────────────────────────────────────────────
INSERT INTO clinicas (id, nome, responsavel, especialidade, cidade, whatsapp, plano)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Clínica Estética Lumina',
  'Dra. Fernanda Queiroz',
  'Estética Avançada',
  'Teresina, PI',
  '(86) 99812-3344',
  'medio'
);

INSERT INTO clinica_config (clinica_id, agente_nome, agente_prompt)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Luna',
  'Você é Luna, assistente virtual da Clínica Estética Lumina. Sua função é atender pacientes pelo WhatsApp de forma profissional e acolhedora. Você agenda consultas, tira dúvidas sobre procedimentos e qualifica leads. Nunca invente preços — diga que vai verificar com a equipe. Seja sempre gentil e use o nome da pessoa.'
);
```

---

## PASSO 4 — Configuração do Next.js

### `lib/supabase/client.ts`
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### `lib/supabase/server.ts`
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

### `middleware.ts` (na raiz)
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Redireciona para login se não autenticado
  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redireciona para dashboard se já autenticado
  if (user && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

---

## PASSO 5 — Layout Base

### `app/layout.tsx`
```typescript
import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
})

export const metadata: Metadata = {
  title: 'Opus Clínicas',
  description: 'Sistema operacional para clínicas',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={dmSans.variable}>
      <body className="font-sans antialiased bg-[#1C1F1E] text-[#F4F1EA]">
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
```

### `app/(dashboard)/layout.tsx`
Sidebar fixa à esquerda + header fixo no topo + conteúdo com scroll.
Sidebar com logo "opus clínicas" e 11 itens de menu com ícones Lucide.
Header com nome da clínica, Score Opus e avatar do usuário.
Usar dados reais do Supabase (buscar clínica do usuário autenticado).

### `components/layout/Sidebar.tsx`
Menu completo com os 11 módulos. Item ativo com borda esquerda verde.
Fundo `#0A0F0D`. Links com Next.js Link. Logo tipográfico no topo.

---

## PASSO 6 — Página de Login

`app/(auth)/login/page.tsx`

Design dark e institucional. Campos: email + senha. 
Botão "Entrar" com loading state.
Usar Supabase Auth: `supabase.auth.signInWithPassword()`
Redirecionar para /dashboard após login.
Link "Esqueci minha senha" (implementar depois).
Sem cadastro público — usuários são criados pelo admin.

---

## PASSO 7 — Dashboard

`app/(dashboard)/dashboard/page.tsx`

Server Component que busca dados reais do Supabase:
- Métricas do mês atual vs mês anterior
- Leads novos na semana
- Agendamentos de hoje
- Últimas mensagens não lidas

Componentes a criar em `components/dashboard/`:
- `KPIGrid.tsx` — 6 cards de KPI com variação percentual
- `GraficoReceita.tsx` — LineChart dos últimos 6 meses (Recharts)
- `GraficoOrigemLeads.tsx` — PieChart de origem (Recharts)
- `ScoreOpus.tsx` — Score 0-10 com 5 barras de dimensões
- `AgendamentosHoje.tsx` — lista dos agendamentos do dia
- `LeadsRecentes.tsx` — últimos 5 leads adicionados

Todos os dados vêm de queries Supabase reais.
Se não houver dados ainda, mostrar estado vazio com mensagem amigável.

---

## PASSO 8 — vercel.json

```json
{
  "crons": [
    { "path": "/api/cron/anti-noshow",      "schedule": "0 8 * * *" },
    { "path": "/api/cron/follow-up",         "schedule": "0 9 * * *" },
    { "path": "/api/cron/relatorio-semanal", "schedule": "0 7 * * 1" }
  ]
}
```

---

## CHECKLIST DE CONCLUSÃO DA ETAPA 1

Antes de passar para a Etapa 2, confirmar:

- [ ] `npm run dev` roda sem erros
- [ ] Login funciona com usuário criado no Supabase
- [ ] Middleware redireciona corretamente
- [ ] Sidebar navega entre rotas
- [ ] Dashboard carrega (mesmo que vazio)
- [ ] Build de produção passa: `npm run build`
- [ ] Deploy na Vercel funcionando
- [ ] Variáveis de ambiente configuradas na Vercel

---

## NOTAS IMPORTANTES

- Usar `createClient` de `@/lib/supabase/server` em Server Components e API routes
- Usar `createClient` de `@/lib/supabase/client` em Client Components
- Toda query deve filtrar por `clinica_id` — nunca buscar dados sem esse filtro
- O `clinica_id` do usuário logado vem da tabela `usuarios_clinicas`
- Criar hook `useClinica()` que retorna o clinica_id atual do usuário
