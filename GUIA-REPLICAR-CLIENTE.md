# GUIA OPERACIONAL — ATIVAÇÃO DE NOVO CLIENTE
# Uso interno exclusivo — Thiago / Opus Clínicas
# NÃO compartilhar com clientes

---

## COMO FUNCIONA POR DENTRO (você precisa entender isso)

O sistema é **multi-tenant**: um único código, um único deploy na Vercel, um único
banco no Supabase — servindo todos os clientes ao mesmo tempo.

Cada clínica tem seu próprio `clinica_id` no banco. O RLS (Row Level Security) do
Supabase garante que cada usuário só enxerga os dados da própria clínica. A cor,
o logo, o nome, o agente, tudo é lido do banco no momento do login — então cada
cliente abre o sistema e vê "o sistema deles".

**Para o cliente, a experiência é 100% personalizada.**
Para você, ativar um cliente novo é inserir algumas linhas no banco.

---

## O QUE O CLIENTE VÊ vs. O QUE REALMENTE É

| O que o cliente percebe | O que é na prática |
|---|---|
| "Meu sistema foi desenvolvido para minha clínica" | Um módulo com os dados dele no banco |
| "Minha IA foi treinada para meu negócio" | Um prompt personalizado no campo `agente_prompt` |
| "Minhas cores e logo são exclusivos" | `cor_principal` e `logo_url` na `clinica_config` |
| "Tenho um sistema profissional na minha URL" | O mesmo deploy Vercel com o `clinica_id` na sessão |
| "Meu WhatsApp está integrado" | Uma instância separada na Evolution API |

Nunca mencione outros clientes. Nunca use linguagem de "template" ou "plataforma".
Use sempre "o seu sistema", "configuramos para a sua clínica", "personalizamos para você".

---

## TEMPO ESTIMADO: 25–35 minutos por cliente novo

---

## PRÉ-REQUISITOS (você só configura uma vez)

- [ ] Deploy na Vercel rodando (URL fixa, ex: `opus-app.vercel.app`)
- [ ] Projeto Supabase com todas as migrations rodadas
- [ ] Evolution API hospedada (seu servidor)
- [ ] Variáveis de ambiente configuradas na Vercel

Se ainda não fez isso, veja o **PATCH-PERSONALIZACAO-VISUAL.md**.

---

## PASSO 1 — Criar a clínica no banco (8 min)

Acesse **Supabase → SQL Editor** e rode o bloco abaixo substituindo os valores.
Cole tudo de uma vez — os UUIDs são gerados e usados automaticamente.

```sql
-- ── Substitua os valores entre colchetes ──────────────────────────────────

DO $$
DECLARE
  v_clinica_id UUID;
  v_user_id    UUID;
BEGIN

-- 1. Criar a clínica
INSERT INTO clinicas (nome, responsavel, especialidade, cidade, whatsapp, plano)
VALUES (
  'Clínica Bella Vida',          -- nome real da clínica
  'Dra. Ana Lima',               -- nome do responsável
  'Estética e Bem-estar',        -- especialidade
  'Teresina, PI',                -- cidade
  '5586999990000',               -- WhatsApp no formato 55 + DDD + número (só números)
  'medio'                        -- plano: entrada | medio | alto
)
RETURNING id INTO v_clinica_id;

-- 2. Criar configuração personalizada
INSERT INTO clinica_config (
  clinica_id,
  nome_exibicao,
  slogan,
  cor_principal,
  fonte,
  agente_nome,
  agente_tom,
  agente_prompt,
  openai_api_key,
  openai_model,
  evolution_url,
  evolution_api_key,
  evolution_instance,
  modulos_ativos
) VALUES (
  v_clinica_id,
  'Clínica Bella Vida',          -- nome exibido no sistema (pode ser mais curto)
  'Sua beleza, nosso cuidado',   -- slogan (aparece na sidebar)
  '#1B5E4F',                     -- cor principal em hex (gera todo o tema automaticamente)
  'Plus Jakarta Sans',           -- fonte: Plus Jakarta Sans | Inter | Nunito | Poppins
  'Sofia',                       -- nome da IA (escolha algo que combine com a clínica)
  'profissional e acolhedor',    -- tom: profissional e acolhedor | amigável e descontraído | empático e cuidadoso
  -- PROMPT DA IA (personalizar por completo — veja templates na seção abaixo)
  'Você é Sofia, assistente virtual da Clínica Bella Vida.
Atenda com simpatia e profissionalismo.
Serviços: [preencher após reunião com cliente]
Horários: segunda a sexta, 8h às 19h.
Para agendar: confirme nome, serviço e data preferida.
Não informe preços fora da lista acima.
Para urgências, passe o telefone: (86) 99999-0000.',
  'sk-...',                      -- OpenAI API Key (pedir para o cliente criar a conta deles em platform.openai.com)
  'gpt-4o',                      -- modelo (manter gpt-4o para melhor qualidade)
  'https://evolution.seudominio.com', -- URL da sua Evolution API
  'sua-evolution-api-key',        -- API Key da Evolution
  'bella-vida',                   -- nome da instância (slug sem espaços, único por cliente)
  ARRAY['dashboard','crm','whatsapp','agendamento','anti_noshow',
        'leads','followup','nutricao','reaquecimento','ia_decisao','relatorio']
);

-- 3. Exibir os IDs gerados (copie para usar nos próximos passos)
RAISE NOTICE 'clinica_id: %', v_clinica_id;

END $$;
```

