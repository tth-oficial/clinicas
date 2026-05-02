# ETAPA 3 — WHATSAPP + AGENTE IA
# Pré-requisito: Etapas 1 e 2 concluídas.
# Leia o CLAUDE.md antes de começar.

## OBJETIVO

Integrar Evolution API, construir o agente IA com OpenAI, e criar a interface
de conversas em tempo real. Esta é a peça central do produto.

---

## ARQUITETURA DO AGENTE

```
WhatsApp (paciente)
      ↓
Evolution API (webhook POST)
      ↓
/api/whatsapp/webhook
  ├── Valida assinatura (WEBHOOK_SECRET)
  ├── Identifica ou cria contato
  ├── Salva mensagem no Supabase
  └── Chama /api/agente/processar (async, não bloqueia)
            ↓
      lib/openai.ts
        ├── Busca config da clínica (prompt, tom, nome)
        ├── Busca histórico da conversa (últimas 20 msgs)
        ├── Busca dados do contato
        ├── Busca agendamentos futuros
        └── Chama GPT-4o com contexto completo
                  ↓
            lib/evolution.ts
              └── Envia resposta ao paciente
                        ↓
                  Supabase
                    ├── Salva resposta
                    ├── Atualiza conversa
                    └── Atualiza lead se necessário
```

---

## INTEGRAÇÃO: `lib/evolution.ts`

```typescript
interface EvolutionConfig {
  url: string
  apiKey: string
  instance: string
}

export class EvolutionAPI {
  constructor(private config: EvolutionConfig) {}

  // Enviar mensagem de texto
  async sendText(telefone: string, mensagem: string): Promise<void>

  // Enviar mensagem com mídia
  async sendMedia(telefone: string, url: string, caption?: string): Promise<void>

  // Buscar status da instância
  async getStatus(): Promise<'open' | 'connecting' | 'close'>

  // Buscar QR Code para conexão
  async getQRCode(): Promise<string>

  // Criar nova instância
  async createInstance(nome: string): Promise<void>

  // Conectar instância
  async connectInstance(): Promise<void>
}

// Factory: cria cliente com config da clínica
export function createEvolutionClient(clinicaId: string): Promise<EvolutionAPI>
```

---

## INTEGRAÇÃO: `lib/openai.ts`

```typescript
import OpenAI from 'openai'

interface ProcessarMensagemInput {
  clinicaId: string
  conversaId: string
  mensagemUsuario: string
  contato: { nome: string; telefone: string; historico?: string }
}

interface ProcessarMensagemOutput {
  resposta: string
  acoes?: {
    criarAgendamento?: { servico: string; preferencia: string }
    atualizarLead?: { etapa?: string; temperatura?: string }
    escalarHumano?: boolean
  }
}

// Função principal do agente
export async function processarMensagem(
  input: ProcessarMensagemInput
): Promise<ProcessarMensagemOutput>

// Constrói o system prompt com contexto da clínica
function buildSystemPrompt(config: ClinicaConfig, contato: Contato): string

// Busca histórico formatado para o prompt
function buildHistorico(mensagens: Mensagem[]): OpenAI.MessageParam[]
```

### System Prompt Base do Agente

```
Você é {agente_nome}, assistente virtual da {clinica_nome}.
Tom: {agente_tom}

CONTEXTO DA CLÍNICA:
{agente_prompt}

INFORMAÇÕES DO PACIENTE:
Nome: {contato_nome}
Telefone: {contato_telefone}
Última visita: {ultima_visita}
Procedimentos anteriores: {procedimentos}

INSTRUÇÕES OBRIGATÓRIAS:
1. Sempre use o primeiro nome do paciente
2. Nunca invente preços — diga que vai verificar com a equipe
3. Para agendar: sempre confirme data, hora e serviço antes de finalizar
4. Se não souber responder, diga que vai verificar e retornar em breve
5. Máximo 3 parágrafos por resposta
6. Se o paciente pedir para falar com humano, defina escalarHumano: true

AÇÕES DISPONÍVEIS:
Você pode retornar ações estruturadas no campo "acoes" quando:
- Paciente confirma agendamento → criarAgendamento
- Conversa indica mudança de temperatura/etapa → atualizarLead
- Paciente quer atendimento humano → escalarHumano

Responda SEMPRE em JSON: { "resposta": "texto aqui", "acoes": {} }
```

---

## API ROUTES

### `app/api/whatsapp/webhook/route.ts`

