import { createAdminClient } from '@/lib/supabase/admin'
import { createEvolutionClient } from '@/lib/evolution'
import { personalizarMensagemCadencia, detectarEngajamentoFollowup } from '@/lib/cadencia-ia'
import { NextRequest, NextResponse } from 'next/server'

// ─────────────────────────────────────────────
// GET /api/cron/follow-up
// Executa todo dia às 09h (vercel.json)
// 1. Cria follow-up para leads parados há 2+ dias
// 2. Avança cadências de follow-up com execução vencida
// ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const agora = new Date()
  const doisDiasAtras = new Date(agora)
  doisDiasAtras.setDate(doisDiasAtras.getDate() - 2)

  let criadas = 0
  let enviados = 0
  let erros = 0

  try {
    // ── 1. Criar follow-up para leads parados há 2+ dias ──────────────
    const { data: leadsParados } = await supabase
      .from('leads')
      .select(`
        id, clinica_id, contato_id, servico, status,
        contatos (id, nome, telefone)
      `)
      .in('status', ['novo', 'em_contato'])
      .lte('atualizado_em', doisDiasAtras.toISOString())
      .neq('temperatura', 'frio')

    if (leadsParados && leadsParados.length > 0) {
      for (const lead of leadsParados) {
        // Verificar se já tem follow-up ativo
        const { data: cadExistente } = await supabase
          .from('cadencias')
          .select('id')
          .eq('lead_id', lead.id)
          .eq('tipo', 'followup')
          .eq('status', 'ativa')
          .maybeSingle()

        if (cadExistente) continue

        const contato = lead.contatos as unknown as { id: string; nome: string; telefone: string } | null
        if (!contato) continue

        // Criar cadência
        const { data: cad } = await supabase
          .from('cadencias')
          .insert({
            clinica_id: lead.clinica_id,
            tipo: 'followup',
            contato_id: lead.contato_id,
            lead_id: lead.id,
            etapa_atual: 0,
            total_etapas: 3,
            status: 'ativa',
            proxima_execucao: agora.toISOString(),
          })
          .select('id')
          .single()

        if (!cad) continue

        const d2 = new Date(agora); d2.setDate(d2.getDate() + 2)
        const d5 = new Date(agora); d5.setDate(d5.getDate() + 5)

        await supabase.from('cadencia_etapas').insert([
          {
            cadencia_id: cad.id,
            numero: 1,
            mensagem_template: `Oi ${contato.nome}! Ainda posso te ajudar com ${lead.servico}? Estou aqui para tirar qualquer dúvida 😊`,
            status: 'pendente',
          },
          {
            cadencia_id: cad.id,
            numero: 2,
            mensagem_template: `${contato.nome}, ${lead.servico} pode fazer uma grande diferença na sua qualidade de vida. Que tal agendarmos uma avaliação sem compromisso? 🌿`,
            status: 'pendente',
          },
          {
            cadencia_id: cad.id,
            numero: 3,
            mensagem_template: `${contato.nome}, será meu último contato sobre ${lead.servico}. Se mudar de ideia, estarei aqui! Qualquer coisa é só chamar 💚`,
            status: 'pendente',
          },
        ])

        // proxima_execucao já é `agora` (insert acima) — etapa 1 dispara
        // no loop de avanço logo abaixo, no mesmo run do cron
        void d2; void d5

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
      .eq('tipo', 'followup')
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
              console.log(`[cron/follow-up] Cadência ${cad.id} pausada — contato engajou recentemente`)
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
            'followup',
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
            // Última etapa: encerrar cadência e marcar lead como frio
            await supabase
              .from('cadencias')
              .update({ etapa_atual: novaEtapa, status: 'concluida', proxima_execucao: null, atualizado_em: agora.toISOString() })
              .eq('id', cad.id)

            if (cad.lead_id) {
              await supabase
                .from('leads')
                .update({ temperatura: 'frio', atualizado_em: agora.toISOString() })
                .eq('id', cad.lead_id)
            }
          } else {
            const diasProxima = novaEtapa === 1 ? 2 : 3
            const proxExec = new Date(agora)
            proxExec.setDate(proxExec.getDate() + diasProxima)

            await supabase
              .from('cadencias')
              .update({ etapa_atual: novaEtapa, proxima_execucao: proxExec.toISOString(), atualizado_em: agora.toISOString() })
              .eq('id', cad.id)
          }

          enviados++
        } catch (e) {
          console.error('[cron/follow-up] erro cadência', cad.id, e)
          erros++
        }
      }
    }

    return NextResponse.json({ ok: true, criadas, enviados, erros })
  } catch (err) {
    console.error('[cron/follow-up] erro inesperado', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
