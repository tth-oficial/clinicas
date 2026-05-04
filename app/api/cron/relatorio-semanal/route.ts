import { createClient } from '@/lib/supabase/server'
import { createEvolutionClient } from '@/lib/evolution'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const maxDuration = 60

// ─────────────────────────────────────────────
// GET /api/cron/relatorio-semanal
// Executa toda segunda às 07h (vercel.json)
// 1. Agrega métricas da semana anterior
// 2. Chama GPT-4o para resumo executivo
// 3. Salva no Supabase
// 4. Envia WhatsApp para o responsável
// ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = await createClient()
  const agora = new Date()

  // Calcular semana anterior (segunda a domingo)
  const diaSemana = agora.getDay() // 1 = segunda
  const inicioSemana = new Date(agora)
  inicioSemana.setDate(agora.getDate() - diaSemana - 6) // segunda passada
  inicioSemana.setHours(0, 0, 0, 0)

  const fimSemana = new Date(inicioSemana)
  fimSemana.setDate(inicioSemana.getDate() + 6)
  fimSemana.setHours(23, 59, 59, 999)

  const semanaInicioStr = inicioSemana.toISOString().split('T')[0]
  const semanaFimStr = fimSemana.toISOString().split('T')[0]

  const resultados: string[] = []
  let totalGerados = 0

  try {
    // Buscar todas as clínicas ativas
    const { data: clinicas } = await supabase
      .from('clinicas')
      .select('id, nome, responsavel, whatsapp')
      .eq('ativo', true)

    if (!clinicas || clinicas.length === 0) {
      return NextResponse.json({ ok: true, mensagem: 'Nenhuma clínica ativa' })
    }

    for (const clinica of clinicas) {
      try {
        // Verificar se relatório já existe para essa semana
        const { data: existente } = await supabase
          .from('relatorios')
          .select('id')
          .eq('clinica_id', clinica.id)
          .eq('semana_inicio', semanaInicioStr)
          .maybeSingle()

        if (existente) {
          resultados.push(`${clinica.nome}: já existe`)
          continue
        }

        // ── Agregar métricas da semana ─────────────────────────────
        const { data: metricasSemana } = await supabase
          .from('metricas_diarias')
          .select('*')
          .eq('clinica_id', clinica.id)
          .gte('data', semanaInicioStr)
          .lte('data', semanaFimStr)

        // Semana anterior para comparação
        const inicioSemanaAnterior = new Date(inicioSemana)
        inicioSemanaAnterior.setDate(inicioSemanaAnterior.getDate() - 7)
        const fimSemanaAnterior = new Date(fimSemana)
        fimSemanaAnterior.setDate(fimSemanaAnterior.getDate() - 7)

        const { data: metricasAnterior } = await supabase
          .from('metricas_diarias')
          .select('*')
          .eq('clinica_id', clinica.id)
          .gte('data', inicioSemanaAnterior.toISOString().split('T')[0])
          .lte('data', fimSemanaAnterior.toISOString().split('T')[0])

        const somarMetricas = (arr: typeof metricasSemana) => ({
          receita: arr?.reduce((s, m) => s + (m.receita ?? 0), 0) ?? 0,
          leads: arr?.reduce((s, m) => s + (m.leads_novos ?? 0), 0) ?? 0,
          consultas: arr?.reduce((s, m) => s + (m.consultas_realizadas ?? 0), 0) ?? 0,
          procedimentos: arr?.reduce((s, m) => s + (m.procedimentos_realizados ?? 0), 0) ?? 0,
          no_show: arr?.reduce((s, m) => s + (m.no_show_count ?? 0), 0) ?? 0,
          taxa_conversao: arr?.length
            ? arr.reduce((s, m) => s + (m.taxa_conversao ?? 0), 0) / arr.length
            : 0,
        })

        const atual = somarMetricas(metricasSemana)
        const anterior = somarMetricas(metricasAnterior)

        // Leads abertos no período
        const { data: leadsAbertos } = await supabase
          .from('leads')
          .select('status, temperatura')
          .eq('clinica_id', clinica.id)
          .gte('criado_em', inicioSemana.toISOString())
          .lte('criado_em', fimSemana.toISOString())

        // Configuração e API key
        const { data: config } = await supabase
          .from('clinica_config')
          .select('openai_api_key, openai_model')
          .eq('clinica_id', clinica.id)
          .single()

        const apiKey = (config?.openai_api_key as string | null) ?? process.env.OPENAI_API_KEY ?? ''
        if (!apiKey) {
          resultados.push(`${clinica.nome}: sem API key`)
          continue
        }

        // ── Gerar resumo com GPT-4o ───────────────────────────────
        const openai = new OpenAI({ apiKey })
        const model = (config?.openai_model as string | null) ?? 'gpt-4o'

        const variacaoReceita = anterior.receita > 0
          ? (((atual.receita - anterior.receita) / anterior.receita) * 100).toFixed(1)
          : '—'

        const promptRelatorio = `Gere um resumo executivo semanal para a clínica "${clinica.nome}".

DADOS DA SEMANA (${semanaInicioStr} a ${semanaFimStr}):
- Receita: R$ ${atual.receita.toFixed(2)} (semana anterior: R$ ${anterior.receita.toFixed(2)}, variação: ${variacaoReceita}%)
- Leads novos: ${atual.leads} (anterior: ${anterior.leads})
- Consultas realizadas: ${atual.consultas} (anterior: ${anterior.consultas})
- Procedimentos: ${atual.procedimentos} (anterior: ${anterior.procedimentos})
- No-show: ${atual.no_show} (anterior: ${anterior.no_show})
- Taxa de conversão média: ${atual.taxa_conversao.toFixed(1)}% (anterior: ${anterior.taxa_conversao.toFixed(1)}%)
- Leads abertos na semana: ${leadsAbertos?.length ?? 0} (${leadsAbertos?.filter(l => l.temperatura === 'quente').length ?? 0} quentes)

Responda em JSON válido com este formato EXATO:
{
  "resumo": "2-3 parágrafos executivos em português, direto, com números. Use **negrito** para destacar.",
  "acoes": ["ação 1 clara e objetiva", "ação 2", "ação 3", "ação 4", "ação 5"]
}`

        const completion = await openai.chat.completions.create({
          model,
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: promptRelatorio }],
          temperature: 0.3,
          max_tokens: 1000,
        })

        const conteudo = completion.choices[0]?.message?.content ?? '{}'
        let parsed: { resumo?: string; acoes?: string[] }
        try {
          parsed = JSON.parse(conteudo) as { resumo?: string; acoes?: string[] }
        } catch {
          parsed = { resumo: conteudo, acoes: [] }
        }

        const metricas = {
          atual,
          anterior,
          variacao: {
            receita: Number(variacaoReceita) || 0,
            leads: anterior.leads > 0 ? ((atual.leads - anterior.leads) / anterior.leads * 100) : 0,
            consultas: anterior.consultas > 0 ? ((atual.consultas - anterior.consultas) / anterior.consultas * 100) : 0,
            no_show: anterior.no_show > 0 ? ((atual.no_show - anterior.no_show) / anterior.no_show * 100) : 0,
            procedimentos: anterior.procedimentos > 0 ? ((atual.procedimentos - anterior.procedimentos) / anterior.procedimentos * 100) : 0,
            taxa_conversao: atual.taxa_conversao - anterior.taxa_conversao,
          },
        }

        const acoes = (parsed.acoes ?? []).map(a => ({ texto: a, concluida: false }))

        // ── Salvar relatório ──────────────────────────────────────
        await supabase.from('relatorios').insert({
          clinica_id: clinica.id,
          semana_inicio: semanaInicioStr,
          semana_fim: semanaFimStr,
          resumo_ia: parsed.resumo ?? 'Resumo não disponível.',
          acoes_recomendadas: acoes,
          metricas,
        })

        // ── Enviar WhatsApp para o responsável ────────────────────
        if (clinica.whatsapp) {
          try {
            const evolution = await createEvolutionClient(clinica.id)
            const msgWpp = `📊 *Relatório Semanal — ${clinica.nome}*\n` +
              `Semana: ${semanaInicioStr} a ${semanaFimStr}\n\n` +
              `💰 Receita: R$ ${atual.receita.toFixed(2)}\n` +
              `👥 Leads novos: ${atual.leads}\n` +
              `📅 Consultas: ${atual.consultas}\n` +
              `⚠️ No-show: ${atual.no_show}\n\n` +
              `Acesse o painel para ver o relatório completo.`
            await evolution.sendText(clinica.whatsapp, msgWpp)
          } catch {
            // Não falha o cron se o WhatsApp falhar
          }
        }

        resultados.push(`${clinica.nome}: gerado`)
        totalGerados++
      } catch (e) {
        console.error('[cron/relatorio-semanal] erro clínica', clinica.id, e)
        resultados.push(`${clinica.nome}: erro`)
      }
    }

    return NextResponse.json({ ok: true, gerados: totalGerados, resultados })
  } catch (err) {
    console.error('[cron/relatorio-semanal] erro inesperado', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
