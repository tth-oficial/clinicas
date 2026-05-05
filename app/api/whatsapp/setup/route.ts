import { NextRequest } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { EvolutionAPI } from '@/lib/evolution'

/**
 * POST /api/whatsapp/setup
 *
 * Fluxo completo de onboarding do WhatsApp para uma clínica:
 * 1. Cria a instância na Evolution API (se não existir)
 * 2. Configura o webhook automaticamente com o clinicaId
 * 3. Salva a instância no banco (clinica_config)
 * 4. Retorna o QR Code para o dono escanear
 *
 * Body: { clinicaId: string }
 */
export async function POST(request: NextRequest) {
  let body: { clinicaId: string }

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { clinicaId } = body

  if (!clinicaId) {
    return Response.json({ error: 'clinicaId é obrigatório' }, { status: 400 })
  }

  const supabase = await createServerClient()

  // 1. Buscar configuração atual da clínica
  const { data: config } = await supabase
    .from('clinica_config')
    .select('evolution_url, evolution_api_key, evolution_instance')
    .eq('clinica_id', clinicaId)
    .single()

  // 2. Usar config do banco ou fallback do .env
  const evolutionUrl =
    (config?.evolution_url as string | null) ??
    process.env.EVOLUTION_API_URL ?? ''
  const evolutionApiKey =
    (config?.evolution_api_key as string | null) ??
    process.env.EVOLUTION_API_KEY ?? ''

  if (!evolutionUrl || !evolutionApiKey) {
    return Response.json(
      {
        error:
          'Evolution API não configurada. Defina EVOLUTION_API_URL e EVOLUTION_API_KEY.',
      },
      { status: 400 }
    )
  }

  // 3. Gerar nome da instância baseado no clinicaId (slug curto)
  // Formato: clinic-{primeiros 8 chars do UUID}
  const instanceName =
    (config?.evolution_instance as string | null) ??
    `clinic-${clinicaId.replace(/-/g, '').slice(0, 8)}`

  const evolution = new EvolutionAPI({
    url: evolutionUrl,
    apiKey: evolutionApiKey,
    instance: instanceName,
  })

  try {
    // 4. Criar instância se não existir
    const existe = await evolution.checkExists()
    if (!existe) {
      await evolution.createInstance(instanceName)
      // Pequeno delay para a Evolution processar
      await new Promise((r) => setTimeout(r, 1500))
    }

    // 5. Configurar webhook automaticamente
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      (request.headers.get('origin') ?? 'http://localhost:3000')

    const webhookUrl = `${appUrl}/api/whatsapp/webhook?clinicaId=${clinicaId}`

    // Se WEBHOOK_SECRET estiver configurado, repassa para a Evolution incluir
    // como header x-webhook-signature em todo POST. Sem isso, o handler
    // rejeita as requests com 401.
    const webhookSecret = process.env.WEBHOOK_SECRET
    const secretParaWebhook =
      webhookSecret &&
      webhookSecret !== 'trocar_por_string_aleatoria_forte'
        ? webhookSecret
        : undefined

    await evolution.setWebhook(webhookUrl, secretParaWebhook)

    // 5b. Configurar definições da instância (ignorar grupos, rejeitar chamadas)
    await evolution.configureSettings()

    // 6. Salvar instância no banco da clínica
    await supabase
      .from('clinica_config')
      .update({
        evolution_url: evolutionUrl,
        evolution_api_key: evolutionApiKey,
        evolution_instance: instanceName,
      })
      .eq('clinica_id', clinicaId)

    // 7. Verificar status atual
    const status = await evolution.getStatus()

    if (status === 'open') {
      // Já conectado — não precisa de QR
      return Response.json({
        ok: true,
        status: 'open',
        instanceName,
        qrcode: null,
        mensagem: 'WhatsApp já está conectado!',
      })
    }

    // 8. Gerar QR Code
    const qrcode = await evolution.getQRCode()

    return Response.json({
      ok: true,
      status: 'connecting',
      instanceName,
      qrcode,
      mensagem: 'Escaneie o QR Code com o WhatsApp para conectar.',
    })
  } catch (err) {
    console.error('[Setup] Erro no onboarding da instância', err)
    return Response.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Erro ao configurar instância',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/whatsapp/setup?clinicaId=xxx
 *
 * Polling de status — chamado pelo frontend até o status ser 'open'
 */
export async function GET(request: NextRequest) {
  const clinicaId = request.nextUrl.searchParams.get('clinicaId')

  if (!clinicaId) {
    return Response.json({ error: 'clinicaId é obrigatório' }, { status: 400 })
  }

  const supabase = await createServerClient()

  const { data: config } = await supabase
    .from('clinica_config')
    .select('evolution_url, evolution_api_key, evolution_instance')
    .eq('clinica_id', clinicaId)
    .single()

  const evolutionUrl =
    (config?.evolution_url as string | null) ?? process.env.EVOLUTION_API_URL ?? ''
  const evolutionApiKey =
    (config?.evolution_api_key as string | null) ?? process.env.EVOLUTION_API_KEY ?? ''
  const instanceName =
    (config?.evolution_instance as string | null) ??
    `clinic-${clinicaId.replace(/-/g, '').slice(0, 8)}`

  if (!evolutionUrl || !evolutionApiKey) {
    return Response.json({ status: 'not_configured' })
  }

  const evolution = new EvolutionAPI({
    url: evolutionUrl,
    apiKey: evolutionApiKey,
    instance: instanceName,
  })

  try {
    const status = await evolution.getStatus()
    return Response.json({ status, instanceName })
  } catch {
    return Response.json({ status: 'close', instanceName })
  }
}
