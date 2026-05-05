import OpenAI from 'openai'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ClinicaConfig, Contato } from '@/types'
import {
  listarServicos,
  listarProfissionais,
  consultarDisponibilidade,
  marcarConsulta,
  consultarAgendamentosPaciente,
  cancelarAgendamento,
  escalarParaHumano,
} from '@/lib/agente-tools'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ProcessarMensagemInput {
  clinicaId: string
  conversaId: string
  contatoId: string
  mensagemUsuario: string
  contato: {
    nome: string
    telefone: string
  }
}

export interface ProcessarMensagemOutput {
  resposta: string
  ferramentasUsadas: string[]
  escalado: boolean
}

interface MensagemDB {
  de: 'cliente' | 'agente' | 'sistema'
  texto: string | null
  enviado_em: string
}

// ─── Definição das ferramentas (OpenAI function calling) ──────────────────────

const TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'listar_servicos',
      description: 'Lista os serviços oferecidos pela clínica com preços e durações. Use quando o paciente perguntar sobre serviços, preços ou o que a clínica oferece.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'listar_profissionais',
      description: 'Lista os profissionais disponíveis na clínica com suas especialidades.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'consultar_disponibilidade',
      description: 'Consulta horários livres na agenda da clínica para uma data específica. Use para mostrar opções de horário ao paciente.',
      parameters: {
        type: 'object',
        properties: {
          data: {
            type: 'string',
            description: 'Data no formato YYYY-MM-DD. Se o paciente disser "amanhã", calcule a data correta.',
          },
          servico: {
            type: 'string',
            description: 'Nome do serviço desejado (opcional).',
          },
          profissional: {
            type: 'string',
            description: 'Nome do profissional preferido (opcional).',
          },
        },
        required: ['data'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'marcar_consulta',
      description: 'Marca uma consulta na agenda. IMPORTANTE: Só chamar após o paciente confirmar explicitamente a data, o horário e o serviço. Nunca marcar sem confirmação.',
      parameters: {
        type: 'object',
        properties: {
          servico: {
            type: 'string',
            description: 'Nome do serviço a ser agendado.',
          },
          data_hora: {
            type: 'string',
            description: 'Data e hora no formato "YYYY-MM-DD HH:MM" (ex: "2026-05-10 09:00").',
          },
          profissional: {
            type: 'string',
            description: 'Nome do profissional (opcional).',
          },
        },
        required: ['servico', 'data_hora'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'consultar_meus_agendamentos',
      description: 'Consulta os próximos agendamentos do paciente que está conversando.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancelar_agendamento',
      description: 'Cancela um agendamento existente do paciente. Use o ID retornado por consultar_meus_agendamentos.',
      parameters: {
        type: 'object',
        properties: {
          agendamento_id: {
            type: 'string',
            description: 'ID do agendamento a cancelar.',
          },
        },
        required: ['agendamento_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'escalar_humano',
      description: 'Transfere o atendimento para um humano. Use quando: paciente pedir explicitamente, situação complexa que a IA não consegue resolver, ou reclamação grave.',
      parameters: {
        type: 'object',
        properties: {
          motivo: {
            type: 'string',
            description: 'Motivo da escalação para o humano.',
          },
        },
        required: ['motivo'],
      },
    },
  },
]

// ─── System Prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(
  config: Pick<ClinicaConfig, 'agente_nome' | 'agente_prompt' | 'agente_tom'> & {
    clinica_nome?: string
  },
  contato: Pick<Contato, 'nome' | 'telefone'>,
  dataHojeStr: string
): string {
  const nome = config.agente_nome ?? 'Luna'
  const clinicaNome = config.clinica_nome ?? 'nossa clínica'
  const tom = config.agente_tom ?? 'profissional e acolhedor'
  const promptBase = config.agente_prompt ?? ''

  return `Você é ${nome}, assistente virtual da ${clinicaNome}.
Tom: ${tom}
Data de hoje: ${dataHojeStr}

CONTEXTO DA CLÍNICA:
${promptBase}

PACIENTE ATUAL:
Nome: ${contato.nome}
Telefone: ${contato.telefone}

REGRAS OBRIGATÓRIAS:
1. Use sempre o primeiro nome do paciente
2. Nunca invente preços ou horários — use as ferramentas para consultar
3. Para agendar: sempre chame consultar_disponibilidade antes e confirme com o paciente
4. Só chame marcar_consulta após confirmação explícita do paciente
5. Respostas concisas — máximo 3 parágrafos
6. Use emojis com moderação para mensagens mais amigáveis
7. Se não souber algo, diga que vai verificar com a equipe`
}

// ─── Histórico de mensagens ───────────────────────────────────────────────────

function buildHistorico(mensagens: MensagemDB[]): OpenAI.Chat.ChatCompletionMessageParam[] {
  return mensagens
    .filter(m => m.texto && m.de !== 'sistema')
    .map(m => ({
      role: m.de === 'cliente' ? 'user' : 'assistant',
      content: m.texto!,
    })) as OpenAI.Chat.ChatCompletionMessageParam[]
}

// ─── Executor de ferramentas ──────────────────────────────────────────────────

async function executarFerramenta(
  nome: string,
  args: Record<string, string>,
  clinicaId: string,
  conversaId: string,
  contatoId: string
): Promise<unknown> {
  switch (nome) {
    case 'listar_servicos':
      return listarServicos(clinicaId)

    case 'listar_profissionais':
      return listarProfissionais(clinicaId)

    case 'consultar_disponibilidade':
      return consultarDisponibilidade(
        clinicaId,
        args.data,
        args.servico,
        args.profissional
      )

    case 'marcar_consulta':
      return marcarConsulta(
        clinicaId,
        contatoId,
        args.servico,
        args.data_hora,
        args.profissional
      )

    case 'consultar_meus_agendamentos':
      return consultarAgendamentosPaciente(clinicaId, contatoId)

    case 'cancelar_agendamento':
      return cancelarAgendamento(args.agendamento_id)

    case 'escalar_humano':
      return escalarParaHumano(clinicaId, conversaId, contatoId, args.motivo)

    default:
      throw new Error(`Ferramenta desconhecida: ${nome}`)
  }
}

// ─── Função principal ─────────────────────────────────────────────────────────

/**
 * Processa a mensagem de um paciente com o agente IA usando Function Calling.
 * Loop: envia mensagem → executa ferramentas → repete até obter resposta final.
 */
export async function processarMensagem(
  input: ProcessarMensagemInput
): Promise<ProcessarMensagemOutput> {
  const { clinicaId, conversaId, contatoId, mensagemUsuario, contato } = input

  const supabase = createAdminClient()

  // 1. Buscar config da clínica
  const { data: configData, error: configError } = await supabase
    .from('clinica_config')
    .select('agente_nome, agente_prompt, agente_tom, openai_api_key, openai_model')
    .eq('clinica_id', clinicaId)
    .single()

  if (configError || !configData) {
    throw new Error(`[OpenAI] Config não encontrada para clinica_id=${clinicaId}`)
  }

  // 2. Buscar nome da clínica
  const { data: clinicaData } = await supabase
    .from('clinicas')
    .select('nome')
    .eq('id', clinicaId)
    .single()

  // 3. Buscar histórico das últimas 20 mensagens
  const { data: historicoData } = await supabase
    .from('mensagens')
    .select('de, texto, enviado_em')
    .eq('conversa_id', conversaId)
    .order('enviado_em', { ascending: true })
    .limit(20)

  const historico = (historicoData ?? []) as MensagemDB[]

  // 4. API Key e modelo
  const apiKey =
    (configData.openai_api_key as string | null) ??
    process.env.OPENAI_API_KEY ??
    ''

  if (!apiKey) {
    throw new Error(`[OpenAI] API key não configurada para clinica_id=${clinicaId}`)
  }

  const openai = new OpenAI({ apiKey })
  const model = (configData.openai_model as string | null) ?? 'gpt-4.1'

  // 5. Montar mensagens
  const dataHoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const systemPrompt = buildSystemPrompt(
    {
      agente_nome: configData.agente_nome,
      agente_prompt: configData.agente_prompt,
      agente_tom: configData.agente_tom,
      clinica_nome: clinicaData?.nome,
    },
    contato,
    dataHoje
  )

  const mensagens: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...buildHistorico(historico),
    { role: 'user', content: mensagemUsuario },
  ]

  // 6. Loop de function calling (máximo 5 iterações)
  const ferramentasUsadas: string[] = []
  let escalado = false
  const MAX_ITERACOES = 5

  for (let i = 0; i < MAX_ITERACOES; i++) {
    const completion = await openai.chat.completions.create({
      model,
      messages: mensagens,
      tools: TOOLS,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 1024,
    })

    const choice = completion.choices[0]
    const msg = choice.message

    // Adicionar resposta do modelo ao histórico do loop
    mensagens.push(msg)

    // Sem tool_calls = resposta final de texto
    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return {
        resposta: msg.content ?? 'Olá! Em que posso ajudar? 😊',
        ferramentasUsadas,
        escalado,
      }
    }

    // Executar cada ferramenta chamada pelo modelo
    for (const toolCall of msg.tool_calls) {
      // Type guard: só processar function tool calls
      if (toolCall.type !== 'function') continue

      // Cast local — evita dependência de subtipo interno da lib que varia por versão
      type FunctionToolCall = { id: string; type: 'function'; function: { name: string; arguments: string } }
      const fn = toolCall as unknown as FunctionToolCall
      const nomeFerramenta = fn.function.name
      ferramentasUsadas.push(nomeFerramenta)

      if (nomeFerramenta === 'escalar_humano') {
        escalado = true
      }

      let resultado: unknown
      try {
        const args = JSON.parse(fn.function.arguments) as Record<string, string>
        resultado = await executarFerramenta(
          nomeFerramenta,
          args,
          clinicaId,
          conversaId,
          contatoId
        )
      } catch (err) {
        console.error(`[OpenAI] Erro ao executar ferramenta ${nomeFerramenta}`, err)
        resultado = { erro: String(err) }
      }

      // Adicionar resultado da ferramenta ao histórico do loop
      mensagens.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(resultado),
      })
    }
  }

  // Fallback: se chegou no limite de iterações
  console.warn('[OpenAI] Limite de iterações de function calling atingido')
  return {
    resposta: 'Olá! Estou processando sua solicitação. Em breve retorno com mais detalhes. 😊',
    ferramentasUsadas,
    escalado,
  }
}
