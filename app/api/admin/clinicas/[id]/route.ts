import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { encryptSecret, decryptSecret } from '@/lib/crypto'

function isAdmin(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  const fallback = process.env.ADMIN_EMAIL?.toLowerCase()
  return adminEmails.includes(email.toLowerCase()) ||
    (!!fallback && email.toLowerCase() === fallback)
}

// ─── GET — buscar dados completos de um cliente ──────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email ?? '')) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { id } = await params
  const admin = createAdminClient()

  const { data: clinica, error } = await admin
    .from('clinicas')
    .select(`
      id, nome, responsavel, especialidade, cidade, whatsapp, plano, ativo,
      clinica_config (
        cor_principal, nome_exibicao, slogan, fonte,
        agente_nome, agente_tom, agente_prompt,
        openai_api_key, openai_model,
        evolution_url, evolution_api_key, evolution_instance,
        modulos_ativos
      )
    `)
    .eq('id', id)
    .single()

  if (error || !clinica) return Response.json({ error: 'Não encontrado' }, { status: 404 })

  const cfg = Array.isArray(clinica.clinica_config)
    ? clinica.clinica_config[0]
    : clinica.clinica_config

  return Response.json({
    cliente: {
      id: clinica.id,
      nome: clinica.nome,
      responsavel: clinica.responsavel ?? '',
      especialidade: clinica.especialidade ?? '',
      cidade: clinica.cidade ?? '',
      whatsapp: clinica.whatsapp ?? '',
      plano: clinica.plano,
      ativo: clinica.ativo,
      cor_principal: cfg?.cor_principal ?? '#1B5E4F',
      nome_exibicao: cfg?.nome_exibicao ?? clinica.nome,
      slogan: cfg?.slogan ?? '',
      fonte: cfg?.fonte ?? 'Plus Jakarta Sans',
      agente_nome: cfg?.agente_nome ?? 'Assistente',
      agente_tom: cfg?.agente_tom ?? 'profissional e acolhedor',
      agente_prompt: cfg?.agente_prompt ?? '',
      openai_api_key: cfg?.openai_api_key
        ? '••••••••' + (decryptSecret(cfg.openai_api_key as string) ?? '').slice(-4)
        : '',
      openai_model: cfg?.openai_model ?? 'gpt-4o',
      evolution_url: cfg?.evolution_url ?? '',
      evolution_api_key: cfg?.evolution_api_key
        ? '••••••••' + (decryptSecret(cfg.evolution_api_key as string) ?? '').slice(-4)
        : '',
      evolution_instance: cfg?.evolution_instance ?? '',
      modulos_ativos: cfg?.modulos_ativos ?? [],
    },
  })
}

// ─── PATCH — atualizar clínica (ativo/inativo, plano) ───────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email ?? '')) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { id } = await params
  const admin = createAdminClient()
  const body = await request.json() as Record<string, unknown>

  const camposClinica = ['nome', 'responsavel', 'especialidade', 'cidade',
    'whatsapp', 'plano', 'ativo']
  const camposConfig = ['cor_principal', 'nome_exibicao', 'slogan', 'fonte',
    'agente_nome', 'agente_tom', 'agente_prompt',
    'openai_api_key', 'openai_model', 'modulos_ativos',
    'evolution_url', 'evolution_api_key', 'evolution_instance']

  const updateClinica: Record<string, unknown> = {}
  const updateConfig: Record<string, unknown> = {}

  // GET retorna keys mascaradas (••••••XXXX). Se o admin não trocar,
  // o front manda a string mascarada de volta — que NÃO pode sobrescrever
  // o valor real. Filtramos aqui.
  const eMascarado = (v: unknown): boolean =>
    typeof v === 'string' && v.startsWith('••••')

  for (const [k, v] of Object.entries(body)) {
    if (camposClinica.includes(k)) updateClinica[k] = v
    if (camposConfig.includes(k)) {
      if ((k === 'openai_api_key' || k === 'evolution_api_key')) {
        if (eMascarado(v)) continue
        updateConfig[k] = encryptSecret(typeof v === 'string' ? v : null)
      } else {
        updateConfig[k] = v
      }
    }
  }

  if (Object.keys(updateClinica).length > 0) {
    const { error } = await admin.from('clinicas')
      .update({ ...updateClinica, atualizado_em: new Date().toISOString() })
      .eq('id', id)
    if (error) return Response.json({ error: error.message }, { status: 400 })
  }

  if (Object.keys(updateConfig).length > 0) {
    const { error } = await admin.from('clinica_config')
      .update({ ...updateConfig, atualizado_em: new Date().toISOString() })
      .eq('clinica_id', id)
    if (error) return Response.json({ error: error.message }, { status: 400 })
  }

  return Response.json({ ok: true })
}

// ─── DELETE — desativar clínica (soft delete) ────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email ?? '')) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { id } = await params
  const admin = createAdminClient()

  const { error } = await admin.from('clinicas')
    .update({ ativo: false, atualizado_em: new Date().toISOString() })
    .eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ ok: true })
}
