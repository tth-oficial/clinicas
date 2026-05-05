import OpenAI from 'openai'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ClinicaConfig, Contato } from '@/types'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ProcessarMensagemInput {
  clinicaId: string
  conversaId: string
  mensagemUsuario: string
  contato: {
    nome: string
    telefone: string
    historico?: string
  }
}

export interface AcoesAgente {
  criarAgendamento?: {
    servico: string
    preferencia: string
  }
  atualizarLead?: {
    etapa?: string
    temperatura?: string
  }
  escalarHumano?: boolean
}

export interface ProcessarMensagemOutput {
  resposta: string
  acoes?: AcoesAgente
}

interface MensagemDB {
  de: 'cliente' | 'agente' | 'sistema'
  texto: string | null
  enviado_em: string
}

// ─── Funções auxiliares (internas) ────────────────────────────────────────────

function buildSystemPrompt(
  config: Pick<
    ClinicaConfig,
    'agente_nome' | 'agente_prompt' | 'agente_tom'
  > & { clinica_nome?: string },
  contato: Pick<Contato, 'nome' | 'telefone'>
): string {
  const nome = config.agente_nome ?? 'Luna'
  const clinicaNome = config.clinica_nome ?? 'nossa clínica'
  const tom = config.agente_tom ?? 'acolhedor'
  const promptBase = config.agente_prompt ?? ''

  return `Você é ${nome}, assistente virtual da ${clinicaNome}.
Tom: ${tom}

CONTEXTO DA CLÍNICA:
${promptBase}

INFORMAÇÕES DO PACIENTE:
Nome: ${contato.nome}
Telefone: ${contato.telefone}

INSTRUÇÕES OBRIGATÓRIAS:
1. Sempre use o primeiro nome do paciente
2. Nunca invente preços — diga que vai verificar com a equipe
3. Para agendar: sempre confirme data, hora e serviço antes de finalizar
4. Se não souber responder, diga que vai verificar e retornar em breve
5. Máximo 3 parágrafos por resposta
6. Se o paciente pedir para falar com humano, defina escalarHumano: true nas ações

AÇÕES DISPONÍVEIS:
Você pode retornar ações estruturadas no campo "acoes" quando:
- Paciente confirma agendamento → criarAgendamento: { servico, preferencia }
- Conversa indica mudança de temperatura/etapa → atualizarLead: { etapa?, temperatura? }
- Paciente quer atendimento humano → escalarHumano: true

FORMATO DE RESPOSTA — OBRIGATÓRIO:
Responda SEMPRE em JSON válido com este formato exato:
{ "resposta": "texto da resposta aqui", "acoes": {} }
O campo "acoes" pode ser um objeto vazio {} se não houver ações.`
}

function buildHistorico(
  mensagens: MensagemDB[]
): OpenAI.Chat.ChatCompletionMessageParam[] {
  return mensagens
    .filter((m) => m.texto && m.de !== 'sistema')
    .map((m) => ({
      role: m.de === 'cliente' ? 'user' : 'assistant',
      content: m.texto!,
    })) as OpenAI.Chat.ChatCompletionMessageParam[]
}

// ─── Função principal ─────────────────────────────────────────────────────────

/**
 * Processa a mensagem de um paciente com o agente IA.
 * Busca a config da clínica, histórico da conversa e chama GPT-4o.
 */
export async function processarMensagem(
  input: ProcessarMensagemInput
): Promise<ProcessarMensagemOutput> {
  const { clinicaId, conversaId, mensagemUsuario, contato } = input

  // Chamado a partir do webhook (server-to-server) — service role para RLS
  const supabase = createAdminClient()

  // 1. Buscar config da clínica (prompt, tom, nome, key)
  const { data: configData, error: configError } = await supabase
    .from('clinica_config')
    .select(
      'agente_nome, agente_prompt, agente_tom, openai_api_key, openai_model'
    )
    .eq('clinica_id', clinicaId)
    .single()

  if (configError || !configData) {
    console.error('[OpenAI] Erro ao buscar config da clínica', {
      clinicaId,
      configError,
    })
    throw new Error(`Config não encontrada para clinica_id=${clinicaId}`)
  }

  // 2. Buscar nome da clínica
  const { data: clinicaData } = await supabase
    .from('clinicas')
    .select('nome')
    .eq('id', clinicaId)
    .single()

  // 3. Buscar histórico das últimas 20 mensagens da conversa
  const { data: historicoData } = await supabase
    .from('mensagens')
    .select('de, texto, enviado_em')
    .eq('conversa_id', conversaId)
    .order('enviado_em', { ascending: true })
    .limit(20)

  const historico = (historicoData ?? []) as MensagemDB[]

  // 4. Montar system prompt
  const systemPrompt = buildSystemPrompt(
    {
      agente_nome: configData.agente_nome,
      agente_prompt: configData.agente_prompt,
      agente_tom: configData.agente_tom,
      clinica_nome: clinicaData?.nome,
    },
    contato
  )

  // 5. Montar histórico para o modelo
  const mensagensHistorico = buildHistorico(historico)

  // 6. Definir API key — prioridade: config da clínica → env global
  const apiKey =
    (configData.openai_api_key as string | null) ??
    process.env.OPENAI_API_KEY ??
    ''

  if (!apiKey) {
    throw new Error(
      `[OpenAI] API key não configurada para clinica_id=${clinicaId}`
    )
  }

  const openai = new OpenAI({ apiKey })
  const model =
    (configData.openai_model as string | null) ?? 'gpt-4o'

  // 7. Chamar GPT-4o
  const completion = await openai.chat.completions.create({
    model,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      ...mensagensHistorico,
      { role: 'user', content: mensagemUsuario },
    ],
    temperature: 0.7,
    max_tokens: 1024,
  })

  const conteudo = completion.choices[0]?.message?.content ?? '{}'

  // 8. Parse seguro da resposta JSON
  let resultado: ProcessarMensagemOutput
  try {
    const parsed = JSON.parse(conteudo) as {
      resposta?: string
      acoes?: AcoesAgente
    }
    resultado = {
      resposta: parsed.resposta ?? 'Desculpe, não consegui processar sua mensagem.',
      acoes: parsed.acoes,
    }
  } catch (err) {
    console.error('[OpenAI] Falha ao parsear JSON da resposta', {
      conteudo,
      err,
    })
    resultado = {
      resposta:
        'Olá! Recebi sua mensagem e em breve retornaremos. 😊',
      acoes: {},
    }
  }

  return resultado
}
