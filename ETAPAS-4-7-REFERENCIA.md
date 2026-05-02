# ETAPAS 4 A 7 — REFERÊNCIA COMPLETA
# Leia o CLAUDE.md antes de iniciar qualquer etapa.

---

# ETAPA 4 — AGENDAMENTO + ANTI NO-SHOW

## Objetivo
Sistema de agendamento com calendário e cadências automáticas de confirmação.

## Agendamento (`app/(dashboard)/agendamento/`)

### Interface
- **Vista do dia** (padrão): timeline das 08h às 20h com blocos por horário
- **Vista da semana**: grid 7 dias × horários
- Mini calendário lateral para navegação
- Cada bloco: nome, serviço, duração, badge de status

### Criar agendamento
Modal com:
- Busca de contato por nome/telefone
- Serviço (campo livre + sugestões baseadas no histórico)
- Data + hora (date/time picker)
- Duração (select: 30/45/60/90/120 min)
- Profissional
- Valor
- Ao salvar: cria agendamento + dispara criação automática de cadência anti no-show

### Status do agendamento
Chips clicáveis para mudar status: Agendado → Confirmado → Realizado / No-show / Cancelado
Ao marcar "Realizado": atualiza lead para "procedimento" ou "pos_venda"
Ao marcar "No-show": atualiza métricas + pergunta se quer reagendar

### API: `app/api/agendamentos/route.ts`
```
GET  — lista por data, filtros
POST — cria agendamento + dispara cadência anti no-show
PATCH /[id] — atualiza status
DELETE /[id] — cancela (soft)
```

---

## Anti No-Show (`app/(dashboard)/anti-no-show/`)

### Lógica da Cadência (automática, criada junto com o agendamento)

```
Ao criar agendamento:
  → Cadência tipo: anti_noshow
  → Etapa 1: mensagem 48h antes  (agendado automaticamente)
  → Etapa 2: mensagem 24h antes
  → Etapa 3: mensagem 2h antes

Templates padrão:
  Etapa 1: "Oi {nome}! Confirmando sua consulta de {servico} na {clinica} 
            para {data} às {hora}. Você confirma presença? Responda SIM ou NÃO."
  Etapa 2: "Lembrete, {nome}! Sua consulta é amanhã às {hora}. Confirmado? 😊"
  Etapa 3: "Você tem consulta em 2 horas, {nome}! Te esperamos às {hora} 🌿"
```

### Cron: `app/api/cron/anti-noshow/route.ts`

```
Executa todo dia às 08h
1. Busca cadências ativas tipo anti_noshow com proxima_execucao <= agora
2. Para cada uma:
   a. Verifica se agendamento ainda está ativo
   b. Renderiza template com dados reais
   c. Envia via Evolution API
   d. Salva etapa como "enviado"
   e. Calcula e salva proxima_execucao
3. Protegido por header Authorization: Bearer {CRON_SECRET}
```

### Interface
- Lista de agendamentos futuros com status de cada etapa da cadência
- Timeline visual: ✅ enviado / ⏳ pendente / 📅 agendado / 💬 respondido
- Respostas recebidas exibidas inline
- Botão "Enviar agora" para etapas pendentes
- Configurar templates por clínica (na página de Config)

---

# ETAPA 5 — AUTOMAÇÕES

## Follow-up (`app/(dashboard)/follow-up/`)

### Lógica
Ativado automaticamente quando lead fica X dias sem resposta (configurável).

```
Ao lead ficar sem resposta por 2 dias:
  → Cadência tipo: followup
  → 3 tentativas com tom diferente:
    1. Direto: "Oi {nome}, ainda posso te ajudar com {servico}?"
    2. Valor: mensagem focada no benefício do procedimento
    3. Urgência/encerramento: última tentativa, tom de fechamento
```

### Cron: `app/api/cron/follow-up/route.ts`
```
Executa todo dia às 09h
Busca leads com status "novo" ou "em_contato" parados há 2+ dias
Cria ou avança cadência de follow-up
```

### Interface
- Cards por lead com as 3 tentativas e seus status
- Mensagem de cada tentativa editável antes de enviar
- Botão "Encerrar follow-up" (marca lead como frio)

---

## Nutrição (`app/(dashboard)/nutricao/`)

### Lógica
Ativado para leads em negociação — mantém o lead quente enquanto decide.

```
Ao lead entrar em "negociacao":
  → Cadência tipo: nutricao
  → Sequência de 4-7 mensagens ao longo de 2 semanas:
    Dia 1: educacional sobre o procedimento
    Dia 3: prova social (resultado de outro paciente)
    Dia 5: urgência ou escassez
    Dia 7: oferta ou facilitador
```

### Interface
- Para cada lead: barra de progresso da sequência
- Cada mensagem: tipo, conteúdo, status, data de envio programada
- Editar mensagem antes de enviar
- Pausar/retomar sequência

---

## Reaquecimento (`app/(dashboard)/reaquecimento/`)

### Lógica
Campanha manual disparada para base inativa (últimos X meses sem visita).

```
Fluxo:
1. Operador cria campanha:
   - Define período de inatividade (ex: 3+ meses)
   - Escreve template da mensagem
   - Preview conta quantos contatos serão impactados
2. Confirma e dispara
3. Sistema envia em lotes de 20/hora (evitar bloqueio do WhatsApp)
4. Dashboard da campanha em tempo real
```

### Interface
- Formulário de nova campanha
- Preview: "Esta campanha alcançará 318 contatos"
- Painel da campanha ativa: gauge de progresso, responderam, agendamentos gerados
- Lista de contatos com resposta recebida
- Botão pausar/retomar

