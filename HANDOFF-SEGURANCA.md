# HANDOFF — AUDITORIA DE SEGURANÇA — OPUS CLÍNICAS

> **Para o assistente que abrir este arquivo no próximo terminal (Antigravity, Claude Code, Cursor, etc.):**
> Leia o arquivo inteiro antes de fazer qualquer coisa. Ele contém:
> 1. O contexto completo do projeto e do que já foi feito
> 2. As operações manuais que o usuário (Thiago) precisa executar com seu acompanhamento
> 3. O plano de implementação dos próximos sprints (código que você deve escrever)
> 4. Onde estão os scripts e arquivos auxiliares
>
> **NÃO refaça** o que está em "Sprint 1 (concluído)". Esse código já está commitado na branch `claude/code-audit-review-HP1Tn`. Continue de onde parou.

---

## 0. CONTEXTO RÁPIDO

- **Produto:** Opus Clínicas — sistema operacional para clínicas de saúde/estética. Cliente: Thiago (Grupo Opus, Teresina-PI).
- **Stack:** Next.js 16 (App Router) + Supabase + OpenAI GPT-4o + Evolution API (WhatsApp) + Vercel.
- **Multi-tenant:** uma instância serve múltiplas clínicas. Tenancy isolada via RLS (`usuarios_clinicas.clinica_id`).
- **Repositório:** `tth-oficial/clinicas`.
- **Branch atual com correções:** `claude/code-audit-review-HP1Tn`.
- **Documento mestre do produto:** `CLAUDE.md` na raiz. Leia para regras de UI/cores/tipografia.

### O que aconteceu antes

Foi feita auditoria de segurança que encontrou:
- Brechas críticas de RLS (anon lendo conversas/mensagens de todas as clínicas)
- Mass-assignment cruzando tenants
- Schema inconsistente (TEXT vs BOOLEAN)
- Webhook sem HMAC do body
- Senhas geradas com Math.random
- Segredos (OpenAI key, Evolution key) em texto puro no banco
- Bug de privacidade: prompt do GPT vazava mensagens entre pacientes
- Agente IA cancelava agendamento de qualquer paciente via prompt injection

A **Sprint 1** corrigiu tudo isso em código. Falta:
- O usuário executar as **operações pós-deploy** (parte A deste documento)
- Você implementar **Sprint 2** (parte B)
- Você implementar **Sprint 3** (parte C)

---

## 1. STATUS

| Item | Estado |
|---|---|
| Sprint 1 — código | ✅ Commitado em `claude/code-audit-review-HP1Tn` (commit `1a8a407`) |
| Sprint 1 — ops manuais (vars, migration, merge, re-save) | ⏳ Pendente — Parte A |
| Sprint 2 — endurecimento (rate-limit, CSP, sanitização, logger, RBAC) | ⏳ Pendente — Parte B |
| Sprint 3 — qualidade (CI, types do Supabase, métricas diárias, testes) | ⏳ Pendente — Parte C |

---

# PARTE A — OPERAÇÕES MANUAIS PÓS-DEPLOY (Sprint 1)

> O assistente deve guiar o Thiago por estes passos. Não tente automatizar — são ações que precisam de credenciais humanas (Vercel, Supabase, GitHub).

A ordem importa. Siga A.1 → A.2 → ... → A.7.

## A.1 — Gerar os 3 secrets

**Pré-requisito:** Node.js instalado localmente.

Rodar no terminal, na raiz do projeto:

```bash
bash scripts/gerar-secrets.sh
```

A saída será 3 linhas no formato:
```
ENCRYPTION_KEY=...
WEBHOOK_SECRET=...
CRON_SECRET=...
```

**Guardar imediatamente num cofre (1Password / Bitwarden).**

⚠ **`ENCRYPTION_KEY` é insubstituível.** Se for perdida, todas as keys criptografadas no banco viram lixo e cada cliente terá que reinserir suas chaves OpenAI/Evolution.

