# 🏗️ PLANO DE INTEGRAÇÃO TOTAL — SISTEMA CLÍNICAS

## Contexto

O sistema "Clínicas" é uma plataforma SaaS multi-tenant para clínicas de saúde/estética com: Dashboard, CRM/Leads, WhatsApp (Evolution API), Agente IA (OpenAI), Agendamentos, Anti No-Show, Follow-up, Nutrição de Leads, Reaquecimento e Relatórios.

### Diagnóstico Atual (05/05/2026)

**Infraestrutura existente:**
- ✅ Schema do banco completo (Supabase) com RLS
- ✅ Webhook WhatsApp recebendo mensagens
- ✅ Agente IA respondendo via GPT-4o
- ✅ Crons configurados no Vercel (anti-noshow, follow-up, nutrição, reaquecimento, relatório)
- ✅ API de agendamentos (GET/POST)
- ✅ Cadências anti-noshow sendo criadas automaticamente

**Problemas críticos identificados:**

| # | Problema | Impacto |
|---|----------|---------|
| 1 | **Escalar humano** não notifica ninguém — apenas muda flag no banco | Paciente fica sem atendimento |
| 2 | **Modelos OpenAI** desatualizados — lista: `gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo` | Sem acesso a modelos novos |
| 3 | **Profissionais** são campo texto livre — sem cadastro estruturado | Impossível consultar agenda por profissional |
| 4 | **Agendamento via IA** usa data placeholder (+1 dia) — não consulta agenda real | Agendamento fictício |
| 5 | **Sem horário de funcionamento** cadastrado no sistema | IA não sabe quando clínica funciona |
| 6 | **Sem serviços cadastrados** — campo livre sem preços/durações | IA não sabe o que oferecer |
| 7 | **Cadências** usam `createClient()` (precisa auth) nos crons — deveria usar `createAdminClient()` | Crons podem falhar em produção |
| 8 | **Follow-up/Nutrição** não conectam com o agente IA — enviam templates fixos | Sem personalização inteligente |

---

## EXECUÇÃO — PASSO A PASSO

---

### FASE 1: FUNDAÇÃO DE DADOS (Banco de Dados)
> Criar as tabelas que faltam para o sistema funcionar de verdade

#### Passo 1.1 — Tabela `profissionais`
```sql
CREATE TABLE profissionais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  especialidade TEXT,
  telefone TEXT,
  email TEXT,
  cor TEXT DEFAULT '#2D8B73',       -- cor no calendário
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_profissionais_clinica ON profissionais(clinica_id);
ALTER TABLE profissionais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acesso_por_clinica" ON profissionais
  FOR ALL USING (clinica_id IN (
    SELECT clinica_id FROM usuarios_clinicas WHERE user_id = auth.uid()
  ));
```
> **Por que tabela e não prompt?** Escala. Com tabela, o agente consulta dinamicamente, múltiplas clínicas têm seus próprios profissionais, e a agenda filtra por profissional. No prompt, cada mudança exige edição manual.

#### Passo 1.2 — Tabela `servicos`
```sql
CREATE TABLE servicos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  duracao_minutos INTEGER NOT NULL DEFAULT 60,
  valor DECIMAL(10,2),
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_servicos_clinica ON servicos(clinica_id);
ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acesso_por_clinica" ON servicos
  FOR ALL USING (clinica_id IN (
    SELECT clinica_id FROM usuarios_clinicas WHERE user_id = auth.uid()
  ));
```

#### Passo 1.3 — Tabela `horarios_funcionamento`
```sql
CREATE TABLE horarios_funcionamento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0=dom
  hora_inicio TIME NOT NULL DEFAULT '08:00',
  hora_fim TIME NOT NULL DEFAULT '18:00',
  ativo BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(clinica_id, dia_semana)
);
ALTER TABLE horarios_funcionamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acesso_por_clinica" ON horarios_funcionamento
  FOR ALL USING (clinica_id IN (
    SELECT clinica_id FROM usuarios_clinicas WHERE user_id = auth.uid()
  ));
```

#### Passo 1.4 — Adicionar campo `telefone_escalacao` na config
```sql
ALTER TABLE clinica_config
  ADD COLUMN IF NOT EXISTS telefone_escalacao TEXT,
  ADD COLUMN IF NOT EXISTS notificar_escalacao BOOLEAN NOT NULL DEFAULT true;
```

