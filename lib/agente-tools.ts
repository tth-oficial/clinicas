import { createAdminClient } from '@/lib/supabase/admin'
import { createEvolutionClient } from '@/lib/evolution'

// ─────────────────────────────────────────────────────────────────────────────
// FERRAMENTAS DO AGENTE IA
// Funções chamadas durante o loop de function calling do OpenAI
// Todas usam createAdminClient() — sem necessidade de sessão de usuário
// ─────────────────────────────────────────────────────────────────────────────

const supabase = createAdminClient()

// ─── 1. Listar Serviços ───────────────────────────────────────────────────────

export async function listarServicos(clinicaId: string) {
  const { data, error } = await supabase
    .from('servicos')
    .select('id, nome, descricao, duracao_minutos, valor')
    .eq('clinica_id', clinicaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw new Error(`[listarServicos] ${error.message}`)

  return data ?? []
}

// ─── 2. Listar Profissionais ──────────────────────────────────────────────────

export async function listarProfissionais(clinicaId: string) {
  const { data, error } = await supabase
    .from('profissionais')
    .select('id, nome, especialidade')
    .eq('clinica_id', clinicaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw new Error(`[listarProfissionais] ${error.message}`)

  return data ?? []
}

// ─── 3. Consultar Disponibilidade ─────────────────────────────────────────────

export async function consultarDisponibilidade(
  clinicaId: string,
  data: string, // YYYY-MM-DD
  servicoNome?: string,
  profissionalNome?: string
) {
  // Resolver IDs a partir dos nomes (agente usa nomes, não IDs)
  let servicoId: string | undefined
  let duracaoMinutos = 60

  if (servicoNome) {
    const { data: srv } = await supabase
      .from('servicos')
      .select('id, duracao_minutos')
      .eq('clinica_id', clinicaId)
      .ilike('nome', `%${servicoNome}%`)
      .eq('ativo', true)
      .limit(1)
      .single()

    if (srv) {
      servicoId = srv.id
      duracaoMinutos = srv.duracao_minutos
    }
  }

  let profissionalId: string | undefined
  if (profissionalNome) {
    const { data: prof } = await supabase
      .from('profissionais')
      .select('id')
      .eq('clinica_id', clinicaId)
      .ilike('nome', `%${profissionalNome}%`)
      .eq('ativo', true)
      .limit(1)
      .single()

    if (prof) profissionalId = prof.id
  }

  // Buscar horário de funcionamento
  const [ano, mes, dia] = data.split('-').map(Number)
  const dataObj = new Date(ano, mes - 1, dia)
  const diaSemana = dataObj.getDay()

  const { data: horarioDia } = await supabase
    .from('horarios_funcionamento')
    .select('hora_inicio, hora_fim, ativo')
    .eq('clinica_id', clinicaId)
    .eq('dia_semana', diaSemana)
    .single()

  if (!horarioDia?.ativo) {
    return { aberto: false, slots: [], mensagem: 'Clínica fechada neste dia' }
  }

  // Buscar agendamentos existentes no dia
  const inicioDia = `${data}T00:00:00`
  const fimDia = `${data}T23:59:59`

  let query = supabase
    .from('agendamentos')
    .select('data_hora, duracao_minutos, profissional_id')
    .eq('clinica_id', clinicaId)
    .gte('data_hora', inicioDia)
    .lte('data_hora', fimDia)
    .not('status', 'in', '("cancelado","no_show")')

  if (profissionalId) {
    query = query.eq('profissional_id', profissionalId)
  }

  const { data: agendamentos } = await query

  // Gerar slots de 30 em 30 min
  const [hInicioH, hInicioM] = horarioDia.hora_inicio.split(':').map(Number)
  const [hFimH, hFimM] = horarioDia.hora_fim.split(':').map(Number)
  const minInicio = hInicioH * 60 + hInicioM
  const minFim = hFimH * 60 + hFimM

  const slots: Array<{ hora: string; disponivel: boolean }> = []

  for (let min = minInicio; min + duracaoMinutos <= minFim; min += 30) {
    const hSlot = Math.floor(min / 60)
    const mSlot = min % 60
    const horaStr = `${String(hSlot).padStart(2, '0')}:${String(mSlot).padStart(2, '0')}`

    let conflito = false
    for (const ag of agendamentos ?? []) {
      const agData = new Date(ag.data_hora)
      const agMin = agData.getHours() * 60 + agData.getMinutes()
      const agFim = agMin + (ag.duracao_minutos ?? 60)
      if (min < agFim && min + duracaoMinutos > agMin) {
        conflito = true
        break
      }
    }

    slots.push({ hora: horaStr, disponivel: !conflito })
  }

  const livres = slots.filter(s => s.disponivel)

  return {
    aberto: true,
    data,
    servico: servicoNome,
    duracao_minutos: duracaoMinutos,
    slots_disponiveis: livres.length,
    horarios_livres: livres.map(s => s.hora),
  }
}

// ─── 4. Marcar Consulta ───────────────────────────────────────────────────────

export async function marcarConsulta(
  clinicaId: string,
  contatoId: string,
  servicoNome: string,
  dataHoraStr: string, // ISO 8601 ou "YYYY-MM-DD HH:MM"
  profissionalNome?: string
) {
  // Resolver serviço
  const { data: servico } = await supabase
    .from('servicos')
    .select('id, nome, duracao_minutos, valor')
    .eq('clinica_id', clinicaId)
    .ilike('nome', `%${servicoNome}%`)
    .eq('ativo', true)
    .limit(1)
    .single()

  // Resolver profissional
  let profissionalId: string | null = null
  let profissionalNomeResolvido: string | null = null
  if (profissionalNome) {
    const { data: prof } = await supabase
      .from('profissionais')
      .select('id, nome')
      .eq('clinica_id', clinicaId)
      .ilike('nome', `%${profissionalNome}%`)
      .eq('ativo', true)
      .limit(1)
      .single()

    if (prof) {
      profissionalId = prof.id
      profissionalNomeResolvido = prof.nome
    }
  }

  // Normalizar data/hora para ISO
  let dataHora: string
  try {
    // Suporta "2026-05-07 09:00" ou ISO completo
    const normalized = dataHoraStr.includes('T')
      ? dataHoraStr
      : dataHoraStr.replace(' ', 'T') + ':00'
    const d = new Date(normalized)
    if (Number.isNaN(d.getTime())) throw new Error('NaN')
    dataHora = d.toISOString()
  } catch {
    throw new Error(`Data/hora inválida: ${dataHoraStr}`)
  }

  const dataHoraObjValidacao = new Date(dataHora)
  const duracao = servico?.duracao_minutos ?? 60

  // Não aceitar agendamento no passado
  if (dataHoraObjValidacao.getTime() < Date.now()) {
    return {
      sucesso: false,
      erro: 'A data/hora informada está no passado. Por favor, escolha outro horário.',
    }
  }

  // Validar horário de funcionamento da clínica para o dia da semana
  const diaSemana = dataHoraObjValidacao.getDay()
  const { data: horarioDia } = await supabase
    .from('horarios_funcionamento')
    .select('hora_inicio, hora_fim, ativo')
    .eq('clinica_id', clinicaId)
    .eq('dia_semana', diaSemana)
    .maybeSingle()

  if (!horarioDia?.ativo) {
    return {
      sucesso: false,
      erro: 'A clínica está fechada neste dia.',
    }
  }

  const minutoSlotInicio =
    dataHoraObjValidacao.getHours() * 60 + dataHoraObjValidacao.getMinutes()
  const minutoSlotFim = minutoSlotInicio + duracao
  const [hI, mI] = horarioDia.hora_inicio.split(':').map(Number)
  const [hF, mF] = horarioDia.hora_fim.split(':').map(Number)
  const minAbre = hI * 60 + mI
  const minFecha = hF * 60 + mF

  if (minutoSlotInicio < minAbre || minutoSlotFim > minFecha) {
    return {
      sucesso: false,
      erro: 'O horário escolhido está fora do funcionamento da clínica.',
    }
  }

  // Verificar conflito com outros agendamentos do mesmo profissional (ou
  // qualquer agendamento se profissional não foi escolhido)
  const inicioDia = `${dataHora.slice(0, 10)}T00:00:00`
  const fimDia = `${dataHora.slice(0, 10)}T23:59:59`

  let queryConflito = supabase
    .from('agendamentos')
    .select('data_hora, duracao_minutos, profissional_id')
    .eq('clinica_id', clinicaId)
    .gte('data_hora', inicioDia)
    .lte('data_hora', fimDia)
    .not('status', 'in', '("cancelado","no_show")')

  if (profissionalId) {
    queryConflito = queryConflito.eq('profissional_id', profissionalId)
  }

  const { data: agendamentosDia } = await queryConflito
  for (const ag of agendamentosDia ?? []) {
    const t = new Date(ag.data_hora)
    const aInicio = t.getHours() * 60 + t.getMinutes()
    const aFim = aInicio + (ag.duracao_minutos ?? 60)
    if (minutoSlotInicio < aFim && minutoSlotFim > aInicio) {
      return {
        sucesso: false,
        erro: 'Esse horário já está ocupado. Sugira outro.',
      }
    }
  }

  // Buscar contato para templates (e revalidar tenant)
  const { data: contato } = await supabase
    .from('contatos')
    .select('nome, telefone')
    .eq('id', contatoId)
    .eq('clinica_id', clinicaId)
    .maybeSingle()

  if (!contato) {
    throw new Error('[marcarConsulta] contato não pertence à clínica')
  }

  // Criar agendamento
  const { data: agendamento, error: errAg } = await supabase
    .from('agendamentos')
    .insert({
      clinica_id: clinicaId,
      contato_id: contatoId,
      servico: servico?.nome ?? servicoNome,
      servico_id: servico?.id ?? null,
      profissional: profissionalNomeResolvido,
      profissional_id: profissionalId,
      data_hora: dataHora,
      duracao_minutos: servico?.duracao_minutos ?? 60,
      valor: servico?.valor ?? null,
      status: 'agendado',
    })
    .select('id')
    .single()

  if (errAg || !agendamento) {
    throw new Error(`[marcarConsulta] ${errAg?.message ?? 'Falha ao criar agendamento'}`)
  }

  // Criar cadência anti-noshow
  const dataHoraObj = new Date(dataHora)
  const primeiroEnvio = new Date(dataHoraObj)
  primeiroEnvio.setHours(primeiroEnvio.getHours() - 48)

  const nomeContato = contato?.nome ?? 'paciente'
  const dataFormatada = dataHoraObj.toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  const horaFormatada = dataHoraObj.toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit',
  })
  const nomeServico = servico?.nome ?? servicoNome

  const { data: cadencia } = await supabase
    .from('cadencias')
    .insert({
      clinica_id: clinicaId,
      tipo: 'anti_noshow',
      contato_id: contatoId,
      agendamento_id: agendamento.id,
      etapa_atual: 0,
      total_etapas: 3,
      status: 'ativa',
      proxima_execucao: primeiroEnvio.toISOString(),
    })
    .select('id')
    .single()

  if (cadencia) {
    await supabase.from('cadencia_etapas').insert([
      {
        cadencia_id: cadencia.id,
        numero: 1,
        mensagem_template: `Oi ${nomeContato}! Confirmando sua consulta de ${nomeServico} para ${dataFormatada} às ${horaFormatada}. Você confirma presença? Responda SIM ou NÃO. 😊`,
        status: 'pendente',
      },
      {
        cadencia_id: cadencia.id,
        numero: 2,
        mensagem_template: `Lembrete, ${nomeContato}! Sua consulta de ${nomeServico} é amanhã às ${horaFormatada}. Confirmado? 😊`,
        status: 'pendente',
      },
      {
        cadencia_id: cadencia.id,
        numero: 3,
        mensagem_template: `${nomeContato}, você tem consulta em 2 horas! Te esperamos às ${horaFormatada} 🌿`,
        status: 'pendente',
      },
    ])
  }

  return {
    agendamento_id: agendamento.id,
    servico: nomeServico,
    data_hora: dataHora,
    profissional: profissionalNomeResolvido,
    cadencia_criada: !!cadencia,
  }
}

