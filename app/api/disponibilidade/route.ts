import { createClient } from '@/lib/supabase/server'
import { getClinicaDoUsuario } from '@/lib/supabase/queries'
import { NextRequest, NextResponse } from 'next/server'

// ─────────────────────────────────────────────
// GET /api/disponibilidade
// Parâmetros:
//   ?data=YYYY-MM-DD           (obrigatório)
//   &profissional_id=uuid      (opcional)
//   &servico_id=uuid           (opcional — usa duração do serviço)
//   &intervalo_minutos=30      (opcional, padrão 30min)
// ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const clinica = await getClinicaDoUsuario(user.id)
    const params = request.nextUrl.searchParams

    const data = params.get('data')
    if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return NextResponse.json(
        { error: 'Parâmetro "data" obrigatório no formato YYYY-MM-DD' },
        { status: 400 }
      )
    }

    const profissionalId = params.get('profissional_id') ?? null
    const servicoId = params.get('servico_id') ?? null
    const intervalo = parseInt(params.get('intervalo_minutos') ?? '30', 10)

    // 1. Identificar dia da semana (0=dom ... 6=sab)
    // Usar UTC para evitar problemas de timezone ao parsear a data
    const [ano, mes, dia] = data.split('-').map(Number)
    const dataObj = new Date(ano, mes - 1, dia)
    const diaSemana = dataObj.getDay()

    // 2. Buscar horário de funcionamento do dia
    const { data: horarioDia, error: errHorario } = await supabase
      .from('horarios_funcionamento')
      .select('hora_inicio, hora_fim, ativo')
      .eq('clinica_id', clinica.id)
      .eq('dia_semana', diaSemana)
      .single()

    if (errHorario || !horarioDia || !horarioDia.ativo) {
      // Clínica fechada neste dia
      return NextResponse.json({
        data,
        dia_semana: diaSemana,
        aberto: false,
        slots: [],
        mensagem: 'Clínica fechada neste dia',
      })
    }

    // 3. Buscar duração do serviço (se fornecido)
    let duracaoServico = 60 // padrão
    if (servicoId) {
      const { data: servico } = await supabase
        .from('servicos')
        .select('duracao_minutos, nome')
        .eq('id', servicoId)
        .eq('clinica_id', clinica.id)
        .single()

      if (servico) {
        duracaoServico = servico.duracao_minutos
      }
    }

    // 4. Buscar agendamentos do dia (exceto cancelados e no_show)
    const inicioDia = `${data}T00:00:00`
    const fimDia = `${data}T23:59:59`

    let queryAg = supabase
      .from('agendamentos')
      .select('data_hora, duracao_minutos, profissional_id, status')
      .eq('clinica_id', clinica.id)
      .gte('data_hora', inicioDia)
      .lte('data_hora', fimDia)
      .not('status', 'in', '("cancelado","no_show")')

    // Filtrar por profissional se fornecido
    if (profissionalId) {
      queryAg = queryAg.eq('profissional_id', profissionalId)
    }

    const { data: agendamentosExistentes } = await queryAg

    // 5. Gerar todos os slots do dia baseado no horário de funcionamento
    const [hInicioH, hInicioM] = horarioDia.hora_inicio.split(':').map(Number)
    const [hFimH, hFimM] = horarioDia.hora_fim.split(':').map(Number)

    const minutoInicio = hInicioH * 60 + hInicioM
    const minutoFim = hFimH * 60 + hFimM

    const slots: Array<{
      hora: string
      disponivel: boolean
      motivo?: string
    }> = []

    for (let min = minutoInicio; min + duracaoServico <= minutoFim; min += intervalo) {
      const hSlot = Math.floor(min / 60)
      const mSlot = min % 60
      const horaStr = `${String(hSlot).padStart(2, '0')}:${String(mSlot).padStart(2, '0')}`

      // Verificar conflito com agendamentos existentes
      const slotInicio = min
      const slotFim = min + duracaoServico

      let conflito = false
      let motivoConflito = ''

      for (const ag of agendamentosExistentes ?? []) {
        const agData = new Date(ag.data_hora)
        const agMinutoInicio =
          agData.getHours() * 60 + agData.getMinutes()
        const agMinutoFim = agMinutoInicio + (ag.duracao_minutos ?? 60)

        // Conflito: sobreposição de intervalos
        if (slotInicio < agMinutoFim && slotFim > agMinutoInicio) {
          conflito = true
          motivoConflito = 'Horário ocupado'
          break
        }
      }

      slots.push({
        hora: horaStr,
        disponivel: !conflito,
        ...(conflito ? { motivo: motivoConflito } : {}),
      })
    }

    const slotsDisponiveis = slots.filter(s => s.disponivel).length

    return NextResponse.json({
      data,
      dia_semana: diaSemana,
      aberto: true,
      hora_inicio: horarioDia.hora_inicio,
      hora_fim: horarioDia.hora_fim,
      duracao_servico_minutos: duracaoServico,
      intervalo_minutos: intervalo,
      total_slots: slots.length,
      slots_disponiveis: slotsDisponiveis,
      slots,
    })
  } catch (err) {
    console.error('[GET /api/disponibilidade] erro inesperado', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
