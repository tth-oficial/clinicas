import { NextRequest, after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { detectarRespostaAntiNoshow, detectarEngajamentoFollowup } from '@/lib/cadencia-ia'
import { verifyBody } from '@/lib/webhook-signature'

export const maxDuration = 60

const PLACEHOLDER_SECRET = 'trocar_por_string_aleatoria_forte'

// ─── Validação de assinatura ──────────────────────────────────────────────────
// HMAC-SHA256 do raw body com WEBHOOK_SECRET. A Evolution precisa enviar
// o header `x-webhook-signature: sha256=<hex>` (configurado em
// EvolutionAPI.setWebhook) computado sobre o mesmo corpo.

function isValidSignature(
  request: NextRequest,
  rawBody: string,
  signature: string | null
): boolean {
  const secret = process.env.WEBHOOK_SECRET

  // Em produção, secret é obrigatório — fail-closed
  if (!secret || secret === PLACEHOLDER_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Webhook] WEBHOOK_SECRET não configurado em produção')
      return false
    }
    return true
  }

  if (!signature) return false
  return verifyBody(rawBody, secret, signature)
}

// ─── POST /api/whatsapp/webhook ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // 1. Ler body cru para HMAC. JSON.parse vem depois — assinatura é
  // calculada sobre os bytes exatos, não sobre o objeto reserializado.
  const bodyText = await request.text()
  const signature = request.headers.get('x-webhook-signature')

  if (!isValidSignature(request, bodyText, signature)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let evento: Record<string, unknown>
  try {
    evento = JSON.parse(bodyText) as Record<string, unknown>
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 })
  }

  // 2. Processar apenas mensagens recebidas — normaliza separadores (.,_,-)
  // Evolution pode enviar: "messages.upsert", "MESSAGES_UPSERT", "messages-upsert"
  const eventRaw = (evento.event as string | undefined) ?? ''
  const eventName = eventRaw.toUpperCase().replace(/[.\-]/g, '_')
  if (eventName !== 'MESSAGES_UPSERT') {
    return Response.json({ ok: true })
  }

  const data = evento.data as Record<string, unknown> | undefined
  if (!data) return Response.json({ ok: true })

  // 3. Extrair key e ignorar mensagens próprias (fromMe fica em data.key.fromMe)
  const key = data.key as Record<string, unknown> | undefined
  if (key?.fromMe === true || data.fromMe === true) {
    return Response.json({ ok: true })
  }

  // 4. Extrair dados da mensagem
  const message = data.message as Record<string, unknown> | undefined
  const pushName = (data.pushName as string | undefined) ?? ''
  const remoteJid =
    (key?.remoteJid as string | undefined) ??
    (data.remoteJid as string | undefined) ??
    ''

  if (!remoteJid || remoteJid.endsWith('@g.us')) {
    // Ignorar grupos
    return Response.json({ ok: true })
  }

  const telefone = remoteJid.replace('@s.whatsapp.net', '').replace('+', '')
  const texto =
    (message?.conversation as string | undefined) ??
    ((message?.extendedTextMessage as Record<string, unknown> | undefined)
      ?.text as string | undefined) ??
    ((message?.imageMessage as Record<string, unknown> | undefined)
      ?.caption as string | undefined) ??
    ((message?.videoMessage as Record<string, unknown> | undefined)
      ?.caption as string | undefined) ??
    ((message?.documentMessage as Record<string, unknown> | undefined)
      ?.caption as string | undefined) ??
    ((message?.buttonsResponseMessage as Record<string, unknown> | undefined)
      ?.selectedDisplayText as string | undefined) ??
    ((message?.listResponseMessage as Record<string, unknown> | undefined)
      ?.title as string | undefined) ??
    ''

  if (!texto.trim()) {
    console.log('[Webhook] Mensagem sem texto, ignorando', {
      messageType: data.messageType,
      keys: message ? Object.keys(message) : [],
    })
    return Response.json({ ok: true })
  }

  // 5. Identificar clínica pelo header ou query param
  // A Evolution API deve ser configurada para enviar x-clinica-id no webhook
  const clinicaId =
    request.headers.get('x-clinica-id') ??
    request.nextUrl.searchParams.get('clinicaId')

  if (!clinicaId) {
    console.error('[Webhook] clinicaId ausente nos headers ou query params')
    return Response.json({ error: 'clinicaId não identificado' }, { status: 400 })
  }

  try {
    // Webhook é server-to-server — usar service role para contornar RLS
    const supabase = createAdminClient()

    // 6. Buscar ou criar contato
    let { data: contato } = await supabase
      .from('contatos')
      .select('id, nome, telefone')
      .eq('clinica_id', clinicaId)
      .eq('telefone', telefone)
      .single()

    if (!contato) {
      const nomeContato = pushName || `+${telefone}`
      const { data: novoContato, error: erroContato } = await supabase
        .from('contatos')
        .insert({
          clinica_id: clinicaId,
          nome: nomeContato,
          telefone,
          origem: 'whatsapp',
          ativo: true,
          total_procedimentos: 0,
          total_gasto: 0,
        })
        .select('id, nome, telefone')
        .single()

      if (erroContato || !novoContato) {
        console.error('[Webhook] Erro ao criar contato', erroContato)
        return Response.json({ error: 'Erro ao criar contato' }, { status: 500 })
      }

      contato = novoContato
    }

    // 7. Buscar ou criar conversa ativa
    let { data: conversa } = await supabase
      .from('conversas')
      .select('id, agente_ativo')
      .eq('clinica_id', clinicaId)
      .eq('contato_id', contato.id)
      .order('criado_em', { ascending: false })
      .limit(1)
      .single()

    if (!conversa) {
      const { data: novaConversa, error: erroConversa } = await supabase
        .from('conversas')
        .insert({
          clinica_id: clinicaId,
          contato_id: contato.id,
          agente_ativo: true,
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
        })
        .select('id, agente_ativo')
        .single()

      if (erroConversa || !novaConversa) {
        console.error('[Webhook] Erro ao criar conversa', erroConversa)
        return Response.json({ error: 'Erro ao criar conversa' }, { status: 500 })
      }

      conversa = novaConversa

      // Mensagem de sistema ao iniciar conversa
      await supabase.from('mensagens').insert({
        conversa_id: conversa.id,
        clinica_id: clinicaId,
        de: 'sistema',
        texto: 'Conversa iniciada via WhatsApp',
        enviado_em: new Date().toISOString(),
        lido: true,
      })
    } else {
      // Atualizar timestamp da conversa
      await supabase
        .from('conversas')
        .update({ atualizado_em: new Date().toISOString() })
        .eq('id', conversa.id)
    }

    // 8. Salvar mensagem do cliente no Supabase
    const { error: erroMensagem } = await supabase.from('mensagens').insert({
      conversa_id: conversa.id,
      clinica_id: clinicaId,
      de: 'cliente',
      texto,
      enviado_em: new Date().toISOString(),
      lido: false,
    })

    if (erroMensagem) {
      console.error('[Webhook] Erro ao salvar mensagem', erroMensagem)
    }

    // 9. ── Detecção de respostas a cadências ativas ────────────────────────
    // Verifica se o contato tem cadência ativa e processa a resposta antes
    // de passar ao agente IA

    const { data: cadenciaAtiva } = await supabase
      .from('cadencias')
      .select('id, tipo, agendamento_id')
      .eq('clinica_id', clinicaId)
      .eq('contato_id', contato.id)
      .eq('status', 'ativa')
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (cadenciaAtiva) {
      if (cadenciaAtiva.tipo === 'anti_noshow') {
        const resposta = detectarRespostaAntiNoshow(texto)

        if (resposta === 'confirmar' && cadenciaAtiva.agendamento_id) {
          // Confirmar presença: atualizar agendamento + encerrar cadência
          await supabase
            .from('agendamentos')
            .update({ status: 'confirmado', atualizado_em: new Date().toISOString() })
            .eq('id', cadenciaAtiva.agendamento_id)

          await supabase
            .from('cadencias')
            .update({ status: 'concluida', atualizado_em: new Date().toISOString() })
            .eq('id', cadenciaAtiva.id)

          await supabase.from('mensagens').insert({
            conversa_id: conversa.id,
            clinica_id: clinicaId,
            de: 'sistema',
            texto: '✅ Presença confirmada automaticamente pelo paciente.',
            enviado_em: new Date().toISOString(),
            lido: true,
          })

          console.log(`[Webhook] Agendamento ${cadenciaAtiva.agendamento_id} confirmado automaticamente`)
          return Response.json({ ok: true, acao: 'presenca_confirmada' })
        }

        if (resposta === 'cancelar' && cadenciaAtiva.agendamento_id) {
          // Cancelar agendamento + encerrar cadência + notificar agente para contato
          await supabase
            .from('agendamentos')
            .update({ status: 'cancelado', atualizado_em: new Date().toISOString() })
            .eq('id', cadenciaAtiva.agendamento_id)

          await supabase
            .from('cadencias')
            .update({ status: 'cancelada', atualizado_em: new Date().toISOString() })
            .eq('id', cadenciaAtiva.id)

          await supabase.from('mensagens').insert({
            conversa_id: conversa.id,
            clinica_id: clinicaId,
            de: 'sistema',
            texto: '❌ Agendamento cancelado pelo paciente via resposta de confirmação.',
            enviado_em: new Date().toISOString(),
            lido: true,
          })

          console.log(`[Webhook] Agendamento ${cadenciaAtiva.agendamento_id} cancelado automaticamente`)
          // Deixa o agente responder para oferecer reagendamento
        }
      } else if (
        cadenciaAtiva.tipo === 'followup' ||
        cadenciaAtiva.tipo === 'nutricao'
      ) {
        if (detectarEngajamentoFollowup(texto)) {
          // Paciente engajou — pausar cadência e deixar o agente IA assumir
          await supabase
            .from('cadencias')
            .update({ status: 'pausada', atualizado_em: new Date().toISOString() })
            .eq('id', cadenciaAtiva.id)

          // Atualizar lead para em_contato se estava parado
          const { data: cad } = await supabase
            .from('cadencias')
            .select('lead_id')
            .eq('id', cadenciaAtiva.id)
            .single()

          if (cad?.lead_id) {
            await supabase
              .from('leads')
              .update({ status: 'em_contato', temperatura: 'morno', atualizado_em: new Date().toISOString() })
              .eq('id', cad.lead_id)
          }

          console.log(`[Webhook] Cadência ${cadenciaAtiva.id} pausada — paciente engajou, agente IA assumindo`)
        }
      }
    }

    // 10. Disparar agente IA após retornar resposta ao webhook.
    // after() garante que o Vercel mantém o processo vivo até a promise resolver,
    // evitando o problema do fire-and-forget onde o sandbox podia ser encerrado
    // antes da subrequest completar.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const cronSecret = process.env.CRON_SECRET ?? ''

    after(async () => {
      try {
        await fetch(`${appUrl}/api/agente/processar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': cronSecret,
          },
          body: JSON.stringify({
            clinicaId,
            conversaId: conversa.id,
            contatoId: contato.id,
            texto,
            contato: {
              nome: contato.nome,
              telefone: contato.telefone,
            },
          }),
        })
      } catch (err) {
        console.error('[Webhook] Erro ao disparar agente', err)
      }
    })

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[Webhook] Erro crítico', err)
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}