// ─── 5. Consultar Agendamentos do Paciente ────────────────────────────────────

export async function consultarAgendamentosPaciente(
  clinicaId: string,
  contatoId: string
) {
  const agora = new Date().toISOString()

  const { data, error } = await supabase
    .from('agendamentos')
    .select('id, servico, profissional, data_hora, status, duracao_minutos')
    .eq('clinica_id', clinicaId)
    .eq('contato_id', contatoId)
    .gte('data_hora', agora)
    .not('status', 'in', '("cancelado","no_show")')
    .order('data_hora', { ascending: true })
    .limit(5)

  if (error) throw new Error(`[consultarAgendamentos] ${error.message}`)

  return (data ?? []).map(ag => ({
    id: ag.id,
    servico: ag.servico,
    profissional: ag.profissional,
    data_hora: new Date(ag.data_hora).toLocaleString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long',
      hour: '2-digit', minute: '2-digit',
    }),
    status: ag.status,
  }))
}

// ─── 6. Cancelar Agendamento ──────────────────────────────────────────────────
// Recebe clinicaId + contatoId do contexto da sessão de WhatsApp para
// garantir que o paciente só consegue cancelar o próprio agendamento dele.
// Sem isso, prompt-injection permitiria "cancele o agendamento ID xxx" e
// derrubaria agendamentos de qualquer paciente da clínica.

