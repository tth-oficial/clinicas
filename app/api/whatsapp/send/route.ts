import { NextRequest } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createEvolutionClient } from '@/lib/evolution'

// ─── POST /api/whatsapp/send ──────────────────────────────────────────────────
// Envio manual de mensagem pela interface (quando humano assume a conversa)
// Body: { conversaId: string, texto: string }

export async function POST(request: NextRequest) {
  let body: { conversaId: string; texto: string }

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { conversaId, texto } = body

  if (!conversaId || !texto?.trim()) {
    return Response.json(
      { error: 'conversaId e texto são obrigatórios' },
      { status: 400 }
    )
  }

  try {
    const supabase = await createServerClient()

    // 1. Buscar conversa com dados do contato e clínica
    const { data: conversa, error: erroConversa } = await supabase
      .from('conversas')
      .select('id, clinica_id, contato_id, contatos(telefone, nome)')
      .eq('id', conversaId)
      .single()

    if (erroConversa || !conversa) {
      return Response.json({ error: 'Conversa não encontrada' }, { status: 404 })
    }

    const clinicaId = conversa.clinica_id as string
    const contatoRaw = conversa.contatos as unknown
    const contatoData = (Array.isArray(contatoRaw) ? contatoRaw[0] : contatoRaw) as
      | { telefone: string; nome: string }
      | null

    if (!contatoData?.telefone) {
      return Response.json(
        { error: 'Telefone do contato não encontrado' },
        { status: 400 }
      )
    }

    // 2. Salvar mensagem no banco como 'agente'
    const { error: erroMensagem } = await supabase.from('mensagens').insert({
      conversa_id: conversaId,
      clinica_id: clinicaId,
      de: 'agente',
      texto: texto.trim(),
      enviado_em: new Date().toISOString(),
      lido: true,
    })

    if (erroMensagem) {
      console.error('[Send] Erro ao salvar mensagem', erroMensagem)
      return Response.json({ error: 'Erro ao salvar mensagem' }, { status: 500 })
    }

    // 3. Atualizar timestamp da conversa
    await supabase
      .from('conversas')
      .update({ atualizado_em: new Date().toISOString() })
      .eq('id', conversaId)

    // 4. Enviar via Evolution API
    try {
      const evolution = await createEvolutionClient(clinicaId)
      await evolution.sendText(contatoData.telefone, texto.trim())
    } catch (evoErr) {
      console.error('[Send] Erro ao enviar via Evolution', evoErr)
      // Mensagem já salva no banco — retorna sucesso parcial
      return Response.json({
        ok: true,
        aviso: 'Mensagem salva no banco, mas falha ao enviar via WhatsApp',
      })
    }

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[Send] Erro crítico', err)
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
