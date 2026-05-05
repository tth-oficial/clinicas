import { createClient } from '@/lib/supabase/server'
import { getClinicaDoUsuario } from '@/lib/supabase/queries'
import { NextRequest, NextResponse } from 'next/server'

// ─────────────────────────────────────────────
// GET /api/servicos
// Lista serviços ativos da clínica
// ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const clinica = await getClinicaDoUsuario(user.id)

    const apenasAtivos = request.nextUrl.searchParams.get('todos') !== 'true'

    let query = supabase
      .from('servicos')
      .select('*')
      .eq('clinica_id', clinica.id)
      .order('nome', { ascending: true })

    if (apenasAtivos) {
      query = query.eq('ativo', true)
    }

    const { data: servicos, error } = await query

    if (error) {
      console.error('[GET /api/servicos]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ servicos })
  } catch (err) {
    console.error('[GET /api/servicos] erro inesperado', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// POST /api/servicos
// Cria novo serviço
// ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const clinica = await getClinicaDoUsuario(user.id)

    const body = await request.json() as {
      nome: string
      descricao?: string
      duracao_minutos?: number
      valor?: number
    }

    if (!body.nome?.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    const { data: servico, error } = await supabase
      .from('servicos')
      .insert({
        clinica_id: clinica.id,
        nome: body.nome.trim(),
        descricao: body.descricao ?? null,
        duracao_minutos: body.duracao_minutos ?? 60,
        valor: body.valor ?? null,
        ativo: true,
      })
      .select('*')
      .single()

    if (error) {
      console.error('[POST /api/servicos]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ servico }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/servicos] erro inesperado', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
