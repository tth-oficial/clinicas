import { createAdminClient } from '@/lib/supabase/admin'
import OpenAI from 'openai'

// ─────────────────────────────────────────────────────────────────────────────
// CADÊNCIA IA — Personalização de mensagens de cadência via GPT
// Usada pelos crons de follow-up, nutrição e anti-noshow
// ─────────────────────────────────────────────────────────────────────────────

const supabase = createAdminClient()

export type TipoCadencia = 'followup' | 'nutricao' | 'anti_noshow'

interface ContextoPersonalizacao {
  nomeContato: string
  servico: string
  tipoCadencia: TipoCadencia
  etapaNumero: number
  totalEtapas: number
  historicoResumido?: string // últimas mensagens do contato
  nomeAgente: string
  tomAgente: string
  nomeClinica: string
}

// ─── Personalizar mensagem de uma cadência com IA ────────────────────────────

export async function personalizarMensagemCadencia(
  clinicaId: string,
  contatoId: string,
  templateBase: string,
  tipoCadencia: TipoCadencia,
  etapaNumero: number = 1,
  totalEtapas: number = 3
): Promise<string> {
  try {
    // 1. Buscar configurações da clínica
    const { data: config } = await supabase
      .from('clinica_config')
      .select('openai_api_key, openai_model, agente_nome, agente_tom')
      .eq('clinica_id', clinicaId)
      .single()

    if (!config?.openai_api_key) {
      // Sem API key — retorna template sem personalização
      return templateBase
    }

    // 2. Buscar dados do contato
    const { data: contato } = await supabase
      .from('contatos')
      .select('nome')
      .eq('id', contatoId)
      .single()

    // 3. Buscar últimas mensagens do contato para contexto
    const { data: mensagens } = await supabase
      .from('mensagens')
      .select('de, texto, enviado_em')
      .eq('clinica_id', clinicaId)
      .order('enviado_em', { ascending: false })
      .limit(6)

    // Formata histórico resumido (mais recentes primeiro, invertido para contexto)
    const historicoResumido = mensagens
      ? mensagens
          .reverse()
          .filter(m => m.de !== 'sistema')
          .map(m => `${m.de === 'cliente' ? 'Paciente' : 'Assistente'}: ${m.texto}`)
          .join('\n')
      : ''

    // 4. Buscar nome da clínica
    const { data: clinica } = await supabase
      .from('clinicas')
      .select('nome')
      .eq('id', clinicaId)
      .single()

    const contexto: ContextoPersonalizacao = {
      nomeContato: contato?.nome ?? 'paciente',
      servico: extrairServicoDo(templateBase),
      tipoCadencia,
      etapaNumero,
      totalEtapas,
      historicoResumido,
      nomeAgente: config.agente_nome ?? 'Assistente',
      tomAgente: config.agente_tom ?? 'profissional e acolhedor',
      nomeClinica: clinica?.nome ?? 'clínica',
    }

    // 5. Chamar GPT para personalizar
    const mensagemPersonalizada = await chamarGPTPersonalizacao(
      config.openai_api_key,
      config.openai_model ?? 'gpt-4o-mini',
      templateBase,
      contexto
    )

    return mensagemPersonalizada
  } catch (err) {
    console.error('[cadencia-ia] Erro ao personalizar mensagem, usando template', err)
    return templateBase // Fallback: usa template original
  }
}

// ─── Chamar GPT para personalizar ─────────────────────────────────────────────

async function chamarGPTPersonalizacao(
  apiKey: string,
  modelo: string,
  templateBase: string,
  ctx: ContextoPersonalizacao
): Promise<string> {
  const openai = new OpenAI({ apiKey })

  const tipoCadenciaLabel: Record<TipoCadencia, string> = {
    followup: 'follow-up (reengajamento de lead parado)',
    nutricao: 'nutrição de lead (educação e criação de valor)',
    anti_noshow: 'anti-no-show (confirmar presença na consulta)',
  }

  const systemPrompt = `Você é ${ctx.nomeAgente} da ${ctx.nomeClinica}, assistente especialista em saúde e estética.

Seu tom: ${ctx.tomAgente}.
Tarefa: Personalizar uma mensagem de ${tipoCadenciaLabel[ctx.tipoCadencia]} para o paciente ${ctx.nomeContato}.
Esta é a etapa ${ctx.etapaNumero} de ${ctx.totalEtapas} da sequência.

REGRAS OBRIGATÓRIAS:
1. Mantenha a essência e objetivo do template original
2. Adapte o tom para soar mais natural e pessoal, não genérico
3. Não invente informações — use apenas o que está no template e contexto
4. Máximo de 200 palavras
5. Use emojis com moderação (máximo 2)
6. Responda APENAS com o texto da mensagem, sem aspas, sem explicações
7. Se o template tiver "SIM ou NÃO", mantenha essa instrução exatamente
8. Mantenha o nome do paciente na mensagem`

  const userPrompt = ctx.historicoResumido
    ? `Template original:\n${templateBase}\n\nHistórico recente da conversa:\n${ctx.historicoResumido}\n\nPersonalize a mensagem:`
    : `Template original:\n${templateBase}\n\nPersonalize a mensagem:`

  const completion = await openai.chat.completions.create({
    model: modelo,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 300,
    temperature: 0.7,
  })

  return completion.choices[0]?.message?.content?.trim() ?? templateBase
}

// ─── Extrair nome do serviço de um template ────────────────────────────────────

function extrairServicoDo(template: string): string {
  // Tenta extrair menção ao serviço do template
  // Ex: "sobre Botox" → "Botox", "com Limpeza de Pele" → "Limpeza de Pele"
  const match = template.match(/(?:sobre|com|de|para)\s+([A-Z][^,.!?]+)/i)
  return match?.[1]?.trim() ?? 'nosso serviço'
}

// ─── Detectar resposta de cadência anti-noshow ────────────────────────────────

export function detectarRespostaAntiNoshow(texto: string): 'confirmar' | 'cancelar' | null {
  const t = texto.trim().toLowerCase()

  // Confirmações positivas
  const positivos = ['sim', 's', 'ok', 'confirmo', 'confirmado', 'vou', 'estarei', 'presente', '👍', '✅', 'tá', 'ta', 'claro', 'com certeza']
  if (positivos.some(p => t === p || t.startsWith(p + ' ') || t.endsWith(' ' + p))) {
    return 'confirmar'
  }

  // Negações / cancelamentos
  const negativos = ['não', 'nao', 'n', 'cancelar', 'cancela', 'desmarcar', 'desmarca', 'não vou', 'nao vou', 'impossível', 'impossivel']
  if (negativos.some(n => t === n || t.startsWith(n + ' ') || t.includes(n))) {
    return 'cancelar'
  }

  return null
}

// ─── Detectar engajamento em follow-up/nutrição ───────────────────────────────

export function detectarEngajamentoFollowup(texto: string): boolean {
  const t = texto.trim().toLowerCase()

  // Respostas que indicam engajamento real (não apenas "ok" ou "sim")
  const indicadores = [
    'quero', 'queria', 'interesse', 'interessado', 'interessada',
    'marcar', 'agendar', 'horário', 'horario', 'quando',
    'preço', 'preco', 'valor', 'quanto custa', 'quanto fica',
    'disponível', 'disponivel', 'pode ser', 'vamos', 'sim',
    'me conta', 'me fala', 'me diz', 'como funciona',
    'preciso', 'gostaria', 'adoraria',
  ]

  return indicadores.some(i => t.includes(i))
}
