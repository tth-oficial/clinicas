import { createClient } from '@/lib/supabase/server'
import { getClinicaDoUsuario } from '@/lib/supabase/queries'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const maxDuration = 60

// ─────────────────────────────────────────────
// POST /api/ia-decisao
// Recebe pergunta, busca dados reais da clínica, chama GPT-4o
// ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const clinica = await getClinicaDoUsuario(user.id)
    const body = await request.json() as { pergunta: string }

    if (!body.pergunta?.trim()) {
      return NextResponse.json({ error: 'pergunta obrigatória' }, { status: 400 })
    }

    // ── 1. Buscar configuração e API key ──────────────────────────────
    const { data: config } = await supabase
      .from('clinica_config')
      .select('openai_api_key, openai_model')
      .eq('clinica_id', clinica.id)
      .single()

    const apiKey = (config?.openai_api_key as string | null) ?? process.env.OPENAI_API_KEY ?? ''
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key não configurada' }, { status: 400 })
    }

    // ── 2. Agregar dados reais da clínica ─────────────────────────────
    const hoje = new Date()
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

    // Métricas do mês atual
    const { data: metricas } = await supabase
      .from('metricas_diarias')
      .select('receita, leads_novos, consultas_realizadas, procedimentos_realizados, no_show_count, taxa_conversao')
      .eq('clinica_id', clinica.id)
      .gte('data', inicioMes.toISOString().split('T')[0])

    const totalReceita = metricas?.reduce((s, m) => s + (m.receita ?? 0), 0) ?? 0
    const totalLeads = metricas?.reduce((s, m) => s + (m.leads_novos ?? 0), 0) ?? 0
    const totalConsultas = metricas?.reduce((s, m) => s + (m.consultas_realizadas ?? 0), 0) ?? 0
    const totalNoShow = metricas?.reduce((s, m) => s + (m.no_show_count ?? 0), 0) ?? 0
    const taxaConversaoMedia = metricas?.length
      ? (metricas.reduce((s, m) => s + (m.taxa_conversao ?? 0), 0) / metricas.length).toFixed(1)
      : '0'

    // Leads por status
    const { data: leads } = await supabase
      .from('leads')
      .select('status, temperatura, servico')
      .eq('clinica_id', clinica.id)

    const leadsNovos = leads?.filter(l => l.status === 'novo').length ?? 0
    const leadsNegociando = leads?.filter(l => l.status === 'negociando').length ?? 0
    const leadsConvertidos = leads?.filter(l => l.status === 'convertido').length ?? 0
    const leadsQuentes = leads?.filter(l => l.temperatura === 'quente').length ?? 0

    // Top serviços (contagem de leads por serviço)
    const servicosCount: Record<string, number> = {}
    leads?.forEach(l => {
      if (l.servico) servicosCount[l.servico] = (servicosCount[l.servico] ?? 0) + 1
    })
    const topServicos = Object.entries(servicosCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([s, c]) => `${s} (${c})`)
      .join(', ') || 'Dados insuficientes'

    // Agendamentos do mês
    const { data: agendamentos } = await supabase
      .from('agendamentos')
      .select('status')
      .eq('clinica_id', clinica.id)
      .gte('data_hora', inicioMes.toISOString())

    const agendadosTotal = agendamentos?.length ?? 0
    const agendadosRealizados = agendamentos?.filter(a => a.status === 'realizado').length ?? 0
    const agendadosNoShow = agendamentos?.filter(a => a.status === 'no_show').length ?? 0

    // ── 3. Montar system prompt ───────────────────────────────────────
    const systemPrompt = `Você é um analista de negócios especializado em clínicas de saúde e estética.
Você tem acesso aos dados da ${clinica.nome} referentes ao mês atual.

DADOS DISPONÍVEIS PARA ANÁLISE:
- Receita do mês: R$ ${totalReceita.toFixed(2)}
- Leads: ${totalLeads} novos | ${leadsNovos} aguardando | ${leadsNegociando} em negociação | ${leadsConvertidos} convertidos | ${leadsQuentes} quentes
- Agendamentos do mês: ${agendadosTotal} total | ${agendadosRealizados} realizados | ${agendadosNoShow} no-show
- Taxa de no-show: ${agendadosTotal > 0 ? ((agendadosNoShow / agendadosTotal) * 100).toFixed(1) : 0}%
- Taxa de conversão média: ${taxaConversaoMedia}%
- Top serviços: ${topServicos}
- Consultas realizadas: ${totalConsultas}
- Procedimentos realizados: ${metricas?.reduce((s, m) => s + (m.procedimentos_realizados ?? 0), 0) ?? 0}
- No-show total: ${totalNoShow}

Responda perguntas estratégicas do dono da clínica com base nesses dados.
Use números específicos sempre que possível.
Seja direto e prático. Máximo 3 parágrafos curtos.
Use markdown simples: **negrito** para destacar números importantes.
Se não houver dados suficientes para responder, diga claramente.`

    // ── 4. Chamar GPT-4o ─────────────────────────────────────────────
    const openai = new OpenAI({ apiKey })
    const model = (config?.openai_model as string | null) ?? 'gpt-4o'

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: body.pergunta },
      ],
      temperature: 0.4,
      max_tokens: 800,
    })

    const resposta = completion.choices[0]?.message?.content ?? 'Não foi possível gerar uma resposta.'

    return NextResponse.json({ resposta })
  } catch (err) {
    console.error('[POST /api/ia-decisao] inesperado', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