Após rodar, anote o `clinica_id` exibido no log de saída.

---

## PASSO 2 — Criar acesso do responsável (3 min)

**No Supabase → Authentication → Users → Add User:**
- Email: o email do dono/responsável da clínica
- Password: gere uma senha forte (ex: `BellaVida@2025`)
- Auto Confirm: **SIM**

Após criar, copie o `user_id` (UUID na coluna "User UID").

Depois rode no SQL Editor:

```sql
-- Substitua os dois UUIDs abaixo
INSERT INTO usuarios_clinicas (user_id, clinica_id, papel)
VALUES (
  'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',  -- user_id copiado do Auth
  'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy',  -- clinica_id do passo anterior
  'admin'
);
```

---

## PASSO 3 — Configurar WhatsApp na Evolution API (8 min)

**No painel da Evolution API:**

1. Criar nova instância:
   - Nome: `bella-vida` (mesmo nome usado em `evolution_instance` no passo 1)
   - Copie a **API Key** gerada para essa instância

2. Configurar webhook da instância:
   ```
   URL:    https://opus-app.vercel.app/api/whatsapp/webhook?clinicaId=CLINICA_ID
   Events: MESSAGES_UPSERT, CONNECTION_UPDATE
   Base64: ATIVADO
   ```
   *(substitua `CLINICA_ID` pelo UUID da clínica e `opus-app.vercel.app` pela sua URL real)*

3. Configurar settings da instância:
   ```
   rejectCall:      true   (rejeita chamadas no WhatsApp)
   groupsIgnore:    true   (ignora grupos)
   alwaysOnline:    true   (aparece sempre online)
   readMessages:    false
   syncFullHistory: false
   ```

---

## PASSO 4 — Fazer o primeiro login e personalizar (5 min)

Acesse o sistema com o email/senha do cliente que você criou.

**Configurações → Identidade:**
- Upload do logo (PNG ou SVG, fundo transparente de preferência)
- A cor já está configurada — o tema inteiro é gerado automaticamente
- Confirme que o nome e slogan estão certos

**Configurações → Agente IA:**
- Revise o prompt com as informações reais da clínica
- Use o **chat de teste interno** para simular uma conversa de paciente
- Ajuste o tom até o dono da clínica aprovar

**Configurações → WhatsApp:**
- Clique **Conectar**
- QR Code aparece na tela
- O responsável escaneia com o celular da clínica (não o pessoal dele)
- Status muda para "Conectado ✓"

---

## PASSO 5 — Importar base de contatos (3 min)

Se o cliente tiver uma lista de pacientes:

1. Ir em **Configurações → Onboarding** ou usar `POST /api/contatos/importar`
2. Preparar o CSV no formato:
   ```
   nome,telefone,email
   Maria Silva,5586999990001,maria@email.com
   João Souza,5586999990002,
   ```
3. Upload do arquivo → sistema importa em lotes

Isso alimenta o módulo de **Reaquecimento** imediatamente.

---

## PASSO 6 — Treinamento com o cliente (30 min — presencial ou vídeo)

Esta é a parte mais importante para o cliente sentir que o sistema é dele.

**Roteiro da apresentação:**

| Tempo | O que mostrar | O que falar |
|---|---|---|
| 5 min | Dashboard | "Aqui você acompanha tudo da sua clínica em tempo real" |
| 5 min | WhatsApp + IA respondendo | "Sua IA já está respondendo — veja como ela se apresenta para seus pacientes" |
| 5 min | CRM Kanban | "Cada lead que entra pelo WhatsApp cai aqui automaticamente" |
| 5 min | Anti no-show | "O sistema manda confirmações automáticas 48h, 24h e 2h antes de cada consulta" |
| 5 min | Relatório | "Toda segunda-feira você recebe um resumo do que aconteceu na semana" |
| 5 min | Configurações → Agente IA | "Aqui é onde você ajusta o que a IA fala — como se fosse treinar uma funcionária" |

**Frases que geram percepção de valor:**
- "Configuramos a IA especificamente para o seu tipo de atendimento"
- "Esses templates de mensagem foram escritos pensando no perfil dos seus pacientes"
- "O sistema já conhece os seus serviços e preços"
- "Deixamos a identidade visual igual à da sua clínica"

**Nunca dizer:**
- "Para os outros clientes fazemos assim..."
- "Isso é padrão do sistema..."
- "É só um template que personalizamos..."

---

## PROMPT DA IA — Templates por nicho

Copie, preencha os dados reais e cole em **Configurações → Agente IA → Prompt**.

### Estética / Beleza

