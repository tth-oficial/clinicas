import { createClient } from '@/lib/supabase/server'
import { getClinicaDoUsuario } from '@/lib/supabase/queries'
import { NextRequest, NextResponse } from 'next/server'

// ─────────────────────────────────────────────
// GET /api/horarios
// Retorna horários de funcionamento da clínica
// ─────────────────────────────────────────────
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const clinica = await getClinicaDoUsuario(user.id)

    const { data: horarios, error } = await supabase
      .from('horarios_funcionamento')
      .select('*')
      .eq('clinica_id', clinica.id)
      .order('dia_semana', { ascending: true })

    if (error) {
      console.error('[GET /api/horarios]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Garantir que retorna todos os 7 dias (preenche dias ausentes com padrão)
    const diasCompletos = Array.from({ length: 7 }, (_, dia) => {
      const existente = horarios?.find(h => h.dia_semana === dia)
      if (existente) return existente
      return {
        id: null,
        clinica_id: clinica.id,
        dia_semana: dia,
        hora_inicio: '08:00',
        hora_fim: '18:00',
        ativo: dia !== 0, // domingo fechado por padrão
      }
    })

    return NextResponse.json({ horarios: diasCompletos })
  } catch (err) {
    console.error('[GET /api/horarios] erro inesperado', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// PUT /api/horarios
// Batch upsert dos 7 dias da semana
// Body: { horarios: [{ dia_semana, hora_inicio, hora_fim, ativo }] }
// ─────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const clinica = await getClinicaDoUsuario(user.id)

    const body = await request.json() as {
      horarios: Array<{
        dia_semana: number
        hora_inicio: string
        hora_fim: string
        ativo: boolean
      }>
    }

    if (!Array.isArray(body.horarios) || body.horarios.length === 0) {
      return NextResponse.json({ error: 'Array de horários é obrigatório' }, { status: 400 })
    }

    // Validar dias da semana
    for (const h of body.horarios) {
      if (h.dia_semana < 0 || h.dia_semana > 6) {
        return NextResponse.json(
          { error: `dia_semana inválido: ${h.dia_semana} (deve ser 0-6)` },
          { status: 400 }
        )
      }
    }

    const registros = body.horarios.map(h => ({
      clinica_id: clinica.id,
      dia_semana: h.dia_semana,
      hora_inicio: h.hora_inicio,
      hora_fim: h.hora_fim,
      ativo: h.ativo,
    }))

    const { data: horarios, error } = await supabase
      .from('horarios_funcionamento')
      .upsert(registros, { onConflict: 'clinica_id,dia_semana' })
      .select('*')
      .order('dia_semana', { ascending: true })

    if (error) {
      console.error('[PUT /api/horarios]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ horarios, sucesso: true })
  } catch (err) {
    console.error('[PUT /api/horarios] erro inesperado', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