```typescript
export async function POST(request: Request) {
  // 1. Validar assinatura do webhook
  const signature = request.headers.get('x-webhook-signature')
  if (!isValidSignature(signature, WEBHOOK_SECRET)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parsear evento da Evolution API
  const evento = await request.json()

  // 3. Processar apenas mensagens recebidas (ignorar status, etc)
  if (evento.event !== 'messages.upsert') {
    return Response.json({ ok: true })
  }

  // 4. Extrair dados da mensagem
  const { pushName, remoteJid, message } = evento.data
  const telefone = remoteJid.replace('@s.whatsapp.net', '')
  const texto = message?.conversation || message?.extendedTextMessage?.text || ''

  // 5. Ignorar mensagens do próprio número
  if (evento.data.fromMe) return Response.json({ ok: true })

  // 6. Identificar clínica pelo webhook URL ou header
  const clinicaId = request.headers.get('x-clinica-id') // configurar na Evolution

  // 7. Buscar ou criar contato
  // 8. Buscar ou criar conversa
  // 9. Salvar mensagem no Supabase
  // 10. Disparar processamento do agente (sem await — responde imediato)
  processarComAgente({ clinicaId, conversaId, texto, contato }).catch(console.error)

  return Response.json({ ok: true })
}
```

### `app/api/whatsapp/send/route.ts`

```typescript
// POST — envia mensagem manual (usada pela interface)
// Body: { conversaId, texto }
// Busca config da clínica
// Envia via Evolution API
// Salva no Supabase como mensagem do agente
```

### `app/api/whatsapp/instance/route.ts`

```typescript
// GET — status da instância (open/connecting/close)
// POST — conectar instância (retorna QR code base64)
// DELETE — desconectar instância
```

### `app/api/agente/processar/route.ts`

```typescript
// POST — processa mensagem com IA
// Body: { clinicaId, conversaId, texto, contato }
// Chamado internamente pelo webhook (não exposto ao cliente)
// Protegido por CRON_SECRET interno
```

---

## INTERFACE: WHATSAPP

### `app/(dashboard)/whatsapp/page.tsx`

Layout em duas colunas:
- Esquerda (300px): lista de conversas
- Direita: conversa ativa

Server Component que carrega lista inicial de conversas.

### `components/whatsapp/ConversasList.tsx` (Client Component)

Lista de conversas ordenada por última mensagem.
Cada item:
```
[Avatar] Nome do Paciente          14:32
         Última mensagem aqui...   [3] ← não lidas
         Badge: Agente de Qualif.
```

Supabase Realtime: atualiza lista em tempo real quando chega nova mensagem.

### `components/whatsapp/ChatWindow.tsx` (Client Component)

Header: nome, telefone, badge do agente, botão "Escalar para humano"

Mensagens:
- Cliente: bolha cinza, alinhada à esquerda
- Agente IA: bolha verde escuro, alinhada à direita, badge "Luna IA"
- Sistema: texto centralizado e menor (ex: "Conversa iniciada")

Scroll automático para última mensagem.
Supabase Realtime: novas mensagens aparecem instantaneamente.

Input na base:
- Campo de texto
- Botão enviar
- Quando humano assume: input ativo com envio manual
- Quando IA está respondendo: input desabilitado com "Luna está respondendo..."

### `components/whatsapp/AgenteStatus.tsx`

Badge no header indicando o agente ativo.
Botão toggle "IA Ativa / Humano Assumiu".
Quando humano assume: agente para de responder automaticamente.

---

## INTERFACE: CONFIGURAÇÕES DO AGENTE

Na página de Configurações (será construída na Etapa 7, mas preparar a estrutura):

### Campos do Agente:
- Nome do agente (ex: "Luna")
- Tom de voz (select: profissional/acolhedor/descontraído/formal)
- Prompt principal (textarea grande com placeholder detalhado)
- Informações da clínica para o agente (serviços, preços, horários)
- Botão "Testar agente" — abre chat de teste interno

---

## REALTIME SETUP

```typescript
// hooks/useConversas.ts
export function useConversas(clinicaId: string) {
  const [conversas, setConversas] = useState<Conversa[]>([])

  useEffect(() => {
    const canal = supabase
      .channel('conversas')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'mensagens',
        filter: `clinica_id=eq.${clinicaId}`
      }, (payload) => {
        // Atualiza lista de conversas com nova mensagem
      })
      .subscribe()

    return () => supabase.removeChannel(canal)
  }, [clinicaId])

  return conversas
}
```

---

## CHECKLIST ETAPA 3

- [ ] Webhook recebe e processa mensagens da Evolution API
- [ ] Agente responde automaticamente com contexto correto
- [ ] Respostas salvas no Supabase em tempo real
- [ ] Interface de chat atualiza em tempo real (Realtime)
- [ ] Humano consegue assumir e enviar mensagens manuais
- [ ] QR Code aparece na configuração e conecta o WhatsApp
- [ ] Histórico de conversa carrega corretamente
- [ ] Ações do agente atualizam lead/agendamento no banco
