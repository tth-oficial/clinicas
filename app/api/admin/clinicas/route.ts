import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { gerarSenhaSegura } from '@/lib/password'
import { encryptSecret } from '@/lib/crypto'

function isAdmin(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  const fallback = process.env.ADMIN_EMAIL?.toLowerCase()
  return adminEmails.includes(email.toLowerCase()) ||
    (!!fallback && email.toLowerCase() === fallback)
}

// ─── GET — listar todas as clínicas ─────────────────────────────────────────

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email ?? '')) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('clinicas')
    .select(`
      id, nome, responsavel, especialidade, cidade, whatsapp, plano, ativo, criado_em,
      clinica_config (
        cor_principal, nome_exibicao, agente_nome,
        evolution_instance, openai_api_key,
        modulos_ativos, atualizado_em
      )
    `)
    .order('criado_em', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ clinicas: data })
}

// ─── POST — criar novo cliente completo ─────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email ?? '')) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const admin = createAdminClient()

  interface NovoClientePayload {
    // Clínica
    nome: string
    responsavel: string
    especialidade: string
    cidade: string
    whatsapp: string
    plano: 'entrada' | 'medio' | 'alto'
    // Visual
    cor_principal: string
    nome_exibicao: string
    slogan: string
    fonte: string
    // Agente
    agente_nome: string
    agente_tom: string
    agente_prompt: string
    // Integrações
    openai_api_key: string
    openai_model: string
    evolution_instance: string
    evolution_url: string
    evolution_api_key: string
    // Acesso. senha_admin opcional — se ausente ou vazia, geramos no
    // servidor com CSPRNG e devolvemos no payload de resposta.
    email_admin: string
    senha_admin?: string
    // Módulos
    modulos_ativos: string[]
  }

  let body: NovoClientePayload
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 })
  }

  const {
    nome, responsavel, especialidade, cidade, whatsapp, plano,
    cor_principal, nome_exibicao, slogan, fonte,
    agente_nome, agente_tom, agente_prompt,
    openai_api_key, openai_model, evolution_instance, evolution_url, evolution_api_key,
    email_admin, senha_admin,
    modulos_ativos,
  } = body

  if (!nome || !email_admin) {
    return Response.json({ error: 'nome e email_admin são obrigatórios' }, { status: 400 })
  }

  // Senha: se cliente não enviou ou enviou vazia, gera no servidor com CSPRNG.
  // Se enviou, exige no mínimo 8 caracteres.
  let senhaFinal: string
  if (!senha_admin) {
    senhaFinal = gerarSenhaSegura(14)
  } else if (senha_admin.length < 8) {
    return Response.json({ error: 'Senha deve ter no mínimo 8 caracteres' }, { status: 400 })
  } else {
    senhaFinal = senha_admin
  }

  try {
    // 1. Criar clínica
    const { data: clinica, error: errClinica } = await admin
      .from('clinicas')
      .insert({ nome, responsavel, especialidade, cidade, whatsapp, plano: plano || 'medio' })
      .select('id')
      .single()

    if (errClinica || !clinica) {
      return Response.json({ error: errClinica?.message ?? 'Erro ao criar clínica' }, { status: 400 })
    }

    const clinicaId = clinica.id

    // 2. Criar configuração
    const evolutionUrlFinal = evolution_url || process.env.EVOLUTION_API_URL || ''
    const evolutionKeyFinal = evolution_api_key || process.env.EVOLUTION_API_KEY || ''

    const { error: errConfig } = await admin
      .from('clinica_config')
      .insert({
        clinica_id: clinicaId,
        cor_principal: cor_principal || '#1B5E4F',
        nome_exibicao: nome_exibicao || nome,
        slogan: slogan || null,
        fonte: fonte || 'Plus Jakarta Sans',
        agente_nome: agente_nome || 'Assistente',
        agente_tom: agente_tom || 'profissional e acolhedor',
        agente_prompt: agente_prompt || null,
        openai_api_key: encryptSecret(openai_api_key || null),
        openai_model: openai_model || 'gpt-4o',
        evolution_url: evolutionUrlFinal || null,
        evolution_api_key: encryptSecret(evolutionKeyFinal || null),
        evolution_instance: evolution_instance || null,
        modulos_ativos: modulos_ativos?.length
          ? modulos_ativos
          : ['dashboard','crm','whatsapp','agendamento','anti_noshow',
             'leads','followup','nutricao','reaquecimento','ia_decisao','relatorio'],
      })

    if (errConfig) {
      // Rollback: remover clínica criada
      await admin.from('clinicas').delete().eq('id', clinicaId)
      return Response.json({ error: errConfig.message }, { status: 400 })
    }

    // 3. Criar usuário no Auth
    const { data: novoUser, error: errAuth } = await admin.auth.admin.createUser({
      email: email_admin,
      password: senhaFinal,
      email_confirm: true,
    })

    if (errAuth || !novoUser?.user) {
      await admin.from('clinica_config').delete().eq('clinica_id', clinicaId)
      await admin.from('clinicas').delete().eq('id', clinicaId)
      return Response.json({ error: errAuth?.message ?? 'Erro ao criar usuário' }, { status: 400 })
    }

    // 4. Vincular usuário à clínica
    const { error: errVinculo } = await admin
      .from('usuarios_clinicas')
      .insert({ user_id: novoUser.user.id, clinica_id: clinicaId, papel: 'admin' })

    if (errVinculo) {
      await admin.auth.admin.deleteUser(novoUser.user.id)
      await admin.from('clinica_config').delete().eq('clinica_id', clinicaId)
      await admin.from('clinicas').delete().eq('id', clinicaId)
      return Response.json({ error: errVinculo.message }, { status: 400 })
    }

    return Response.json({
      ok: true,
      clinica_id: clinicaId,
      email: email_admin,
      senha: senhaFinal,
      url_acesso: process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/login`
        : '/login',
    })
  } catch (err) {
    console.error('[Admin] Erro ao criar cliente', err)
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
