import { createAdminClient } from '@/lib/supabase/admin'
import { createEvolutionClient } from '@/lib/evolution'
import { personalizarMensagemCadencia, detectarEngajamentoFollowup } from '@/lib/cadencia-ia'
import { NextRequest, NextResponse } from 'next/server'

// ─────────────────────────────────────────────
// GET /api/cron/nutricao
// Executa todo dia às 10h (vercel.json)
// 1. Cria nutrição para leads que entraram em 'negociando'
// 2. Avança cadências com execução vencida
// ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const agora = new Date()

  let criadas = 0
  let enviados = 0
  let erros = 0

  try {
    // ── 1. Criar nutrição para leads em negociação sem cadência ────────
    const { data: leadsNegociando } = await supabase
      .from('leads')
      .select(`
        id, clinica_id, contato_id, servico,
        contatos (id, nome, telefone)
      `)
      .eq('status', 'negociando')
      .neq('temperatura', 'frio')

    if (leadsNegociando && leadsNegociando.length > 0) {
      for (const lead of leadsNegociando) {
        const { data: cadExistente } = await supabase
          .from('cadencias')
          .select('id')
          .eq('lead_id', lead.id)
          .eq('tipo', 'nutricao')
          .in('status', ['ativa', 'pausada'])
          .maybeSingle()

        if (cadExistente) continue

        const contato = lead.contatos as unknown as { id: string; nome: string; telefone: string } | null
        if (!contato) continue

        const { data: cad } = await supabase
          .from('cadencias')
          .insert({
            clinica_id: lead.clinica_id,
            tipo: 'nutricao',
            contato_id: lead.contato_id,
            lead_id: lead.id,
            etapa_atual: 0,
            total_etapas: 4,
            status: 'ativa',
            proxima_execucao: agora.toISOString(),
          })
          .select('id')
          .single()

        if (!cad) continue

        const d1 = new Date(agora)
        const d3 = new Date(agora); d3.setDate(d3.getDate() + 2)
        const d5 = new Date(agora); d5.setDate(d5.getDate() + 4)
        const d7 = new Date(agora); d7.setDate(d7.getDate() + 6)

        await supabase.from('cadencia_etapas').insert([
          {
            cadencia_id: cad.id,
            numero: 1,
            mensagem_template: `Oi ${contato.nome}! Sabia que ${lead.servico} tem resultados incríveis quando feito com a técnica certa? Nosso time é especializado nisso — posso te contar mais? 🌿`,
            status: 'pendente',
          },
          {
            cadencia_id: cad.id,
            numero: 2,
            mensagem_template: `${contato.nome}, compartilhando um resultado real de um dos nossos pacientes com ${lead.servico}. Os resultados falam por si! Quer saber como conseguimos isso? ✨`,
            status: 'pendente',
          },
          {
            cadencia_id: cad.id,
            numero: 3,
            mensagem_template: `${contato.nome}, temos disponibilidade limitada essa semana para ${lead.servico}. Quer garantir seu horário antes de acabar? 🗓️`,
            status: 'pendente',
          },
          {
            cadencia_id: cad.id,
            numero: 4,
            mensagem_template: `${contato.nome}, que tal a gente facilitar? Podemos fazer uma avaliação gratuita de ${lead.servico} sem compromisso. Quando você tiver disponível? 😊`,
            status: 'pendente',
          },
        ])

        // Agendamento da primeira etapa para hoje (proxima_execucao já é agora)
        void d1; void d3; void d5; void d7

        criadas++
      }
    }

    // ── 2. Avançar cadências com execução vencida ──────────────────────
    const { data: cadencias } = await supabase
      .from('cadencias')
      .select(`
        id, clinica_id, contato_id, lead_id,
        etapa_atual, total_etapas,
        cadencia_etapas (id, numero, mensagem_template, status),
        contatos (id, nome, telefone)
      `)
      .eq('tipo', 'nutricao')
      .eq('status', 'ativa')
      .lte('proxima_execucao', agora.toISOString())

    if (cadencias && cadencias.length > 0) {
      for (const cad of cadencias) {
        try {
          const contato = cad.contatos as unknown as { id: string; nome: string; telefone: string } | null
          if (!contato) continue

          const etapas = cad.cadencia_etapas as unknown as Array<{ id: string; numero: number; mensagem_template: string; status: string }>
          const etapaAtual = etapas.find(e => e.numero === cad.etapa_atual + 1 && e.status === 'pendente')
          if (!etapaAtual) continue

          // ── Verificar se contato engajou recentemente (última msg < 24h) ──
          const { data: ultimaMsgContato } = await supabase
            .from('mensagens')
            .select('texto, enviado_em')
            .eq('clinica_id', cad.clinica_id)
            .eq('de', 'cliente')
            .order('enviado_em', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (ultimaMsgContato) {
            const ultimaMsg = new Date(ultimaMsgContato.enviado_em)
            const horasPassadas = (agora.getTime() - ultimaMsg.getTime()) / (1000 * 60 * 60)
            // Se engajou nas últimas 24h — pausar cadência, agente IA já está cuidando
            if (horasPassadas < 24 && detectarEngajamentoFollowup(ultimaMsgContato.texto)) {
              await supabase
                .from('cadencias')
                .update({ status: 'pausada', atualizado_em: agora.toISOString() })
                .eq('id', cad.id)
              console.log(`[cron/nutricao] Cadência ${cad.id} pausada — contato engajou recentemente`)
              enviados++
              continue
            }
          }

          let evolution
          try {
            evolution = await createEvolutionClient(cad.clinica_id)
          } catch {
            erros++
            continue
          }

          // ── Personalizar mensagem com IA ──────────────────────────────────
          const totalEtapas = etapas.length
          const mensagemPersonalizada = await personalizarMensagemCadencia(
            cad.clinica_id,
            cad.contato_id,
            etapaAtual.mensagem_template,
            'nutricao',
            etapaAtual.numero,
            totalEtapas
          )

          await evolution.sendText(contato.telefone, mensagemPersonalizada)

          await supabase
            .from('cadencia_etapas')
            .update({ status: 'enviado', enviado_em: agora.toISOString() })
            .eq('id', etapaAtual.id)

          const novaEtapa = cad.etapa_atual + 1

          if (novaEtapa >= cad.total_etapas) {
            await supabase
              .from('cadencias')
              .update({ etapa_atual: novaEtapa, status: 'concluida', proxima_execucao: null, atualizado_em: agora.toISOString() })
              .eq('id', cad.id)
          } else {
            const proxExec = new Date(agora)
            proxExec.setDate(proxExec.getDate() + 2)

            await supabase
              .from('cadencias')
              .update({ etapa_atual: novaEtapa, proxima_execucao: proxExec.toISOString(), atualizado_em: agora.toISOString() })
              .eq('id', cad.id)
          }

          enviados++
        } catch (e) {
          console.error('[cron/nutricao] erro cadência', cad.id, e)
          erros++
        }
      }
    }

    return NextResponse.json({ ok: true, criadas, enviados, erros })
  } catch (err) {
    console.error('[cron/nutricao] erro inesperado', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
