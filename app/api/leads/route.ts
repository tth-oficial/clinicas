import { createClient } from '@/lib/supabase/server'
import { getClinicaDoUsuario } from '@/lib/supabase/queries'
import { sanitizeFilterValue } from '@/lib/sanitize'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  let clinica
  try { clinica = await getClinicaDoUsuario(user.id) }
  catch { return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 403 }) }

  const { searchParams } = new URL(request.url)
  const etapa       = searchParams.get('etapa')
  const temperatura = searchParams.get('temperatura')
  const status      = searchParams.get('status')
  const busca       = searchParams.get('busca')
  const page        = Math.max(1, parseInt(searchParams.get('page')  || '1'))
  const limit       = Math.min(100, parseInt(searchParams.get('limit') || '20'))
  const offset      = (page - 1) * limit

  let query = supabase
    .from('leads')
    .select('*, contatos(id, nome, telefone)', { count: 'exact' })
    .eq('clinica_id', clinica.id)
    .order('posicao_kanban', { ascending: true })
    .order('criado_em', { ascending: false })

  if (etapa)       query = query.eq('etapa', etapa)
  if (temperatura) query = query.eq('temperatura', temperatura)
  if (status)      query = query.eq('status', status)

  if (busca) {
    const buscaSanitizada = sanitizeFilterValue(busca)
    const { data: contatos } = await supabase
      .from('contatos')
      .select('id')
      .eq('clinica_id', clinica.id)
      .or(`nome.ilike.%${buscaSanitizada}%,telefone.ilike.%${buscaSanitizada}%`)
    const ids = (contatos || []).map(c => c.id)
    if (ids.length === 0) return NextResponse.json({ data: [], count: 0, page, limit })
    query = query.in('contato_id', ids)
  }

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query
  if (error) {
    console.error('[GET /api/leads]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data || [], count: count || 0, page, limit })
}

const criarLeadSchema = z.object({
  contato_id:         z.string().uuid().optional(),
  contato_nome:       z.string().min(1).optional(),
  contato_telefone:   z.string().min(1).optional(),
  servico:            z.string().min(1),
  valor_estimado:     z.number().positive().nullable().optional(),
  origem:             z.string().nullable().optional(),
  temperatura:        z.enum(['quente', 'morno', 'frio']).default('morno'),
  status:             z.enum(['novo', 'em_contato', 'agendado', 'negociando', 'convertido', 'perdido']).default('novo'),
  notas:              z.string().nullable().optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  let clinica
  try { clinica = await getClinicaDoUsuario(user.id) }
  catch { return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 403 }) }

  let body
  try { body = criarLeadSchema.parse(await request.json()) }
  catch { return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 }) }

  let contatoId = body.contato_id

  if (!contatoId) {
    if (!body.contato_nome || !body.contato_telefone) {
      return NextResponse.json({ error: 'Nome e telefone são obrigatórios' }, { status: 400 })
    }
    const { data: contato, error: erroContato } = await supabase
      .from('contatos')
      .insert({ clinica_id: clinica.id, nome: body.contato_nome, telefone: body.contato_telefone, origem: body.origem })
      .select()
      .single()
    if (erroContato) {
      console.error('[POST /api/leads] criar contato', erroContato)
      return NextResponse.json({ error: erroContato.message }, { status: 500 })
    }
    contatoId = contato.id
  }

  const { data: lead, error } = await supabase
    .from('leads')
    .insert({
      clinica_id:     clinica.id,
      contato_id:     contatoId,
      servico:        body.servico,
      valor_estimado: body.valor_estimado ?? null,
      origem:         body.origem ?? null,
      etapa:          'lead',
      temperatura:    body.temperatura,
      status:         body.status,
      posicao_kanban: 0,
      notas:          body.notas ?? null,
    })
    .select('*, contatos(id, nome, telefone)')
    .single()

  if (error) {
    console.error('[POST /api/leads]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: lead }, { status: 201 })
}