### API: `app/api/campanhas/reaquecimento/route.ts`
```
POST /criar — cria campanha
POST /disparar/[id] — inicia envio em background
GET /status/[id] — progresso em tempo real
PATCH /pausar/[id]
```

---

# ETAPA 6 — INTELIGÊNCIA

## IA de Decisão (`app/(dashboard)/ia-decisao/`)

### Interface de Chat
- Histórico de perguntas e respostas
- Campo de input + botão enviar
- Loading: "Analisando dados da clínica..." (1-2s)
- Respostas formatadas em markdown

### Sistema Prompt da IA de Decisão

```
Você é um analista de negócios especializado em clínicas de saúde e estética.
Você tem acesso aos dados da {clinica_nome}.

DADOS DISPONÍVEIS PARA ANÁLISE:
- Receita: {dados_receita}
- Leads: {dados_leads}
- Agendamentos: {dados_agendamentos}
- No-show: {taxa_noshow}
- Conversão: {taxa_conversao}
- Top serviços: {top_servicos}

Responda perguntas estratégicas do dono da clínica com base nesses dados.
Use números específicos sempre que possível.
Seja direto e prático. Máximo 3 parágrafos.
Se não houver dados suficientes para responder, diga claramente.
```

### API: `app/api/ia-decisao/route.ts`
```
POST — recebe pergunta, busca dados reais do Supabase, chama GPT-4o, retorna resposta
Dados buscados: métricas do mês, top leads, agendamentos, campanhas
```

---

## Relatório Semanal (`app/(dashboard)/relatorio/`)

### Geração Automática
Cron toda segunda às 07h: gera relatório via GPT-4o com dados da semana anterior.
Salva no Supabase tabela `relatorios`.

### Interface
- Selector de semana (padrão: última semana)
- Card com resumo gerado pela IA (estilo executivo)
- Grid de 6 métricas com variação vs semana anterior
- Lista de ações recomendadas com checkbox
- Botão "Exportar PDF" (usa window.print com CSS @media print)

### Cron: `app/api/cron/relatorio-semanal/route.ts`
```
Executa toda segunda às 07h
1. Agrega métricas da semana (leads, consultas, receita, no-show, conversão)
2. Busca ações pendentes da semana
3. Chama GPT-4o para gerar resumo executivo
4. Salva relatório no Supabase
5. Envia WhatsApp para o responsável da clínica com resumo
```

---

# ETAPA 7 — CONFIGURAÇÕES + POLISH FINAL

## Configurações (`app/(dashboard)/configuracoes/`)

### Abas
1. **Identidade** — nome, logo (upload para Supabase Storage), cores
2. **Agente IA** — nome, prompt, tom, chat de teste interno
3. **WhatsApp** — QR code, status da instância, reconectar
4. **Automações** — templates de cada cadência (anti no-show, follow-up, nutrição)
5. **Integrações** — OpenAI API key, Google Calendar
6. **Plano** — módulos ativos, limites do plano

### Aba Agente IA — Chat de Teste
Mini chat interno que simula o agente sem precisar do WhatsApp conectado.
Ideal para o dono validar o prompt antes de ativar com pacientes reais.

### Aba WhatsApp
```
┌─────────────────────────────────────────┐
│ Status: ● Conectado                      │
│ Número: +55 86 99812-3344               │
│                                          │
│ [Desconectar]  [Reconectar]             │
└─────────────────────────────────────────┘

Se desconectado:
┌─────────────────────────────────────────┐
│ Status: ○ Desconectado                   │
│                                          │
│ [QR Code aparece aqui]                  │
│ Escaneie com o WhatsApp do número       │
│ da clínica                              │
│                                          │
│ Atualizando em 30s...                   │
└─────────────────────────────────────────┘
```

Polling a cada 5s para verificar se conectou após mostrar QR.

### API: `app/api/configuracoes/route.ts`
```
GET — busca config da clínica
PATCH — atualiza campos (validação por campo)
POST /logo — upload de logo para Supabase Storage
```

---

## Polish Final (Etapa 7)

1. **Onboarding** — wizard de 4 passos para nova clínica:
   - Dados básicos
   - Configurar agente
   - Conectar WhatsApp
   - Importar contatos (CSV)

2. **Notificações** — badge no sino no header:
   - Lead novo
   - Paciente esperando resposta há X min
   - Agendamento de no-show hoje
   - Relatório semanal disponível

3. **Busca global** — cmd+K abre busca em contatos, leads, conversas

4. **Responsivo mobile** — sidebar vira drawer em < 768px

5. **Página 404 e erros** — telas customizadas com identidade Opus

---

## CHECKLIST FINAL DO SISTEMA COMPLETO

- [ ] Login / Logout funcionando
- [ ] Dashboard com dados reais
- [ ] CRM Kanban com drag and drop
- [ ] Tabela de leads com filtros
- [ ] WhatsApp recebendo e respondendo
- [ ] Agente IA respondendo com contexto
- [ ] Agendamento criando cadências automáticas
- [ ] Anti no-show enviando confirmações
- [ ] Follow-up ativando automaticamente
- [ ] Nutrição disparando sequências
- [ ] Reaquecimento com campanha em lotes
- [ ] IA de decisão respondendo com dados reais
- [ ] Relatório semanal gerado automaticamente
- [ ] Configurações salvas e aplicadas
- [ ] QR Code conectando WhatsApp real
- [ ] Deploy estável na Vercel
- [ ] RLS ativo — dados isolados por clínica
