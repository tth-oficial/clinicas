import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getClinicaDoUsuario } from '@/lib/supabase/queries'

// ─── GET /api/configuracoes ─────────────────────────────────────────────────

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const clinica = await getClinicaDoUsuario(user.id)

    const { data: config, error } = await supabase
      .from('clinica_config')
      .select('*')
      .eq('clinica_id', clinica.id)
      .single()

    if (error) return Response.json({ error: error.message }, { status: 400 })

    // Mascarar API keys — retornar apenas indicador de presença
    const resposta = {
      ...config,
      openai_api_key: config.openai_api_key ? '••••••••' + config.openai_api_key.slice(-4) : null,
      evolution_api_key: config.evolution_api_key ? '••••••••' + config.evolution_api_key.slice(-4) : null,
      clinica,
    }

    return Response.json(resposta)
  } catch (err) {
    console.error('[Configuracoes] GET erro', err)
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ─── PATCH /api/configuracoes ───────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const clinica = await getClinicaDoUsuario(user.id)
    const body = await request.json() as Record<string, unknown>

    // Campos permitidos na clinica_config
    const camposConfig = [
      'cor_principal', 'cor_destaque', 'cor_fundo', 'cor_sidebar',
      'fonte', 'logo_url', 'favicon_url', 'nome_exibicao', 'slogan',
      'openai_api_key', 'openai_model',
      'evolution_url', 'evolution_api_key', 'evolution_instance',
      'agente_nome', 'agente_prompt', 'agente_tom',
      'modulos_ativos', 'google_calendar_id',
    ]

    // Campos da tabela clinicas
    const camposClinica = ['nome', 'responsavel', 'especialidade', 'cidade', 'whatsapp']

    const updateConfig: Record<string, unknown> = {}
    const updateClinica: Record<string, unknown> = {}

    for (const [k, v] of Object.entries(body)) {
      if (camposConfig.includes(k)) {
        // Não sobrescrever keys mascaradas
        if ((k === 'openai_api_key' || k === 'evolution_api_key') &&
            typeof v === 'string' && v.startsWith('••••')) {
          continue
        }
        updateConfig[k] = v
      }
      if (camposClinica.includes(k)) {
        updateClinica[k] = v
      }
    }

    if (Object.keys(updateConfig).length > 0) {
      const { error } = await supabase
        .from('clinica_config')
        .update({ ...updateConfig, atualizado_em: new Date().toISOString() })
        .eq('clinica_id', clinica.id)
      if (error) return Response.json({ error: error.message }, { status: 400 })
    }

    if (Object.keys(updateClinica).length > 0) {
      const { error } = await supabase
        .from('clinicas')
        .update({ ...updateClinica, atualizado_em: new Date().toISOString() })
        .eq('id', clinica.id)
      if (error) return Response.json({ error: error.message }, { status: 400 })
    }

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[Configuracoes] PATCH erro', err)
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