```
Você é [NOME], assistente virtual da [CLÍNICA].
Atenda pacientes com simpatia e profissionalismo.

SERVIÇOS E VALORES:
- Botox (testa + glabela): R$ 800
- Preenchimento labial: R$ 1.200
- Limpeza de pele profunda: R$ 180
- [adicionar todos os serviços]

HORÁRIOS:
Segunda a sexta: 8h às 19h
Sábado: 8h às 13h

COMO AGENDAR:
Pergunte: nome completo, serviço desejado, dia e horário de preferência.
Confirme a disponibilidade e finalize o agendamento.

REGRAS IMPORTANTES:
- Nunca informe preços fora da lista acima
- Não faça promessas de resultado (ex: "vai sumir completamente")
- Para dúvidas técnicas ou médicas, diga que vai chamar a [Dra. Nome]
- Se o paciente pedir para falar com humano, diga: "Claro! Vou chamar nossa equipe agora mesmo 😊"
- Use emojis com moderação 🌿✨

DIFERENCIAL DA [CLÍNICA]:
[Descrever o diferencial — ex: atendimento humanizado, produtos importados, etc.]
```

### Odontologia

```
Você é [NOME], assistente virtual da [CLÍNICA ODONTOLÓGICA].

ESPECIALIDADES:
- Ortodontia (aparelho), Implante, Clareamento, Restauração, Limpeza
[listar as disponíveis]

CONVÊNIOS ACEITOS:
[listar ou "não trabalhamos com convênio — apenas particular"]

CONSULTA INICIAL:
A avaliação custa R$ [valor] e tem duração de 30 minutos.
O valor é abatido no tratamento caso o paciente prossiga.

PARA URGÊNCIAS (dor, acidente):
"Entendo! Temos horário de urgência disponível. Pode vir hoje às [horário]?"
Se fora do horário: passe o telefone [número].

AGENDAMENTO:
Confirme: nome, tipo de consulta desejada, plano (se aceito), data/hora.
```

### Fisioterapia / Saúde

```
Você é [NOME], assistente da [CLÍNICA].

ESPECIALIDADES:
- Fisioterapia ortopédica, pós-operatória, neurológica
[listar]

SESSÕES:
Duração: 50 minutos por sessão
Pacote mínimo recomendado: 10 sessões
Avaliação inicial: R$ [valor] (gratuita na primeira consulta se fechar pacote)

CONVÊNIOS:
[listar ou informar que não aceita]

IMPORTANTE:
- Nunca indique diagnóstico via WhatsApp
- Para laudos médicos ou encaminhamentos, oriente a trazer na consulta
- Sempre reforçar a importância da avaliação presencial
```

---

## CHECKLIST COMPLETO — CLIENTE NOVO

### Técnico (você faz)
- [ ] SQL do Passo 1 rodado sem erros
- [ ] Usuário criado no Auth e vinculado à clínica
- [ ] Instância Evolution API criada
- [ ] Webhook configurado com o `clinicaId` correto
- [ ] Login testado com as credenciais do cliente
- [ ] Logo enviado e tema aplicado corretamente
- [ ] Prompt do agente preenchido com dados reais da clínica
- [ ] Teste do agente no chat interno — pelo menos 5 perguntas simuladas
- [ ] WhatsApp conectado (QR escaneado, status = Conectado)
- [ ] Contatos importados (se houver CSV)

### Entrega (com o cliente)
- [ ] Apresentação de 30 min realizada
- [ ] Cliente enviou uma mensagem de teste no próprio WhatsApp e viu a IA responder
- [ ] Cliente sabe acessar o Dashboard, CRM e Configurações
- [ ] Cliente recebeu o email/senha de acesso
- [ ] Primeiro agendamento criado juntos (ao vivo)
- [ ] Cliente aprovou o tom e as respostas da IA

---

## SEGURANÇA — O QUE GARANTIMOS AO CLIENTE

Quando o cliente perguntar "meus dados são seguros?":

> "Sim. Seus dados ficam isolados no banco com política de segurança em nível de linha
> (Row Level Security). Nenhum outro usuário do sistema consegue ver ou acessar seus
> dados — é tecnicamente impossível. Cada clínica tem sua própria chave de acesso e
> seu próprio espaço isolado."

Isso é verdade. O RLS do Supabase garante isso.

---

## PRECIFICAÇÃO SUGERIDA

| O que cobrar | Valor sugerido |
|---|---|
| Setup + personalização + treinamento | R$ 2.500 a R$ 5.000 |
| Mensalidade (manutenção + suporte) | R$ 497 a R$ 997/mês |
| OpenAI (paga pelo cliente) | ~R$ 50–200/mês dependendo do volume |
| Evolution API (sua infraestrutura) | Inclua no custo de setup ou cobre R$ 97/mês |

**O setup leva 35 minutos. O valor cobrado é pelo sistema e pelo resultado, não pelo tempo.**

---

## SENHAS E ACESSOS — CONTROLE INTERNO

Mantenha uma planilha privada com:

| Clínica | clinica_id | Email admin | Evolution instância | Plano | Desde |
|---|---|---|---|---|---|
| Bella Vida | uuid... | dra.ana@... | bella-vida | Médio | Mai/25 |

Nunca salvar senhas em texto puro — use um gerenciador (Bitwarden, 1Password).
