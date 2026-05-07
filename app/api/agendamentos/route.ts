import { createClient } from '@/lib/supabase/server'
import { getClinicaDoUsuario } from '@/lib/supabase/queries'
import { criarAgendamentoSchema } from '@/lib/validators/agendamentos'
import { NextRequest, NextResponse } from 'next/server'

// ─────────────────────────────────────────────
// GET /api/agendamentos
// Parâmetros: ?data=YYYY-MM-DD&vista=dia|semana|mes&status=agendado,confirmado
// ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const clinica = await getClinicaDoUsuario(user.id)

    const searchParams = request.nextUrl.searchParams
    const data = searchParams.get('data') ?? new Date().toISOString().split('T')[0]
    const vista = searchParams.get('vista') ?? 'dia'
    const statusFiltro = searchParams.get('status')?.split(',') ?? null

    // Calcular intervalo de datas
    const dataInicio = new Date(data + 'T00:00:00')
    const dataFim = new Date(data + 'T23:59:59')

    if (vista === 'semana') {
      const diaSemana = dataInicio.getDay()
      dataInicio.setDate(dataInicio.getDate() - diaSemana)
      dataFim.setDate(dataInicio.getDate() + 6)
      dataFim.setHours(23, 59, 59)
    } else if (vista === 'mes') {
      dataInicio.setDate(1)
      dataFim.setMonth(dataFim.getMonth() + 1)
      dataFim.setDate(0)
      dataFim.setHours(23, 59, 59)
    }

    let query = supabase
      .from('agendamentos')
      .select(`
        *,
        contatos (id, nome, telefone)
      `)
      .eq('clinica_id', clinica.id)
      .gte('data_hora', dataInicio.toISOString())
      .lte('data_hora', dataFim.toISOString())
      .order('data_hora', { ascending: true })

    if (statusFiltro && statusFiltro.length > 0) {
      query = query.in('status', statusFiltro)
    }

    const { data: agendamentos, error } = await query

    if (error) {
      console.error('[GET /api/agendamentos]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ agendamentos })
  } catch (err) {
    console.error('[GET /api/agendamentos] erro inesperado', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// POST /api/agendamentos
// Cria agendamento + cadência anti no-show automática
// ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const clinica = await getClinicaDoUsuario(user.id)

    let body
    try {
      body = criarAgendamentoSchema.parse(await request.json())
    } catch (err) {
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: err instanceof Error ? err.message : undefined },
        { status: 400 }
      )
    }

    // Tenant-scope check: o contato precisa ser da clínica do usuário.
    // Sem isso, FK aceitaria contato_id de outra clínica e o agendamento
    // seria criado cruzando tenants (mesmo que o clinica_id final seja o
    // do usuário autenticado).
    const { data: contatoOk } = await supabase
      .from('contatos')
      .select('id')
      .eq('id', body.contato_id)
      .eq('clinica_id', clinica.id)
      .maybeSingle()

    if (!contatoOk) {
      return NextResponse.json(
        { error: 'Contato não pertence a esta clínica' },
        { status: 403 }
      )
    }

    // Lead, se informado, também precisa ser da clínica
    if (body.lead_id) {
      const { data: leadOk } = await supabase
        .from('leads')
        .select('id')
        .eq('id', body.lead_id)
        .eq('clinica_id', clinica.id)
        .maybeSingle()

      if (!leadOk) {
        return NextResponse.json(
          { error: 'Lead não pertence a esta clínica' },
          { status: 403 }
        )
      }
    }

    // 1. Criar o agendamento
    const { data: agendamento, error: errAg } = await supabase
      .from('agendamentos')
      .insert({
        clinica_id: clinica.id,
        contato_id: body.contato_id,
        lead_id: body.lead_id ?? null,
        servico: body.servico,
        servico_id: body.servico_id ?? null,
        data_hora: body.data_hora,
        duracao_minutos: body.duracao_minutos ?? 60,
        profissional: body.profissional ?? null,
        profissional_id: body.profissional_id ?? null,
        valor: body.valor ?? null,
        notas: body.notas ?? null,
        status: 'agendado',
      })
      .select('*')
      .single()

    if (errAg || !agendamento) {
      console.error('[POST /api/agendamentos] erro ao criar agendamento', errAg)
      return NextResponse.json({ error: errAg?.message ?? 'Erro ao criar agendamento' }, { status: 500 })
    }

    // 2. Buscar contato para o template
    const { data: contato } = await supabase
      .from('contatos')
      .select('nome, telefone')
      .eq('id', body.contato_id)
      .single()

    // 3. Criar cadência anti no-show automaticamente
    const dataHora = new Date(body.data_hora)
    const primeiroEnvio = new Date(dataHora)
    primeiroEnvio.setHours(primeiroEnvio.getHours() - 48)

    const clinicaNome = clinica.nome
    const nomeContato = contato?.nome ?? 'paciente'
    const dataFormatada = dataHora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
    const horaFormatada = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

    const { data: cadencia, error: errCad } = await supabase
      .from('cadencias')
      .insert({
        clinica_id: clinica.id,
        tipo: 'anti_noshow',
        contato_id: body.contato_id,
        lead_id: body.lead_id ?? null,
        agendamento_id: agendamento.id,
        etapa_atual: 0,
        total_etapas: 3,
        status: 'ativa',
        proxima_execucao: primeiroEnvio.toISOString(),
      })
      .select('id')
      .single()

    if (errCad || !cadencia) {
      console.error('[POST /api/agendamentos] erro ao criar cadência', errCad)
      // Não falha o request — agendamento foi criado
    } else {
      // 4. Criar as 3 etapas da cadência
      const h48 = new Date(dataHora); h48.setHours(h48.getHours() - 48)
      const h24 = new Date(dataHora); h24.setHours(h24.getHours() - 24)
      const h2  = new Date(dataHora); h2.setHours(h2.getHours() - 2)

      await supabase.from('cadencia_etapas').insert([
        {
          cadencia_id: cadencia.id,
          numero: 1,
          mensagem_template: `Oi ${nomeContato}! Confirmando sua consulta de ${body.servico} na ${clinicaNome} para ${dataFormatada} às ${horaFormatada}. Você confirma presença? Responda SIM ou NÃO. 😊`,
          status: 'pendente',
        },
        {
          cadencia_id: cadencia.id,
          numero: 2,
          mensagem_template: `Lembrete, ${nomeContato}! Sua consulta de ${body.servico} é amanhã às ${horaFormatada}. Confirmado? 😊`,
          status: 'pendente',
        },
        {
          cadencia_id: cadencia.id,
          numero: 3,
          mensagem_template: `Você tem consulta em 2 horas, ${nomeContato}! Te esperamos às ${horaFormatada} na ${clinicaNome} 🌿`,
          status: 'pendente',
        },
      ])
    }

    // 5. Atualizar lead se fornecido
    if (body.lead_id) {
      await supabase
        .from('leads')
        .update({ etapa: 'consulta_agendada', status: 'agendado', atualizado_em: new Date().toISOString() })
        .eq('id', body.lead_id)
        .eq('clinica_id', clinica.id)
    }

    return NextResponse.json({ agendamento, cadencia_criada: !!cadencia }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/agendamentos] erro inesperado', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
