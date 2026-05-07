import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getClinicaDoUsuario } from '@/lib/supabase/queries'
import { decryptSecret } from '@/lib/crypto'
import OpenAI from 'openai'

export const maxDuration = 30

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const clinica = await getClinicaDoUsuario(user.id)

    const body = await request.json() as {
      mensagem: string
      agentePrompt?: string
      agenteTom?: string
      agenteNome?: string
    }

    if (!body.mensagem) {
      return Response.json({ error: 'mensagem é obrigatória' }, { status: 400 })
    }

    // Buscar config da clínica
    const { data: config } = await supabase
      .from('clinica_config')
      .select('openai_api_key, openai_model, agente_nome, agente_prompt, agente_tom')
      .eq('clinica_id', clinica.id)
      .single()

    const apiKey =
      decryptSecret(config?.openai_api_key ?? null) ??
      process.env.OPENAI_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'OpenAI API Key não configurada' }, { status: 400 })
    }

    const agenteNome = body.agenteNome ?? config?.agente_nome ?? 'Assistente'
    const agenteTom = body.agenteTom ?? config?.agente_tom ?? 'profissional e acolhedor'
    const agentePrompt = body.agentePrompt ?? config?.agente_prompt ??
      `Você é ${agenteNome}, assistente virtual da ${clinica.nome}.`

    const systemPrompt = `${agentePrompt}

Tom de voz: ${agenteTom}
Clínica: ${clinica.nome}

Este é um modo de TESTE interno. Responda como faria com um paciente real.
Seja conciso (máximo 3 parágrafos).`

    const openai = new OpenAI({ apiKey })

    const completion = await openai.chat.completions.create({
      model: config?.openai_model ?? 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: body.mensagem },
      ],
      max_tokens: 500,
      temperature: 0.7,
    })

    const resposta = completion.choices[0]?.message?.content ?? 'Sem resposta.'

    return Response.json({ resposta })
  } catch (err) {
    console.error('[AgenteTestar] erro', err)
    return Response.json({ error: 'Erro ao processar' }, { status: 500 })
  }
}
