import { createClient } from '@/lib/supabase/server'
import { getClinicaDoUsuario } from '@/lib/supabase/queries'
import { NextResponse } from 'next/server'

// ─────────────────────────────────────────────
// GET /api/anti-noshow
// Lista cadências anti_noshow com detalhes
// ─────────────────────────────────────────────
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const clinica = await getClinicaDoUsuario(user.id)

    const { data: cadencias, error } = await supabase
      .from('cadencias')
      .select(`
        id,
        clinica_id,
        contato_id,
        agendamento_id,
        etapa_atual,
        total_etapas,
        status,
        proxima_execucao,
        criado_em,
        agendamentos (
          id, servico, data_hora, status, profissional
        ),
        contatos (
          id, nome, telefone
        ),
        cadencia_etapas (
          id, numero, mensagem_template, status, enviado_em, resposta_recebida
        )
      `)
      .eq('clinica_id', clinica.id)
      .eq('tipo', 'anti_noshow')
      .order('criado_em', { ascending: false })

    if (error) {
      console.error('[GET /api/anti-noshow]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ cadencias })
  } catch (err) {
    console.error('[GET /api/anti-noshow] erro inesperado', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