#### Passo 1.5 — Alterar `agendamentos.profissional` de TEXT para UUID
```sql
ALTER TABLE agendamentos
  ADD COLUMN IF NOT EXISTS profissional_id UUID REFERENCES profissionais(id) ON DELETE SET NULL;
```

**Arquivo:** Criar `supabase/migrations/etapa8_integracao_total.sql` com todos os SQLs acima.

**Executar no Supabase:** Rodar a migration no SQL Editor do dashboard Supabase.

---

### FASE 2: APIs CRUD (Profissionais, Serviços, Horários)
> Backend para alimentar e consultar os novos dados

#### Passo 2.1 — `app/api/profissionais/route.ts`
```
GET  → lista profissionais ativos da clínica
POST → cria novo profissional
```

#### Passo 2.2 — `app/api/profissionais/[id]/route.ts`
```
PATCH  → edita profissional
DELETE → desativa (soft delete: ativo=false)
```

#### Passo 2.3 — `app/api/servicos/route.ts`
```
GET  → lista serviços ativos da clínica
POST → cria novo serviço
```

#### Passo 2.4 — `app/api/servicos/[id]/route.ts`
```
PATCH  → edita serviço
DELETE → desativa
```

#### Passo 2.5 — `app/api/horarios/route.ts`
```
GET  → retorna horários de funcionamento da clínica
PUT  → salva/atualiza horários (batch upsert dos 7 dias)
```

#### Passo 2.6 — `app/api/disponibilidade/route.ts` ⭐ CRÍTICO
```
GET ?data=2026-05-07&profissional_id=xxx&servico_id=xxx
→ Retorna array de horários livres no dia

Lógica:
1. Buscar horário de funcionamento do dia (dia_semana)
2. Buscar duração do serviço solicitado
3. Buscar agendamentos já existentes no dia (status != cancelado)
4. Gerar slots disponíveis (ex: a cada 30min)
5. Remover slots com conflito
6. Retornar: [{ hora: "09:00", disponivel: true }, ...]
```

---

### FASE 3: INTERFACE — Cadastro de Profissionais e Serviços
> Telas no dashboard para gerenciar dados

#### Passo 3.1 — Aba "Equipe" nas Configurações
```
Localização: app/(dashboard)/configuracoes/page.tsx → nova aba

Conteúdo:
- Tabela com profissionais cadastrados (nome, especialidade, telefone, cor)
- Botão "+ Novo Profissional" → modal de cadastro
- Editar/Desativar inline
- Campo "Telefone para Escalação" (número que recebe msgs quando agente escala)
```

#### Passo 3.2 — Aba "Serviços" nas Configurações
```
Conteúdo:
- Tabela com serviços (nome, duração, valor)
- Botão "+ Novo Serviço" → modal
- Editar/Desativar inline
```

#### Passo 3.3 — Aba "Horários" nas Configurações
```
Conteúdo:
- Grid 7 dias da semana
- Para cada dia: toggle ativo + hora início + hora fim
- Botão salvar (batch upsert)
```

---

### FASE 4: ATUALIZAR MODELOS OPENAI
> Atualizar lista de modelos disponíveis

#### Passo 4.1 — Atualizar `components/configuracoes/AbaIntegracoes.tsx`
```typescript
const modelos = [
  { value: 'gpt-4.1', label: 'GPT-4.1 (Mais recente)' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini (Rápido e barato)' },
  { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano (Ultra rápido)' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'o3-mini', label: 'o3-mini (Raciocínio)' },
]
```

#### Passo 4.2 — Atualizar `app/admin/novo-cliente/page.tsx`
Mesma lista de modelos atualizada.

---

### FASE 5: AGENTE IA COM FUNCTION CALLING ⭐ CORAÇÃO DO SISTEMA
> Dar ao agente ferramentas reais para consultar e agir no sistema

#### Passo 5.1 — Criar `lib/agente-tools.ts`
Funções que o agente pode chamar:

