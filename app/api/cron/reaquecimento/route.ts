import { createAdminClient } from '@/lib/supabase/admin'
import { createEvolutionClient } from '@/lib/evolution'
import { NextRequest, NextResponse } from 'next/server'

const LOTE_SIZE = 20

// ─────────────────────────────────────────────
// GET /api/cron/reaquecimento
// Executa a cada hora (vercel.json: "0 * * * *")
// Envia lote de 20 mensagens por campanha ativa
// ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = createAdminClient()
  let totalEnviados = 0
  let totalErros = 0

  try {
    // Buscar campanhas ativas de reaquecimento
    const { data: campanhas } = await supabase
      .from('campanhas')
      .select('id, clinica_id, mensagem_template, enviados, total_contatos')
      .eq('tipo', 'reaquecimento')
      .eq('status', 'ativa')

    if (!campanhas || campanhas.length === 0) {
      return NextResponse.json({ ok: true, enviados: 0, mensagem: 'Nenhuma campanha ativa' })
    }

    for (const campanha of campanhas) {
      let evolution
      try {
        evolution = await createEvolutionClient(campanha.clinica_id)
      } catch {
        console.error('[cron/reaquecimento] Evolution não configurada para', campanha.clinica_id)
        continue
      }

      // Buscar próximo lote de contatos pendentes
      const { data: lote } = await supabase
        .from('campanha_contatos')
        .select(`
          id, contato_id,
          contatos (id, nome, telefone)
        `)
        .eq('campanha_id', campanha.id)
        .eq('status', 'pendente')
        .limit(LOTE_SIZE)

      if (!lote || lote.length === 0) {
        // Nenhum pendente: concluir campanha
        await supabase
          .from('campanhas')
          .update({ status: 'concluida', concluido_em: new Date().toISOString() })
          .eq('id', campanha.id)
        continue
      }

      let loteEnviados = 0

      for (const item of lote) {
        const contato = item.contatos as unknown as { id: string; nome: string; telefone: string } | null
        if (!contato) continue

        try {
          // Personalizar mensagem
          const mensagem = campanha.mensagem_template
            .replace(/{nome}/g, contato.nome)
            .replace(/{telefone}/g, contato.telefone)

          await evolution.sendText(contato.telefone, mensagem)

          await supabase
            .from('campanha_contatos')
            .update({ status: 'enviado', enviado_em: new Date().toISOString() })
            .eq('id', item.id)

          loteEnviados++
          totalEnviados++
        } catch (e) {
          console.error('[cron/reaquecimento] erro ao enviar para', contato.telefone, e)
          await supabase
            .from('campanha_contatos')
            .update({ status: 'erro' })
            .eq('id', item.id)
          totalErros++
        }
      }

      // Atualizar contador de enviados
      await supabase
        .from('campanhas')
        .update({ enviados: campanha.enviados + loteEnviados })
        .eq('id', campanha.id)
    }

    return NextResponse.json({ ok: true, enviados: totalEnviados, erros: totalErros })
  } catch (err) {
    console.error('[cron/reaquecimento] erro inesperado', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
