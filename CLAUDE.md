# OPUS CLÍNICAS — MASTER CONTEXT
# Este arquivo é lido pelo Claude Code no início de cada sessão.
# Nunca delete ou mova este arquivo.

## MODO DE TRABALHO
Execute todas as tarefas de forma autônoma e sequencial.
Não peça confirmação entre etapas — só pare se encontrar um erro bloqueante
ou uma informação ausente que não está em nenhum arquivo do projeto.

## O QUE É ESTE PROJETO

Sistema operacional comercial para clínicas de saúde e estética.
Produto da empresa **Opus Clínicas** (Grupo Opus), fundada por Thiago — Teresina, PI.
Vendido como serviço gerenciado (não SaaS ainda), com arquitetura preparada para virar SaaS.

Cada instância do sistema serve uma clínica. A configuração da clínica fica em Supabase.
Não existe n8n. Toda automação é código dentro deste repositório.

---

## STACK DEFINITIVO

| Camada | Tecnologia | Motivo |
|---|---|---|
| Framework | Next.js 16 (App Router) | Front + back num projeto, deploy simples |
| Banco + Auth | Supabase | PostgreSQL, Auth, Realtime, Storage prontos |
| IA dos Agentes | OpenAI GPT-4o | API key por cliente (cliente paga a própria IA) |
| WhatsApp | Evolution API | Self-hosted, migração futura para uazapi |
| Deploy | Vercel | CI/CD automático, Cron Jobs nativos |
| Estilização | Tailwind CSS v4 + shadcn/ui | Componentes prontos, manutenção fácil |
| Estado global | Zustand | Simples, sem boilerplate |
| Forms | React Hook Form + Zod | Validação robusta |
| Tabelas | TanStack Table | Performance em listas grandes |
| Gráficos | Recharts | Leve, customizável |
| Ícones | Lucide React | Consistente com shadcn |

---

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

---

## ESTRUTURA DE PASTAS

```
opus-clinicas/
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── (dashboard)/
│   │   ├── layout.tsx              ← sidebar + header + providers
│   │   ├── page.tsx                ← redirect para /dashboard
│   │   ├── dashboard/
│   │   ├── crm/
│   │   ├── whatsapp/
│   │   ├── agendamento/
│   │   ├── anti-no-show/
│   │   ├── leads/
│   │   ├── follow-up/
│   │   ├── nutricao/
│   │   ├── reaquecimento/
│   │   ├── ia-decisao/
│   │   ├── relatorio/
│   │   └── configuracoes/
│   └── api/
│       ├── whatsapp/
│       │   ├── webhook/route.ts    ← recebe eventos da Evolution API
│       │   ├── send/route.ts       ← envia mensagens
│       │   └── instance/route.ts  ← gerencia instância (QR, status)
│       ├── agente/
│       │   └── processar/route.ts ← cérebro do agente IA
│       ├── leads/route.ts
│       ├── agendamentos/route.ts
│       ├── campanhas/
│       │   ├── reaquecimento/route.ts
│       │   └── followup/route.ts
│       ├── relatorio/route.ts
│       └── cron/
│           ├── anti-noshow/route.ts
│           ├── follow-up/route.ts
│           └── relatorio-semanal/route.ts
├── components/
│   ├── ui/                         ← shadcn components (não editar)
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── PageHeader.tsx
│   ├── dashboard/
│   ├── crm/
│   ├── whatsapp/
│   └── shared/
│       ├── KPICard.tsx
│       ├── Badge.tsx
│       ├── DataTable.tsx
│       └── LoadingSpinner.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts               ← cliente browser
│   │   ├── server.ts               ← cliente server-side
│   │   └── types.ts                ← tipos gerados do banco
│   ├── openai.ts                   ← wrapper da OpenAI
│   ├── evolution.ts                ← wrapper da Evolution API
│   ├── scheduler.ts                ← lógica de cadências
│   ├── theme.ts                    ← gerador de tema dinâmico
│   └── utils.ts
├── hooks/
│   ├── useClinica.ts               ← config da clínica atual
│   ├── useLeads.ts
│   ├── useAgendamentos.ts
│   └── useRealtime.ts              ← Supabase Realtime subscriptions
├── store/
│   └── index.ts                    ← Zustand store global
├── config/
│   └── clinica.ts                  ← fallback de config local
├── supabase/
│   └── migrations/                 ← SQL de criação das tabelas
├── types/
│   └── index.ts                    ← tipos TypeScript globais
├── CLAUDE.md                       ← ESTE ARQUIVO
├── .env.local                      ← variáveis de ambiente (nunca commitar)
└── vercel.json                     ← config de crons
```

---

## BANCO DE DADOS — TABELAS PRINCIPAIS