```typescript
// Ferramentas disponíveis para o agente IA

export async function consultarDisponibilidade(
  clinicaId: string, data: string, servicoId?: string, profissionalId?: string
): Promise<{ slots: Array<{ hora: string; profissional: string }> }>

export async function marcarConsulta(
  clinicaId: string, contatoId: string,
  servicoId: string, profissionalId: string,
  dataHora: string
): Promise<{ agendamentoId: string; cadenciaCriada: boolean }>

export async function listarServicos(
  clinicaId: string
): Promise<Array<{ id: string; nome: string; duracao: number; valor: number }>>

export async function listarProfissionais(
  clinicaId: string
): Promise<Array<{ id: string; nome: string; especialidade: string }>>

export async function consultarAgendamentosPaciente(
  clinicaId: string, contatoId: string
): Promise<Array<{ servico: string; data: string; status: string }>>

export async function cancelarAgendamento(
  agendamentoId: string
): Promise<{ sucesso: boolean }>

export async function escalarParaHumano(
  clinicaId: string, conversaId: string, motivo: string
): Promise<{ notificado: boolean }>
```

#### Passo 5.2 — Refatorar `lib/openai.ts` para usar Function Calling
```typescript
// Trocar de: resposta JSON fixa com "acoes"
// Para: OpenAI Function Calling nativo

const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'consultar_disponibilidade',
      description: 'Consulta horários disponíveis na agenda da clínica',
      parameters: {
        type: 'object',
        properties: {
          data: { type: 'string', description: 'Data no formato YYYY-MM-DD' },
          servico: { type: 'string', description: 'Nome do serviço desejado' },
          profissional: { type: 'string', description: 'Nome do profissional (opcional)' },
        },
        required: ['data']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'marcar_consulta',
      description: 'Marca uma consulta na agenda. Só chamar após paciente confirmar data/hora.',
      parameters: {
        type: 'object',
        properties: {
          servico: { type: 'string' },
          profissional: { type: 'string' },
          data_hora: { type: 'string', description: 'ISO 8601' },
        },
        required: ['servico', 'data_hora']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'listar_servicos',
      description: 'Lista serviços oferecidos pela clínica com preços e durações',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'cancelar_agendamento',
      description: 'Cancela agendamento existente do paciente',
      parameters: {
        type: 'object',
        properties: {
          agendamento_id: { type: 'string' }
        },
        required: ['agendamento_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'consultar_meus_agendamentos',
      description: 'Consulta agendamentos futuros do paciente',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'escalar_humano',
      description: 'Transfere atendimento para humano. Usar quando paciente pedir.',
      parameters: {
        type: 'object',
        properties: {
          motivo: { type: 'string' }
        },
        required: ['motivo']
      }
    }
  }
]

// Loop de execução:
// 1. Enviar mensagem + tools para OpenAI
// 2. Se resposta tem tool_calls → executar função → enviar resultado de volta
// 3. Repetir até obter resposta final de texto (max 5 iterações)
```

#### Passo 5.3 — Refatorar `app/api/agente/processar/route.ts`
Substituir o bloco de "ações" manuais pelo loop de function calling.

#### Passo 5.4 — Implementar `escalarParaHumano` com notificação real
```typescript
async function escalarParaHumano(clinicaId, conversaId, motivo) {
  const supabase = createAdminClient()

  // 1. Marcar conversa como aguardando humano
  await supabase.from('conversas')
    .update({ agente_ativo: false, status: 'aguardando_humano' })
    .eq('id', conversaId)

  // 2. Buscar telefone de escalação da config
  const { data: config } = await supabase.from('clinica_config')
    .select('telefone_escalacao')
    .eq('clinica_id', clinicaId)
    .single()

  // 3. Enviar notificação WhatsApp para o responsável
  if (config?.telefone_escalacao) {
    const evolution = await createEvolutionClient(clinicaId)
    const { data: conversa } = await supabase.from('conversas')
      .select('contatos(nome, telefone)')
      .eq('id', conversaId)
      .single()

    await evolution.sendText(config.telefone_escalacao,
      `🔔 *Escalação de Atendimento*\n\n` +
      `Paciente: ${conversa.contatos.nome}\n` +
      `Tel: ${conversa.contatos.telefone}\n` +
      `Motivo: ${motivo}\n\n` +
      `Acesse o sistema para continuar o atendimento.`
    )
  }

  // 4. Salvar mensagem de sistema
  await supabase.from('mensagens').insert({
    conversa_id: conversaId,
    clinica_id: clinicaId,
    de: 'sistema',
    texto: `Atendimento escalado para humano. Motivo: ${motivo}`,
    enviado_em: new Date().toISOString(),
    lido: true,
  })

  return { notificado: !!config?.telefone_escalacao }
}
```

---

### FASE 6: CORRIGIR CRONS (Bug crítico)
> Os crons usam `createClient()` que precisa de auth — devem usar `createAdminClient()`

