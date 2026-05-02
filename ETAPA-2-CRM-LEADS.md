# ETAPA 2 — CRM + LEADS
# Pré-requisito: Etapa 1 concluída e funcionando.
# Leia o CLAUDE.md antes de começar.

## OBJETIVO

Construir o CRM Kanban e o módulo de Leads com dados reais do Supabase.
Ao final, o usuário consegue gerenciar todo o pipeline de pacientes.

---

## MÓDULO: CRM — Pipeline Kanban

### `app/(dashboard)/crm/page.tsx`

Server Component. Busca todos os leads com contato vinculado.
Passa os dados para o Client Component `<KanbanBoard />`.

### `components/crm/KanbanBoard.tsx` (Client Component)

5 colunas fixas:
```typescript
const ETAPAS = [
  { id: 'lead',              label: 'Lead',              cor: '#4B5563' },
  { id: 'consulta_agendada', label: 'Consulta Agendada', cor: '#1D4ED8' },
  { id: 'negociacao',        label: 'Em Negociação',     cor: '#D97706' },
  { id: 'procedimento',      label: 'Procedimento',      cor: '#2D8B73' },
  { id: 'pos_venda',         label: 'Pós-venda',         cor: '#7C3AED' },
]
```

Cada coluna mostra:
- Header com cor, nome da etapa, contador de cards, soma de valor (R$)
- Cards de leads (componente `<LeadCard />`)
- Área de drop

Drag and drop com HTML5 nativo (sem biblioteca):
- onDragStart no card: salva id do lead no dataTransfer
- onDragOver na coluna: preventDefault para habilitar drop
- onDrop na coluna: chama API para atualizar etapa no Supabase

### `components/crm/LeadCard.tsx`

```
┌─────────────────────────────────┐
│ Nome do Paciente          🔥    │ ← badge temperatura
│ Serviço: Botox facial           │
│ R$ 580,00          Instagram    │ ← origem
│ 2 dias nesta etapa              │
└─────────────────────────────────┘
```

Clicável — abre drawer lateral com detalhes completos.

### `components/crm/LeadDrawer.tsx` (Client Component)

Drawer lateral (shadcn Sheet) com:
- Dados do contato (nome, telefone, origem)
- Histórico de agendamentos
- Notas editáveis (auto-save no Supabase)
- Botão "Mover etapa"
- Botão "Adicionar nota"
- Timeline de interações

### API: `app/api/leads/[id]/etapa/route.ts`

```typescript
// PATCH — atualiza etapa do lead
// Body: { etapa: string }
// Valida que a etapa é válida
// Atualiza no Supabase
// Retorna lead atualizado
```

### `app/(dashboard)/crm/novo/page.tsx`

Formulário para criar novo lead:
- Busca contato existente por telefone (autocomplete)
- Se não existe, cria novo contato
- Campos: nome, telefone, serviço, valor estimado, origem, temperatura
- Redireciona para CRM após criar

---

## MÓDULO: LEADS — Tabela Centralizada

### `app/(dashboard)/leads/page.tsx`

Server Component. Busca todos os leads com contatos.

### `components/leads/LeadsTable.tsx` (Client Component)

TanStack Table com:

Colunas:
- Nome (com telefone abaixo em menor)
- Serviço
- Origem (badge)
- Temperatura (badge colorido: Quente/Morno/Frio)
- Status (badge: Novo/Em contato/Agendado/etc)
- Último contato (data relativa: "há 2 dias")
- Valor estimado
- Ações (ver detalhes, mover, excluir)

Filtros acima da tabela (chips clicáveis):
- Por status
- Por temperatura
- Por origem
- Campo de busca por nome/telefone

Paginação: 20 por página.

### `components/leads/FiltrosLeads.tsx` (Client Component)

Chips de filtro que atualizam URL params.
A tabela lê os params e filtra os dados.
Isso permite compartilhar links filtrados.

### API: `app/api/leads/route.ts`

```typescript
// GET — lista leads com filtros via query params
// POST — cria novo lead
// Filtros: etapa, temperatura, status, busca, page, limit

// app/api/leads/[id]/route.ts
// GET — busca lead com histórico completo
// PATCH — atualiza campos do lead
// DELETE — soft delete (ativo = false)
```

---

## MÓDULO: CONTATOS

### `app/(dashboard)/leads/[id]/page.tsx`

Página de perfil completo do contato:
- Dados pessoais
- Score de valor (total gasto, nº procedimentos)
- Timeline de todas as interações
- Agendamentos históricos
- Conversas WhatsApp resumidas
- Cadências ativas

---

## HOOKS

### `hooks/useLeads.ts`
```typescript
// useLeads(filtros) — lista paginada com filtros
// useLead(id) — lead individual com detalhes
// useMoverLead() — mutation para mover no kanban
// useAtualizarLead() — mutation para editar campos
```

Usar Supabase Realtime para atualizar kanban em tempo real quando outro usuário mover um card.

---

## SEED DE DADOS PARA DESENVOLVIMENTO

Criar `supabase/migrations/002_seed_dev.sql` com dados fictícios suficientes para testar:
- 2 contatos
- 8 leads distribuídos nas 5 etapas
- Dados variados de origem e temperatura

---

## CHECKLIST ETAPA 2

- [ ] Kanban renderiza os 5 estágios
- [ ] Drag and drop funciona e salva no banco
- [ ] Drawer de detalhes abre e fecha
- [ ] Notas salvam em tempo real
- [ ] Tabela de leads com filtros funcionando
- [ ] Busca por nome/telefone funciona
- [ ] Criação de novo lead funciona
- [ ] Realtime: mover card em uma aba atualiza outra aba
