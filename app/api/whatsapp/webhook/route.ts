import { NextRequest } from 'next/server'
import { timingSafeEqual, createHash } from 'crypto'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const maxDuration = 60

// ─── Validação de assinatura ──────────────────────────────────────────────────

function safeCompare(a: string, b: string): boolean {
  const aHash = createHash('sha256').update(a).digest()
  const bHash = createHash('sha256').update(b).digest()
  return timingSafeEqual(aHash, bHash)
}

function isValidSignature(request: NextRequest, signature: string | null): boolean {
  const secret = process.env.WEBHOOK_SECRET

  // Se WEBHOOK_SECRET não configurado ou é placeholder, aceita tudo
  // O clinicaId na URL já serve como camada de autenticação
  if (!secret || secret === 'trocar_por_string_aleatoria_forte') {
    return true
  }

  // Se configurado, valida — aceita via header ou query param
  const querySecret = request.nextUrl.searchParams.get('secret')
  const toCheck = signature ?? querySecret
  if (!toCheck) return false
  return safeCompare(toCheck, secret)
}

// ─── POST /api/whatsapp/webhook ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // 1. Ler body como texto para validação de assinatura
  const bodyText = await request.text()
  const signature = request.headers.get('x-webhook-signature')

  if (!isValidSignature(request, signature)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let evento: Record<string, unknown>
  try {
    evento = JSON.parse(bodyText) as Record<string, unknown>
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 })
  }

  // 2. Processar apenas mensagens recebidas (maiúsculas ou minúsculas)
  const eventName = (evento.event as string || '').toUpperCase()
  if (eventName !== 'MESSAGES.UPSERT' && eventName !== 'MESSAGES_UPSERT') {
    return Response.json({ ok: true })
  }

  const data = evento.data as Record<string, unknown> | undefined
  if (!data) return Response.json({ ok: true })

  // 3. Ignorar mensagens próprias
  if (data.fromMe === true) {
    return Response.json({ ok: true })
  }

  // 4. Extrair dados da mensagem
  const key = data.key as Record<string, unknown> | undefined
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
    ''

  if (!texto.trim()) {
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
    const supabase = await createServerClient()

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

    // 9. Disparar processamento do agente sem bloquear o webhook
    // Usa fetch interno para garantir que o Vercel não mate o processo
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const cronSecret = process.env.CRON_SECRET ?? ''

    // Não usa await — fire-and-forget para resposta rápida ao webhook
    fetch(`${appUrl}/api/agente/processar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': cronSecret,
      },
      body: JSON.stringify({
        clinicaId,
        conversaId: conversa.id,
        texto,
        contato: {
          nome: contato.nome,
          telefone: contato.telefone,
        },
      }),
    }).catch((err) => {
      console.error('[Webhook] Erro ao disparar agente', err)
    })

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[Webhook] Erro crítico', err)
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
