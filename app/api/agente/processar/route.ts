import { NextRequest } from 'next/server'
import { timingSafeEqual, createHash } from 'crypto'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { processarMensagem } from '@/lib/openai'
import { createEvolutionClient } from '@/lib/evolution'

export const maxDuration = 60

// ─── Validação de segurança ───────────────────────────────────────────────────

function safeCompare(a: string, b: string): boolean {
  const aHash = createHash('sha256').update(a).digest()
  const bHash = createHash('sha256').update(b).digest()
  return timingSafeEqual(aHash, bHash)
}

function isAuthorized(request: NextRequest): boolean {
  const secret = request.headers.get('x-internal-secret')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || cronSecret === 'trocar_por_string_aleatoria_forte') {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Agente] CRON_SECRET não configurado em produção!')
      return false
    }
    return true
  }

  if (!secret) return false
  return safeCompare(secret, cronSecret)
}

// ─── POST /api/agente/processar ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // 1. Verificar segredo interno
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    clinicaId: string
    conversaId: string
    texto: string
    contato: { nome: string; telefone: string }
  }

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { clinicaId, conversaId, texto, contato } = body

  if (!clinicaId || !conversaId || !texto || !contato) {
    return Response.json(
      { error: 'clinicaId, conversaId, texto e contato são obrigatórios' },
      { status: 400 }
    )
  }

  try {
    const supabase = await createServerClient()

    // 2. Verificar se agente está ativo (humano pode ter assumido)
    const { data: conversa } = await supabase
      .from('conversas')
      .select('agente_ativo')
      .eq('id', conversaId)
      .single()

    if (conversa && conversa.agente_ativo === false) {
      // Humano assumiu — não processar com IA
      return Response.json({ ok: true, motivo: 'humano_ativo' })
    }

    // 3. Processar mensagem com IA
    const resultado = await processarMensagem({
      clinicaId,
      conversaId,
      mensagemUsuario: texto,
      contato,
    })

    // 4. Salvar resposta do agente no Supabase
    const { error: erroMensagem } = await supabase.from('mensagens').insert({
      conversa_id: conversaId,
      clinica_id: clinicaId,
      de: 'agente',
      texto: resultado.resposta,
      enviado_em: new Date().toISOString(),
      lido: true,
    })

    if (erroMensagem) {
      console.error('[Agente] Erro ao salvar resposta', erroMensagem)
    }

    // 5. Atualizar timestamp da conversa
    await supabase
      .from('conversas')
      .update({ atualizado_em: new Date().toISOString() })
      .eq('id', conversaId)

    // 6. Executar ações do agente
    const acoes = resultado.acoes ?? {}

    // 6a. Escalar para humano
    if (acoes.escalarHumano) {
      await supabase
        .from('conversas')
        .update({ agente_ativo: false })
        .eq('id', conversaId)

      // Salvar mensagem de sistema
      await supabase.from('mensagens').insert({
        conversa_id: conversaId,
        clinica_id: clinicaId,
        de: 'sistema',
        texto: 'Paciente solicitou atendimento humano. Agente IA pausado.',
        enviado_em: new Date().toISOString(),
        lido: true,
      })
    }

    // 6b. Atualizar lead
    if (acoes.atualizarLead) {
      const { etapa, temperatura } = acoes.atualizarLead

      // Buscar lead pelo contato e clínica
      const { data: conversaComContato } = await supabase
        .from('conversas')
        .select('contato_id')
        .eq('id', conversaId)
        .single()

      if (conversaComContato?.contato_id) {
        const updatePayload: Record<string, string> = {
          atualizado_em: new Date().toISOString(),
        }
        if (etapa) updatePayload.etapa = etapa
        if (temperatura) updatePayload.temperatura = temperatura

        await supabase
          .from('leads')
          .update(updatePayload)
          .eq('contato_id', conversaComContato.contato_id)
          .eq('clinica_id', clinicaId)
      }
    }

    // 6c. Criar agendamento (registro básico para equipe revisar)
    if (acoes.criarAgendamento) {
      const { servico, preferencia } = acoes.criarAgendamento

      const { data: conversaComContato } = await supabase
        .from('conversas')
        .select('contato_id')
        .eq('id', conversaId)
        .single()

      if (conversaComContato?.contato_id) {
        await supabase.from('agendamentos').insert({
          clinica_id: clinicaId,
          contato_id: conversaComContato.contato_id,
          servico,
          status: 'agendado',
          data_hora: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // placeholder +1d
          duracao_minutos: 60,
          notas: `Preferência informada pelo paciente via WhatsApp: ${preferencia}`,
        })
      }
    }

    // 7. Enviar resposta via Evolution API
    try {
      const evolution = await createEvolutionClient(clinicaId)
      await evolution.sendText(contato.telefone, resultado.resposta)
    } catch (evoErr) {
      console.error('[Agente] Erro ao enviar via Evolution', evoErr)
      // Não falha o fluxo — mensagem já foi salva no banco
    }

    return Response.json({ ok: true, acoes })
  } catch (err) {
    console.error('[Agente] Erro crítico ao processar mensagem', err)
    return Response.json(
      { error: 'Erro interno ao processar mensagem' },
      { status: 500 }
    )
  }
}