export async function cancelarAgendamento(
  agendamentoId: string,
  clinicaId?: string,
  contatoId?: string
) {
  // Quando chamado pelo agente via WhatsApp, clinicaId/contatoId são
  // obrigatórios. Manter argumentos opcionais por compatibilidade com
  // o type da OpenAI Function Call (que só passa o ID), mas a validação
  // abaixo bloqueia qualquer chamada sem contexto de sessão.
  if (!clinicaId || !contatoId) {
    throw new Error('[cancelarAgendamento] contexto de sessão ausente')
  }

  // Verifica posse antes de qualquer mutação
  const { data: agendamento } = await supabase
    .from('agendamentos')
    .select('id')
    .eq('id', agendamentoId)
    .eq('clinica_id', clinicaId)
    .eq('contato_id', contatoId)
    .maybeSingle()

  if (!agendamento) {
    return {
      sucesso: false,
      erro: 'Agendamento não encontrado para este paciente.',
    }
  }

  const { error } = await supabase
    .from('agendamentos')
    .update({ status: 'cancelado', atualizado_em: new Date().toISOString() })
    .eq('id', agendamentoId)
    .eq('clinica_id', clinicaId)
    .eq('contato_id', contatoId)

  if (error) throw new Error(`[cancelarAgendamento] ${error.message}`)

  // Cancelar cadência anti-noshow associada (também filtrada por tenant)
  await supabase
    .from('cadencias')
    .update({ status: 'cancelada', atualizado_em: new Date().toISOString() })
    .eq('agendamento_id', agendamentoId)
    .eq('clinica_id', clinicaId)
    .eq('tipo', 'anti_noshow')

  return { sucesso: true }
}

