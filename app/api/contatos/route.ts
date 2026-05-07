import { createClient } from '@/lib/supabase/server'
import { getClinicaDoUsuario } from '@/lib/supabase/queries'
import { sanitizeFilterValue } from '@/lib/sanitize'
import { NextRequest, NextResponse } from 'next/server'

// ─────────────────────────────────────────────
// GET /api/contatos
// Parâmetros: ?busca=termo&limite=10
// ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const clinica = await getClinicaDoUsuario(user.id)

    const searchParams = request.nextUrl.searchParams
    const busca = searchParams.get('busca') ?? ''
    const limite = Math.min(50, parseInt(searchParams.get('limite') ?? '10'))

    let query = supabase
      .from('contatos')
      .select('id, nome, telefone, email, origem, ativo')
      .eq('clinica_id', clinica.id)
      .eq('ativo', true)
      .limit(limite)
      .order('nome', { ascending: true })

    if (busca.length >= 2) {
      const buscaSanitizada = sanitizeFilterValue(busca)
      query = query.or(`nome.ilike.%${buscaSanitizada}%,telefone.ilike.%${buscaSanitizada}%`)
    }

    const { data: contatos, error } = await query

    if (error) {
      console.error('[GET /api/contatos]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ contatos: contatos ?? [] })
  } catch (err) {
    console.error('[GET /api/contatos] erro inesperado', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// POST /api/contatos
// Cria novo contato
// ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const clinica = await getClinicaDoUsuario(user.id)

    const body = await request.json() as {
      nome: string
      telefone: string
      email?: string
      origem?: string
      notas?: string
    }

    if (!body.nome || !body.telefone) {
      return NextResponse.json({ error: 'nome e telefone são obrigatórios' }, { status: 400 })
    }

    const { data: contato, error } = await supabase
      .from('contatos')
      .insert({
        clinica_id: clinica.id,
        nome: body.nome,
        telefone: body.telefone,
        email: body.email ?? null,
        origem: body.origem ?? 'manual',
        notas: body.notas ?? null,
      })
      .select('id, nome, telefone, email, origem, ativo')
      .single()

    if (error) {
      console.error('[POST /api/contatos]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ contato }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/contatos] erro inesperado', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