## A.2 — Cadastrar no Vercel

1. Acessar https://vercel.com → projeto Opus Clínicas → **Settings** → **Environment Variables**.
2. Para cada uma das 3 variáveis acima, clicar em **Add New**:
   - **Key:** nome da variável (ex.: `ENCRYPTION_KEY`)
   - **Value:** o valor gerado
   - **Environments:** marcar **Production**, **Preview** e **Development**
3. Salvar.
4. Ir em **Deployments** e clicar em **Redeploy** no último deploy. Sem isso o app não puxa as vars novas.

✅ Sucesso: o último deploy deve aparecer com bolinha verde "Ready".
❌ Se aparecer erro tipo `[env] Variáveis obrigatórias ausentes`: alguma var não foi marcada nos 3 environments.
❌ Se aparecer `[env] ENCRYPTION_KEY precisa ter 32 bytes em base64`: você copiou a chave parcialmente ou com espaços.

## A.3 — Rodar migration de segurança no Supabase

1. Acessar https://supabase.com/dashboard → projeto da clínica.
2. Menu lateral → **SQL Editor** → **New query**.
3. Abrir o arquivo `supabase/migrations/004_security_hardening.sql` no editor de código (ou no GitHub na branch `claude/code-audit-review-HP1Tn`).
4. Copiar o conteúdo inteiro e colar no SQL Editor do Supabase.
5. Clicar em **Run** (`Ctrl/Cmd + Enter`).
6. Confirmar que não dá erro.

A migration é **idempotente** — pode rodar mais de uma vez sem problema.

## A.4 — Verificar a migration

No mesmo SQL Editor do Supabase, abrir nova aba e rodar `scripts/verificar-seguranca.sql`. As 5 queries devem todas retornar status ✓ OK.

A query 1 (`policies anon`) deve retornar **0 linhas**. Se retornar linhas, a 003 ou 004 não rodou direito.

## A.5 — Mergear o PR

1. GitHub → https://github.com/tth-oficial/clinicas/pulls.
2. Criar PR de `claude/code-audit-review-HP1Tn` → `main` (se não existir).
3. Revisar diff.
4. **Merge pull request** → **Confirm merge**.
5. Vercel detecta o push em `main` e dispara deploy automático.
6. Aguardar bolinha verde "Ready" em **Deployments**.

## A.6 — Migrar segredos legados de cada clínica

As OpenAI/Evolution keys que já existiam no banco continuam funcionando (compat retroativa), **mas estão em texto plano**. Para criptografar:

**Diagnóstico:** rodar `scripts/status-criptografia.sql` no Supabase. Mostra quais clínicas ainda têm `⚠ TEXTO PLANO`.

**Para cada clínica com texto plano:**
1. Login no sistema com as credenciais da clínica.
2. **Configurações** → aba **Integrações**.
3. Os campos vão estar mascarados (`••••sk-X`). Não digitar nada.
4. Clicar em **Salvar**.
5. O servidor encripta a key existente no formato `enc:v1:...`.

**Verificar:** rodar `scripts/status-criptografia.sql` de novo — todas devem estar `✓ criptografada`.

## A.7 — Reconfigurar webhook da Evolution em cada clínica conectada

Como o `WEBHOOK_SECRET` mudou, a Evolution precisa receber o novo. Para cada clínica com WhatsApp já conectado:

1. Login no sistema.
2. **Configurações** → **WhatsApp** → **Reconectar / Reconfigurar**.
3. Isso chama o endpoint `/api/whatsapp/setup` que repassa o secret atualizado para a Evolution via `setWebhook`.

**Teste real:**
- Mande uma mensagem de WhatsApp para o número da clínica.
- Em até 10s deve aparecer no painel **Conversas**.
- Se não aparecer: ver logs no Vercel → Deployments → último → Functions. Se aparecer `Unauthorized` em `/api/whatsapp/webhook`, o secret na Evolution está desatualizado. Repita o passo.

