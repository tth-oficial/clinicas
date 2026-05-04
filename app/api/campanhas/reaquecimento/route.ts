import { createClient } from '@/lib/supabase/server'
import { getClinicaDoUsuario } from '@/lib/supabase/queries'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/campanhas/reaquecimento — lista campanhas da clínica
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const clinica = await getClinicaDoUsuario(user.id)

    const { data: campanhas, error } = await supabase
      .from('campanhas')
      .select('*')
      .eq('clinica_id', clinica.id)
      .eq('tipo', 'reaquecimento')
      .order('criado_em', { ascending: false })

    if (error) {
      console.error('[GET /api/campanhas/reaquecimento]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ campanhas: campanhas ?? [] })
  } catch (err) {
    console.error('[GET /api/campanhas/reaquecimento] inesperado', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST /api/campanhas/reaquecimento — cria campanha + preview de contatos
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const clinica = await getClinicaDoUsuario(user.id)

    const body = await request.json() as {
      nome: string
      mensagem_template: string
      periodo_inatividade_meses: number
    }

    if (!body.nome || !body.mensagem_template || !body.periodo_inatividade_meses) {
      return NextResponse.json(
        { error: 'nome, mensagem_template e periodo_inatividade_meses são obrigatórios' },
        { status: 400 }
      )
    }

    // Calcular corte de inatividade
    const corteInatividade = new Date()
    corteInatividade.setMonth(corteInatividade.getMonth() - body.periodo_inatividade_meses)

    // Contar contatos elegíveis (sem agendamento realizado no período)
    const { data: contatosElegiveis } = await supabase
      .from('contatos')
      .select('id')
      .eq('clinica_id', clinica.id)
      .eq('ativo', true)
      .or(`ultimo_atendimento.is.null,ultimo_atendimento.lte.${corteInatividade.toISOString()}`)

    const totalContatos = contatosElegiveis?.length ?? 0

    // Criar campanha em rascunho
    const { data: campanha, error: errCamp } = await supabase
      .from('campanhas')
      .insert({
        clinica_id: clinica.id,
        nome: body.nome,
        tipo: 'reaquecimento',
        mensagem_template: body.mensagem_template,
        periodo_inatividade_meses: body.periodo_inatividade_meses,
        status: 'rascunho',
        total_contatos: totalContatos,
        enviados: 0,
        responderam: 0,
        convertidos: 0,
        receita_gerada: 0,
      })
      .select('*')
      .single()

    if (errCamp || !campanha) {
      console.error('[POST /api/campanhas/reaquecimento]', errCamp)
      return NextResponse.json({ error: errCamp?.message ?? 'Erro ao criar campanha' }, { status: 500 })
    }

    return NextResponse.json({ campanha, total_contatos: totalContatos }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/campanhas/reaquecimento] inesperado', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