#### Passo 6.1 — Corrigir em todos os crons:
```
Arquivos afetados:
- app/api/cron/anti-noshow/route.ts    ← trocar createClient → createAdminClient
- app/api/cron/follow-up/route.ts      ← trocar createClient → createAdminClient
- app/api/cron/nutricao/route.ts       ← trocar createClient → createAdminClient
- app/api/cron/reaquecimento/route.ts  ← trocar createClient → createAdminClient

Mudar import:
- DE:  import { createClient } from '@/lib/supabase/server'
- PARA: import { createAdminClient } from '@/lib/supabase/admin'

Mudar uso:
- DE:  const supabase = await createClient()
- PARA: const supabase = createAdminClient()
```

---

### FASE 7: CONECTAR CADÊNCIAS COM O AGENTE
> Follow-up e nutrição devem usar IA para personalizar mensagens

#### Passo 7.1 — Criar `lib/cadencia-ia.ts`
```typescript
// Ao invés de enviar template fixo, usa IA para personalizar

export async function personalizarMensagemCadencia(
  clinicaId: string,
  contatoId: string,
  templateBase: string,
  tipoCadencia: 'followup' | 'nutricao' | 'anti_noshow'
): Promise<string> {
  // 1. Buscar contexto do contato (histórico, último atendimento)
  // 2. Buscar config da clínica (tom, nome do agente)
  // 3. Pedir ao GPT para personalizar o template mantendo a essência
  // 4. Retornar mensagem personalizada
}
```

#### Passo 7.2 — Integrar nos crons de follow-up e nutrição
Antes de enviar via Evolution, chamar `personalizarMensagemCadencia()`.

#### Passo 7.3 — Respostas dos pacientes devem ser capturadas pelo webhook
Quando um paciente responde a uma cadência (ex: "SIM" para confirmar consulta):
```
webhook → detecta que contato tem cadência ativa
→ Se tipo anti_noshow e texto contém "SIM" → confirmar agendamento
→ Se tipo anti_noshow e texto contém "NÃO" → escalar para humano
→ Se tipo followup e paciente engajou → pausar cadência, iniciar conversa IA
```

---

### FASE 8: INTERFACE DE CONFIGURAÇÕES COMPLETA
> Telas para configurar tudo

#### Passo 8.1 — Reorganizar abas de Configurações
```
Abas finais:
1. Identidade       → nome, logo, cores, fonte
2. Equipe           → CRUD de profissionais + telefone escalação ⭐ NOVO
3. Serviços         → CRUD de serviços com preço/duração ⭐ NOVO
4. Horários         → Grade de horários por dia da semana ⭐ NOVO
5. Agente IA        → nome, tom, prompt, chat de teste
6. WhatsApp         → QR code, status, reconectar
7. Integrações      → OpenAI key, modelo (lista atualizada), Google Calendar
8. Automações       → Templates de anti-noshow, follow-up, nutrição
```

---

### FASE 9: TESTES E VALIDAÇÃO

#### Passo 9.1 — Testar fluxo completo de agendamento via WhatsApp
```
1. Paciente: "Quero marcar uma consulta"
2. Agente chama listar_servicos() → mostra opções
3. Paciente escolhe serviço
4. Agente chama consultar_disponibilidade() → mostra horários
5. Paciente confirma horário
6. Agente chama marcar_consulta() → cria agendamento + cadência anti-noshow
7. Agente confirma para o paciente
```

#### Passo 9.2 — Testar escalação para humano
```
1. Paciente: "Quero falar com uma pessoa"
2. Agente chama escalar_humano()
3. Responsável recebe notificação no WhatsApp
4. Na interface, conversa aparece como "Aguardando humano"
```

#### Passo 9.3 — Testar cadência anti-noshow com resposta
```
1. Agendamento criado → cadência ativada
2. Cron envia "Confirma presença? SIM ou NÃO"
3. Paciente responde "SIM"
4. Webhook detecta → confirma agendamento automaticamente
```

#### Passo 9.4 — Testar follow-up automático
```
1. Lead fica 2 dias sem resposta
2. Cron cria cadência de follow-up
3. Mensagem personalizada pela IA é enviada
4. Paciente responde → cadência pausa, agente IA assume
```

---

## ORDEM DE EXECUÇÃO RECOMENDADA