## A.8 — Checklist final da Parte A

```
[ ] A.1 — Secrets gerados e guardados no cofre
[ ] A.2 — 3 variáveis cadastradas no Vercel (Prod/Preview/Dev)
[ ] A.2 — Redeploy disparado e Ready
[ ] A.3 — Migration 004 executada no Supabase
[ ] A.4 — Query de verificação retorna ✓ OK em tudo
[ ] A.5 — PR mergeado e deploy de main verde
[ ] A.6 — Todas as clínicas com status ✓ criptografada
[ ] A.7 — Mensagem WhatsApp de teste chega no painel de cada clínica
```

---

# PARTE B — SPRINT 2 (CÓDIGO QUE VOCÊ, ASSISTENTE, DEVE IMPLEMENTAR)

Só comece a Parte B **depois** que a Parte A estiver toda ✅. Não faz sentido endurecer mais antes do básico estar deployado.

Trabalhar em uma branch nova: `claude/sprint-2-hardening`.

```bash
git checkout main
git pull origin main
git checkout -b claude/sprint-2-hardening
```

## B.1 — Rate limiting (Upstash Redis)

**Por quê:** sem isso, atacante pode disparar `/api/whatsapp/webhook` com clinicaId válido e queimar a OpenAI da clínica até a quota. Login sem throttle = brute force.

**O que fazer:**

1. Criar conta gratuita em https://upstash.com → criar Redis → copiar `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`.
2. Adicionar ambas no Vercel (Prod/Preview/Dev).
3. Adicionar em `lib/env.ts` como recomendadas em produção.
4. Instalar dependências:
   ```bash
   npm i @upstash/ratelimit @upstash/redis
   ```
5. Criar `lib/rate-limit.ts`:
   ```ts
   import { Ratelimit } from '@upstash/ratelimit'
   import { Redis } from '@upstash/redis'

   const redis = Redis.fromEnv()

   export const limiters = {
     // Webhook: 60 req/min por clinicaId
     webhook: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, '1 m'), prefix: 'rl:wh' }),
     // Login: 5 tentativas/min por IP
     login: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1 m'), prefix: 'rl:login' }),
     // Endpoints com OpenAI: 30/min por user
     ai: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '1 m'), prefix: 'rl:ai' }),
   }

   export async function limitOrFail(
     limiter: Ratelimit,
     key: string
   ): Promise<{ ok: true } | { ok: false; reset: number }> {
     const { success, reset } = await limiter.limit(key)
     return success ? { ok: true } : { ok: false, reset }
   }
   ```
6. Aplicar nos endpoints:
   - `app/api/whatsapp/webhook/route.ts` — chave `wh:${clinicaId}`
   - `app/api/ia-decisao/route.ts` — chave `ai:${user.id}`
   - `app/api/agente/testar/route.ts` — chave `ai:${user.id}`
   - `app/api/agente/processar/route.ts` — chave `wh:${clinicaId}` (mesmo pool do webhook)
   - Login: como o login é via Supabase no client-side, criar um endpoint `app/api/auth/login/route.ts` que faz proxy + rate-limit por IP, e mudar `app/(auth)/login/page.tsx` para usar.

## B.2 — Headers de segurança (CSP, HSTS, etc.)

**Editar:** `next.config.ts`

```ts
import type { NextConfig } from 'next'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseHost = SUPABASE_URL.replace(/^https?:\/\//, '')

const csp = [
  "default-src 'self'",
  `connect-src 'self' ${SUPABASE_URL} wss://${supabaseHost} https://api.openai.com https://*.upstash.io`,
  "img-src 'self' data: https://*.supabase.co",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "script-src 'self' 'unsafe-inline'", // Next dev injeta inline; refinar com nonce em prod
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
]

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
    ]
  },
}