```sql
-- Clínicas (multi-tenant futuro)
clinicas (id, nome, logo_url, responsavel, cidade, whatsapp, plano, criado_em)

-- Configurações por clínica
clinica_config (
  clinica_id,
  cor_principal, cor_destaque, cor_fundo, cor_sidebar,
  fonte, logo_url, favicon_url, nome_exibicao, slogan,
  openai_api_key,
  evolution_url, evolution_api_key, evolution_instance,
  agente_prompt, agente_nome, agente_tom,
  google_calendar_token, google_calendar_id,
  modulos_ativos
)

-- Pacientes / Contatos
contatos (id, clinica_id, nome, telefone, email, origem, criado_em, ultima_interacao)

-- Leads no pipeline
leads (
  id, clinica_id, contato_id,
  servico, valor_estimado, origem,
  etapa,          -- lead | consulta_agendada | negociacao | procedimento | pos_venda
  temperatura,    -- quente | morno | frio
  status,         -- novo | em_contato | agendado | negociando | convertido | perdido
  notas, criado_em, atualizado_em
)

-- Agendamentos
agendamentos (
  id, clinica_id, contato_id, lead_id,
  servico, profissional,
  data_hora, duracao_minutos,
  status,         -- agendado | confirmado | realizado | no_show | cancelado
  criado_em
)

-- Conversas WhatsApp
conversas (id, clinica_id, contato_id, agente_ativo, criado_em, atualizado_em)

-- Mensagens
mensagens (
  id, conversa_id, clinica_id,
  de,             -- cliente | agente | sistema
  texto, midia_url, tipo_midia,
  enviado_em, lido
)

-- Cadências (anti no-show, follow-up, nutrição)
cadencias (
  id, clinica_id, tipo,
  contato_id, lead_id, agendamento_id,
  etapa_atual, total_etapas,
  status,         -- ativa | pausada | concluida | cancelada
  proxima_execucao, criado_em
)

-- Etapas das cadências
cadencia_etapas (
  id, cadencia_id,
  numero, mensagem_template,
  status,
  enviado_em, resposta_recebida
)

-- Campanhas
campanhas (
  id, clinica_id, nome, tipo,
  status,
  total_contatos, enviados, responderam, convertidos,
  receita_gerada, criado_em, disparado_em
)

-- Métricas (snapshot diário para relatórios)
metricas_diarias (
  id, clinica_id, data,
  receita, leads_novos, consultas, procedimentos,
  no_show_count, no_show_total, taxa_conversao
)
```

---

## FLUXO DO AGENTE WHATSAPP

```
1. Mensagem chega na Evolution API
2. Evolution faz POST em /api/whatsapp/webhook
3. Webhook salva mensagem no Supabase (tabela mensagens)
4. Webhook chama /api/agente/processar
5. Agente busca config da clínica, histórico, dados do contato
6. Monta contexto e chama OpenAI GPT-4o
7. Salva resposta no Supabase
8. Envia via Evolution API
9. Atualiza lead/contato se necessário
```

---

## CRON JOBS (vercel.json)

```json
{
  "crons": [
    { "path": "/api/cron/anti-noshow",       "schedule": "0 8 * * *"  },
    { "path": "/api/cron/follow-up",          "schedule": "0 9 * * *"  },
    { "path": "/api/cron/relatorio-semanal",  "schedule": "0 7 * * 1"  }
  ]
}
```

---

## VARIÁVEIS DE AMBIENTE (.env.local)

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
WEBHOOK_SECRET=
CRON_SECRET=
NEXT_PUBLIC_APP_URL=
```

---

## REGRAS DE DESENVOLVIMENTO

1. **TypeScript estrito** — sem `any`, tipagem completa
2. **Server Components por padrão** — Client Component só quando precisa de interatividade
3. **Dados sempre via Supabase** — nunca hardcode dados nas páginas
4. **Cada módulo é independente** — uma página não importa componentes de outra
5. **Erros sempre tratados** — try/catch em toda chamada externa, toast de feedback
6. **Loading states sempre** — skeleton ou spinner em toda operação assíncrona
7. **Mobile-first** — funciona bem em 375px+, ótimo em 1280px+
8. **RLS no Supabase** — Row Level Security ativo em todas as tabelas
9. **Logs estruturados** — console.error com contexto, nunca console.log em produção
10. **Variáveis de ambiente** — nunca expor keys no cliente, sempre via API routes
11. **CSS variables para tema** — nunca cor hardcoded em Tailwind para elementos temáticos

---

## IDENTIDADE VISUAL — REGRAS DE CÓDIGO

**Nunca usar:**
- Classes Tailwind com cores fixas para elementos temáticos: `bg-green-800`, `text-green-600`
- Cores hex hardcoded para tema: `bg-[#1B5E4F]`

**Sempre usar:**
- `style={{ background: 'var(--cor-primaria)' }}` para elementos temáticos
- `style={{ color: 'var(--cor-texto)' }}` para textos
- Classes Tailwind neutras: `rounded-lg`, `p-4`, `flex`, `gap-2`

**Exceção — cores semânticas universais (nunca mudam):**
- Erro: `#EF4444`
- Sucesso: `#22C55E`
- Aviso: `#F59E0B`

---

## ETAPAS DE DESENVOLVIMENTO

### ETAPA 1 — Fundação (atual)
Setup, banco, auth, layout, dashboard

### ETAPA 2 — CRM + Leads
Pipeline kanban, gestão de leads, histórico de contatos

### ETAPA 3 — WhatsApp + Agente IA
Webhook, agente, conversas em tempo real

### ETAPA 4 — Agendamento + Anti No-Show
Calendário, cadências automáticas, confirmações

### ETAPA 5 — Automações
Follow-up, nutrição, reaquecimento da base

### ETAPA 6 — Inteligência
IA de decisão, relatórios semanais automáticos, métricas

### ETAPA 7 — Configurações + Multi-tenant
Painel de config por clínica, preparação para SaaS

---

## SOBRE O PRODUTO

- **Opus Clínicas** é o produto. **Grupo Opus** é a marca mãe.
- Vendido como serviço gerenciado: Thiago configura e mantém para cada cliente
- Cada cliente paga sua própria OpenAI API key (modelo de custo justo)
- Futuro: virar SaaS com planos mensais — arquitetura já está preparada