| Ordem | Fase | Prioridade | Estimativa |
|-------|------|------------|------------|
| 1º | **Fase 1** — Migration banco de dados | 🔴 Crítica | 30min |
| 2º | **Fase 6** — Corrigir crons (createAdminClient) | 🔴 Crítica | 15min |
| 3º | **Fase 4** — Atualizar modelos OpenAI | 🟡 Rápida | 10min |
| 4º | **Fase 2** — APIs CRUD | 🔴 Crítica | 1h |
| 5º | **Fase 3** — Interface configurações | 🟡 Importante | 1.5h |
| 6º | **Fase 5** — Function Calling do agente | 🔴 Crítica | 2h |
| 7º | **Fase 7** — Conectar cadências com agente | 🟡 Importante | 1.5h |
| 8º | **Fase 8** — Configurações completas | 🟡 Importante | 1h |
| 9º | **Fase 9** — Testes end-to-end | 🔴 Crítica | 1h |

**Tempo total estimado: ~9 horas de execução**

---

## ARQUITETURA FINAL — VISÃO DO FLUXO INTEGRADO

```
                    ┌─────────────────────────┐
                    │    PACIENTE (WhatsApp)   │
                    └─────────┬───────────────┘
                              │
                    ┌─────────▼───────────────┐
                    │    Evolution API         │
                    │    (Webhook POST)        │
                    └─────────┬───────────────┘
                              │
                    ┌─────────▼───────────────┐
                    │  /api/whatsapp/webhook   │
                    │  - Identifica contato    │
                    │  - Salva mensagem        │
                    │  - Detecta cadência ativa│◄── Se resposta a cadência:
                    │  - Dispara agente        │    confirma/cancela automaticamente
                    └─────────┬───────────────┘
                              │
                    ┌─────────▼───────────────┐
                    │  /api/agente/processar   │
                    │  - GPT-4.1 + Tools      │
                    │                         │
                    │  🔧 FERRAMENTAS:        │
                    │  ├─ listar_servicos()   │◄── Tabela servicos
                    │  ├─ consultar_disp()    │◄── Tabela agendamentos + horarios
                    │  ├─ marcar_consulta()   │──► Tabela agendamentos + cadências
                    │  ├─ cancelar_agend()    │──► Tabela agendamentos
                    │  ├─ meus_agendamentos()│◄── Tabela agendamentos
                    │  └─ escalar_humano()    │──► WhatsApp do responsável
                    │                         │
                    └─────────┬───────────────┘
                              │
                    ┌─────────▼───────────────┐
                    │  Evolution API (envio)   │
                    │  → Resposta ao paciente  │
                    └─────────────────────────┘

    ┌──────────────── CRONS (VERCEL) ────────────────┐
    │                                                  │
    │  08h: /api/cron/anti-noshow                     │
    │       → Envia confirmações 48h/24h/2h antes     │
    │                                                  │
    │  09h: /api/cron/follow-up                       │
    │       → Reativa leads parados há 2+ dias        │
    │                                                  │
    │  10h: /api/cron/nutricao                        │
    │       → Nutre leads em negociação               │
    │                                                  │
    │  11h (qua): /api/cron/reaquecimento             │
    │       → Campanhas de reaquecimento em lote       │
    │                                                  │
    │  07h (seg): /api/cron/relatorio-semanal          │
    │       → Gera relatório com IA + envia WhatsApp   │
    └──────────────────────────────────────────────────┘
```

---

## RESPOSTA ÀS SUAS PERGUNTAS

### 1. "O escalar humano tá indo pra onde a msg?"
**Hoje:** Apenas muda `agente_ativo = false` no banco. A mensagem NÃO vai para ninguém.
**Solução (Fase 5.4):** Adicionar campo `telefone_escalacao` nas configurações. Quando escalar, enviar WhatsApp para esse número com nome do paciente + motivo.

### 2. "Modelos da OpenAI são poucos e antigos"
**Hoje:** `gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo`
**Solução (Fase 4):** Adicionar `gpt-4.1, gpt-4.1-mini, gpt-4.1-nano, o3-mini`.

### 3. "Cadastrar profissionais: aba ou no prompt?"
**Resposta:** **Aba dedicada (tabela no banco)** — é a prática correta para escala.
- No prompt: funciona para 1 clínica, mas se a equipe muda, precisa editar manualmente.
- Na tabela: o agente consulta dinamicamente, agenda filtra por profissional, múltiplas clínicas funcionam independentes.

---

> Para executar, me peça: **"Execute a Fase X"** e eu implemento passo a passo.