export default nextConfig
```

Testar com https://securityheaders.com depois do deploy. Meta: nota A ou A+.

## B.3 — Sanitizar inputs em filtros `.or()`

**Por quê:** PostgREST filter injection. `q = "x,id.eq.<UUID>"` muda a semântica.

**Arquivos:**
- `app/api/leads/route.ts:39-40`
- `app/api/contatos/route.ts:30`
- `app/api/busca/route.ts:21`

**Patch:** criar `lib/sanitize.ts`:

```ts
/**
 * Sanitiza string para uso seguro em filtros PostgREST `.or()` / `.ilike()`.
 * Remove caracteres que mudariam a semântica do filtro.
 */
export function sanitizeFilterValue(s: string): string {
  return s
    .replace(/[,()*%]/g, '') // sintaxe de filtro
    .replace(/[\\']/g, '')   // escape e aspas
    .trim()
    .slice(0, 100)            // limita comprimento
}
```

E aplicar:
```ts
import { sanitizeFilterValue } from '@/lib/sanitize'
const q = sanitizeFilterValue(searchParams.get('busca') ?? '')
if (q.length >= 2) query = query.or(`nome.ilike.%${q}%,telefone.ilike.%${q}%`)
```

Idealmente migrar para `textSearch()` aproveitando os índices `tsvector` que já existem na `etapa7_configuracoes.sql`.

## B.4 — Logger estruturado + Sentry

**Por quê:** `console.error` solto não é searchable. Em produção com pacientes reais, precisa de trace e alertas.

1. Instalar:
   ```bash
   npm i pino pino-pretty
   npm i @sentry/nextjs
   ```
2. Criar `lib/logger.ts`:
   ```ts
   import pino from 'pino'

   export const logger = pino({
     level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
     redact: ['*.openai_api_key', '*.evolution_api_key', '*.password', '*.senha', '*.authorization'],
     base: { service: 'opus-clinicas' },
   })
   ```
3. Substituir `console.error/log` em rotas críticas (webhook, agente, crons) por `logger.error({ ctx, err })`.
4. Configurar Sentry seguindo https://docs.sentry.io/platforms/javascript/guides/nextjs/ — vai criar `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` e atualizar `next.config.ts`.
5. Adicionar `SENTRY_DSN` no Vercel.

## B.5 — Limites em upload de logo

**Arquivo:** `app/api/configuracoes/logo/route.ts`

Adicionar antes do `.upload`:
```ts
const MAX_BYTES = 2 * 1024 * 1024 // 2 MB
if (file.size > MAX_BYTES) {
  return Response.json({ error: 'Arquivo maior que 2MB' }, { status: 400 })
}
// SVG pode embutir <script> → bloquear ou sanitizar
if (file.type === 'image/svg+xml') {
  return Response.json({ error: 'SVG não suportado por segurança. Use PNG/JPG/WEBP.' }, { status: 400 })
}
```

E aplicar policies de Storage (ainda comentadas em `etapa7_configuracoes.sql:14-20`). Criar nova migration `005_storage_policies.sql`:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "logo_publico_leitura" ON storage.objects
  FOR SELECT USING (bucket_id = 'logos');

CREATE POLICY "logo_upload_autenticado_propria_clinica" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] IN (
      SELECT clinica_id::text FROM usuarios_clinicas WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "logo_update_autenticado_propria_clinica" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] IN (
      SELECT clinica_id::text FROM usuarios_clinicas WHERE user_id = auth.uid()
    )
  );
```

## B.6 — Substituir fire-and-forget por waitUntil

**Arquivo:** `app/api/whatsapp/webhook/route.ts`

Hoje:
```ts
fetch(`${appUrl}/api/agente/processar`, ...).catch(...)
return Response.json({ ok: true })
```

Em serverless, o handler retorna e o sandbox pode ser encerrado antes da subrequest completar. Trocar por `waitUntil`:

```ts
import { after } from 'next/server'  // Next 16

// ... dentro do POST
after(async () => {
  try {
    await fetch(`${appUrl}/api/agente/processar`, { ... })
  } catch (err) {
    logger.error({ err }, 'Falha ao disparar agente')
  }
})

return Response.json({ ok: true })
```

Alternativa mais robusta: enfileirar em Upstash QStash (`@upstash/qstash`). Recomendado para próximas features. Adicionar issue e seguir com `after` por enquanto.

## B.7 — RBAC real usando `usuarios_clinicas.papel`

A coluna existe (`admin | operador | visualizador`) mas não é usada. **Por enquanto** todos os usuários da clínica são tratados como admin.

1. Criar `lib/auth.ts` (centralizando — também resolve duplicação de `isAdmin`):
   ```ts
   import { createClient } from '@/lib/supabase/server'

   export type Papel = 'admin' | 'operador' | 'visualizador'

   export async function getUsuarioComPapel() {
     const supabase = await createClient()
     const { data: { user } } = await supabase.auth.getUser()
     if (!user) return null

     const { data: vinculo } = await supabase
       .from('usuarios_clinicas')
       .select('clinica_id, papel')
       .eq('user_id', user.id)
       .maybeSingle()

     return vinculo ? { user, ...vinculo } : null
   }

   export function isSuperAdmin(email: string | undefined): boolean {
     if (!email) return false
     const list = (process.env.ADMIN_EMAILS ?? '')
       .split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
     const fallback = process.env.ADMIN_EMAIL?.toLowerCase()
     return list.includes(email.toLowerCase()) ||
       (!!fallback && email.toLowerCase() === fallback)
   }

   export function exigePapel(papel: Papel | undefined, minimo: Papel): boolean {
     const ranking: Record<Papel, number> = { visualizador: 1, operador: 2, admin: 3 }
     if (!papel) return false
     return ranking[papel] >= ranking[minimo]
   }
   ```
2. Substituir todos os `isAdmin` duplicados em `app/admin/layout.tsx`, `app/admin/page.tsx`, `app/api/admin/clinicas/route.ts`, `app/api/admin/clinicas/[id]/route.ts` por imports de `@/lib/auth`.
3. Em rotas que mutam dados sensíveis (DELETE de leads, PATCH de configurações, criação de agendamentos), exigir `exigePapel(vinculo.papel, 'operador')`.
4. Em rotas só-leitura (dashboard, relatório, busca), aceitar `visualizador` em diante.

## B.8 — Checklist final da Parte B

```
[ ] B.1 Rate limit em webhook, ai-endpoints e login
[ ] B.2 Headers de segurança configurados (CSP/HSTS/etc)
[ ] B.3 Sanitização de filtros .or()
[ ] B.4 Logger estruturado + Sentry
[ ] B.5 Limites de upload + storage policies
[ ] B.6 waitUntil substituindo fire-and-forget
[ ] B.7 RBAC com lib/auth.ts e usuarios_clinicas.papel
[ ] B.8 Branch claude/sprint-2-hardening commitada e PR aberto
```

---

# PARTE C — SPRINT 3 (QUALIDADE E ESCALA)

Trabalhar em `claude/sprint-3-quality`.

## C.1 — CI no GitHub Actions

Criar `.github/workflows/ci.yml`:
```yaml
name: CI
on:
  pull_request:
  push: { branches: [main] }
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm audit --audit-level=high
      - uses: gitleaks/gitleaks-action@v2
        env: { GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} }
      - run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: https://example.supabase.co
          NEXT_PUBLIC_SUPABASE_ANON_KEY: dummy
          SUPABASE_SERVICE_ROLE_KEY: dummy
          ENCRYPTION_KEY: ${{ secrets.CI_ENCRYPTION_KEY }}
```

Configurar `CI_ENCRYPTION_KEY` em Settings → Secrets do repo (gerar uma chave separada só para CI).

## C.2 — Tipos do Supabase gerados

```bash
npm i -D supabase
npx supabase login
npx supabase link --project-ref <ref>
npx supabase gen types typescript --linked > lib/supabase/types.ts
```

Adicionar ao CI um step que regenera e dá fail se mudou (avisa quando schema diverge do código).

Substituir `as unknown as X` pelos tipos gerados em todo o código.

## C.3 — Cron que popula `metricas_diarias`

A tabela existe e é lida pelo `/api/cron/relatorio-semanal` e `/api/ia-decisao`, mas **ninguém escreve nela**. Hoje toda métrica está zerada → relatório fica genérico.

Criar `app/api/cron/agregar-metricas/route.ts` que roda diário às 00h05:
- Para cada clínica ativa
- Calcula receita do dia (sum de `agendamentos.valor` onde `status='realizado'` e `data_hora` no dia anterior)
- Conta leads_novos, consultas_realizadas, procedimentos_realizados, no_show_count, no_show_total
- Calcula taxa_conversao
- Faz `upsert` em `metricas_diarias`

Adicionar em `vercel.json`:
```json
{ "path": "/api/cron/agregar-metricas", "schedule": "5 0 * * *" }
```

## C.4 — Extrair services/cadencia

Hoje a lógica de criar/cancelar/avançar cadência anti-noshow está duplicada em:
- `lib/agente-tools.ts` (`marcarConsulta`)
- `app/api/agendamentos/route.ts` (POST)
- `app/api/agendamentos/[id]/route.ts` (PATCH/DELETE)
- `app/api/cron/anti-noshow/route.ts`

Criar `lib/services/cadencia-anti-noshow.ts` com:
```ts
export async function criarCadenciaAntiNoshow(...)
export async function cancelarCadenciaPorAgendamento(...)
export async function avancarEtapa(...)
```

E refatorar todos os call sites para usar.

## C.5 — Debounce na busca + paginação em conversas

- `components/leads/FiltrosLeads.tsx`: debounce de 300ms na busca antes de disparar refetch.
- `hooks/useConversas.ts`: implementar paginação (cursor por `atualizado_em`) — hoje carrega só as 50 últimas.
- `useLeads`: passar filtro de `clinica_id` no canal Realtime para não receber eventos de outras clínicas.

## C.6 — Testes (atualmente zero)

Adicionar Vitest:
```bash
npm i -D vitest @vitest/ui
```

Criar `vitest.config.ts` e começar testando o que tem mais risco:
- `lib/crypto.ts` — encrypt/decrypt round-trip, formato `enc:v1:`, tampering
- `lib/webhook-signature.ts` — HMAC válido/inválido, bearer fallback, timing
- `lib/cadencia-ia.ts` (`detectarRespostaAntiNoshow`, `detectarEngajamentoFollowup`)
- `lib/validators/*` — schemas rejeitam `clinica_id`, aceitam o esperado
- `lib/theme.ts` — `gerarTema` com várias cores

E testes de integração (com supabase local via `supabase start`) para:
- Multi-tenancy: usuário da clínica A não consegue ler/atualizar dados da B
- RLS de mensagens

## C.7 — Checklist Parte C

```
[ ] C.1 CI rodando lint + types + build + audit + gitleaks
[ ] C.2 Tipos Supabase gerados e usados
[ ] C.3 Cron de agregação de métricas escrevendo em metricas_diarias
[ ] C.4 Lógica de cadência anti-noshow centralizada
[ ] C.5 Debounce e paginação em UI
[ ] C.6 Vitest configurado, primeiros 50% de cobertura nos lib/*
[ ] C.7 Branch claude/sprint-3-quality e PR
```

---

# 2. ÍNDICE DE ARQUIVOS PRODUZIDOS NA SPRINT 1

Para referência rápida (já estão na branch `claude/code-audit-review-HP1Tn`):

**Migration:**
- `supabase/migrations/004_security_hardening.sql`

**Bibliotecas novas:**
- `lib/crypto.ts` — AES-256-GCM com retrocompat
- `lib/password.ts` — `crypto.randomInt`
- `lib/webhook-signature.ts` — HMAC + bearer fallback
- `lib/validators/leads.ts` — Zod allowlist PATCH leads
- `lib/validators/agendamentos.ts` — Zod allowlist criar/PATCH agendamentos
- `instrumentation.ts` — chama validateEnv no boot

**Arquivos modificados:**
- `app/api/leads/[id]/route.ts` — PATCH com Zod
- `app/api/agendamentos/route.ts` — POST com Zod + validação tenant de contato_id/lead_id
- `app/api/agendamentos/[id]/route.ts` — PATCH com Zod
- `app/api/whatsapp/webhook/route.ts` — HMAC do body
- `app/api/agente/processar/route.ts` — fail-closed em prod
- `app/api/admin/clinicas/route.ts` — gerarSenhaSegura, encryptSecret
- `app/api/admin/clinicas/[id]/route.ts` — encryptSecret/decryptSecret nas keys
- `app/api/configuracoes/route.ts` — encryptSecret/decryptSecret
- `app/api/whatsapp/setup/route.ts` — decrypt evolution_api_key
- `app/api/cron/follow-up/route.ts` — filtra contato_id
- `app/api/cron/relatorio-semanal/route.ts` — decrypt openai_api_key
- `app/api/ia-decisao/route.ts` — decrypt
- `app/api/agente/testar/route.ts` — decrypt
- `app/admin/novo-cliente/page.tsx` — remove gerarSenha do client
- `lib/openai.ts` — decryptSecret + cancelarAgendamento passa clinicaId+contatoId
- `lib/evolution.ts` — decryptSecret
- `lib/cadencia-ia.ts` — filtra mensagens por conversa do contato + decryptSecret
- `lib/agente-tools.ts` — `marcarConsulta` valida horário/conflito/posse; `cancelarAgendamento` exige tenant
- `lib/env.ts` — exige WEBHOOK_SECRET/CRON_SECRET/ENCRYPTION_KEY em prod

**Scripts auxiliares:**
- `scripts/gerar-secrets.sh`
- `scripts/verificar-seguranca.sql`
- `scripts/status-criptografia.sql`

---

# 3. INSTRUÇÕES PARA O ASSISTENTE NO PRÓXIMO TERMINAL

Quando o usuário (Thiago) pedir para você continuar este trabalho:

1. **Pergunte primeiro em qual fase ele está:**
   - "Já executou as operações da Parte A (vars, migration, merge)?"
   - Se não → guie ele passo a passo pela Parte A.
   - Se sim → ofereça começar a Parte B.

2. **Antes de começar Parte B, confirme:**
   - `git checkout main && git pull`
   - `git checkout -b claude/sprint-2-hardening`

3. **Mantenha um TodoWrite** com os itens B.1–B.7 marcando progresso.

4. **Para cada item, antes de mexer em código:**
   - Leia o arquivo alvo com `Read`
   - Faça `Edit` mínimos e cirúrgicos
   - Não invente novas dependências sem confirmar com o usuário

5. **Não mergeie nem faça push em `main`.** Sempre PR via branch nova.

6. **Não pule a Parte A.** Sem ENCRYPTION_KEY no Vercel, o app nem sobe em produção (fail-closed proposital). Sem migration 004, RLS continua aberta.

7. **Se algo não bater com este documento** (arquivos com nome diferente, etc.), leia o repo primeiro com `Read` e `Bash ls`. O código vivo é a fonte da verdade — este doc pode estar desatualizado se já tiveram outras iterações.

---

**Última atualização deste handoff:** Sprint 1 commitada em `1a8a407`, branch `claude/code-audit-review-HP1Tn`.