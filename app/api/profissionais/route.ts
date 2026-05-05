import { createClient } from '@/lib/supabase/server'
import { getClinicaDoUsuario } from '@/lib/supabase/queries'
import { NextRequest, NextResponse } from 'next/server'

// ─────────────────────────────────────────────
// GET /api/profissionais
// Lista profissionais ativos da clínica
// ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const clinica = await getClinicaDoUsuario(user.id)

    const apenasAtivos = request.nextUrl.searchParams.get('todos') !== 'true'

    let query = supabase
      .from('profissionais')
      .select('*')
      .eq('clinica_id', clinica.id)
      .order('nome', { ascending: true })

    if (apenasAtivos) {
      query = query.eq('ativo', true)
    }

    const { data: profissionais, error } = await query

    if (error) {
      console.error('[GET /api/profissionais]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ profissionais })
  } catch (err) {
    console.error('[GET /api/profissionais] erro inesperado', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// POST /api/profissionais
// Cria novo profissional
// ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const clinica = await getClinicaDoUsuario(user.id)

    const body = await request.json() as {
      nome: string
      especialidade?: string
      telefone?: string
      email?: string
      cor?: string
      bio?: string
    }

    if (!body.nome?.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    const { data: profissional, error } = await supabase
      .from('profissionais')
      .insert({
        clinica_id: clinica.id,
        nome: body.nome.trim(),
        especialidade: body.especialidade ?? null,
        telefone: body.telefone ?? null,
        email: body.email ?? null,
        cor: body.cor ?? '#2D8B73',
        bio: body.bio ?? null,
        ativo: true,
      })
      .select('*')
      .single()

    if (error) {
      console.error('[POST /api/profissionais]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ profissional }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/profissionais] erro inesperado', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
