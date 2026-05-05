import { NextRequest } from 'next/server'
import { timingSafeEqual, createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
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
    contatoId: string
    texto: string
    contato: { nome: string; telefone: string }
  }

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { clinicaId, conversaId, contatoId, texto, contato } = body

  if (!clinicaId || !conversaId || !contatoId || !texto || !contato) {
    return Response.json(
      { error: 'clinicaId, conversaId, contatoId, texto e contato são obrigatórios' },
      { status: 400 }
    )
  }

  try {
    const supabase = createAdminClient()

    // 2. Verificar se agente está ativo (humano pode ter assumido)
    const { data: conversa } = await supabase
      .from('conversas')
      .select('agente_ativo, status')
      .eq('id', conversaId)
      .single()

    if (!conversa || conversa.agente_ativo === false || conversa.status === 'aguardando_humano') {
      return Response.json({ ok: true, motivo: 'humano_ativo' })
    }

    // 3. Processar mensagem com IA (function calling loop)
    const resultado = await processarMensagem({
      clinicaId,
      conversaId,
      contatoId,
      mensagemUsuario: texto,
      contato,
    })

    // 4. Salvar resposta do agente no Supabase
    await supabase.from('mensagens').insert({
      conversa_id: conversaId,
      clinica_id: clinicaId,
      de: 'agente',
      texto: resultado.resposta,
      enviado_em: new Date().toISOString(),
      lido: true,
    })

    // 5. Atualizar timestamp da conversa + status se escalado
    const updateConversa: Record<string, unknown> = {
      atualizado_em: new Date().toISOString(),
    }

    if (resultado.escalado) {
      // escalarParaHumano() já atualizou agente_ativo e status
      // Apenas garantir consistência
      updateConversa.status = 'aguardando_humano'
    }

    await supabase
      .from('conversas')
      .update(updateConversa)
      .eq('id', conversaId)

    // 6. Enviar resposta via Evolution API
    try {
      const evolution = await createEvolutionClient(clinicaId)
      await evolution.sendText(contato.telefone, resultado.resposta)
    } catch (evoErr) {
      console.error('[Agente] Erro ao enviar via Evolution', evoErr)
      // Não falha o fluxo — mensagem já foi salva no banco
    }

    return Response.json({
      ok: true,
      ferramentas_usadas: resultado.ferramentasUsadas,
      escalado: resultado.escalado,
    })
  } catch (err) {
    console.error('[Agente] Erro crítico ao processar mensagem', err)
    return Response.json(
      { error: 'Erro interno ao processar mensagem' },
      { status: 500 }
    )
  }
}