// ─── 7. Escalar para Humano ───────────────────────────────────────────────────

export async function escalarParaHumano(
  clinicaId: string,
  conversaId: string,
  contatoId: string,
  motivo: string
) {
  // 1. Marcar conversa como aguardando humano
  await supabase
    .from('conversas')
    .update({
      agente_ativo: false,
      status: 'aguardando_humano',
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', conversaId)

  // 2. Buscar telefone de escalação nas configurações
  const { data: config } = await supabase
    .from('clinica_config')
    .select('telefone_escalacao, notificar_escalacao')
    .eq('clinica_id', clinicaId)
    .single()

  // 3. Buscar dados do contato
  const { data: contato } = await supabase
    .from('contatos')
    .select('nome, telefone')
    .eq('id', contatoId)
    .single()

  let notificado = false

  // 4. Enviar notificação WhatsApp para o responsável
  if (config?.notificar_escalacao && config?.telefone_escalacao && contato) {
    try {
      const evolution = await createEvolutionClient(clinicaId)
      await evolution.sendText(
        config.telefone_escalacao,
        `🔔 *Escalação de Atendimento*\n\n` +
        `Paciente: ${contato.nome}\n` +
        `Tel: ${contato.telefone}\n` +
        `Motivo: ${motivo}\n\n` +
        `Acesse o sistema para continuar o atendimento.`
      )
      notificado = true
    } catch (e) {
      console.error('[escalarParaHumano] Erro ao notificar responsável', e)
    }
  }

  // 5. Salvar mensagem de sistema na conversa
  await supabase.from('mensagens').insert({
    conversa_id: conversaId,
    clinica_id: clinicaId,
    de: 'sistema',
    texto: `Atendimento escalado para humano. Motivo: ${motivo}`,
    enviado_em: new Date().toISOString(),
    lido: true,
  })

  return {
    escalado: true,
    notificado,
    telefone_notificado: config?.telefone_escalacao ?? null,
  }
}
