'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ConversaItem {
  id: string
  clinica_id: string
  contato_id: string
  agente_ativo: boolean
  criado_em: string
  atualizado_em: string
  contatos: {
    id: string
    nome: string
    telefone: string
  } | null
  ultima_mensagem?: {
    texto: string | null
    enviado_em: string
    de: 'cliente' | 'agente' | 'sistema'
  }
  nao_lidas: number
}

export function useConversas(clinicaId: string) {
  const [conversas, setConversas] = useState<ConversaItem[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const supabase = createClient()

  const carregarConversas = useCallback(async () => {
    if (!clinicaId) return

    try {
      setCarregando(true)
      setErro(null)

      const { data: conversasData, error: erroQuery } = await supabase
        .from('conversas')
        .select(`
          id,
          clinica_id,
          contato_id,
          agente_ativo,
          criado_em,
          atualizado_em,
          contatos (
            id,
            nome,
            telefone
          )
        `)
        .eq('clinica_id', clinicaId)
        .order('atualizado_em', { ascending: false })
        .limit(50)

      if (erroQuery) throw erroQuery

      if (!conversasData?.length) {
        setConversas([])
        return
      }

      const ids = conversasData.map((c) => c.id)

      // 2 queries em paralelo ao invés de 2N queries (elimina N+1)
      const [{ data: mensagensData }, { data: naoLidasData }] = await Promise.all([
        supabase
          .from('mensagens')
          .select('conversa_id, texto, enviado_em, de')
          .in('conversa_id', ids)
          .order('enviado_em', { ascending: false })
          .limit(ids.length * 5),
        supabase
          .from('mensagens')
          .select('conversa_id')
          .in('conversa_id', ids)
          .eq('lido', false)
          .eq('de', 'cliente'),
      ])

      // Montar mapas em JS a partir dos resultados batch
      const ultimaMsgPor: Record<string, { texto: string | null; enviado_em: string; de: string }> = {}
      for (const msg of (mensagensData ?? [])) {
        if (!ultimaMsgPor[msg.conversa_id]) {
          ultimaMsgPor[msg.conversa_id] = msg
        }
      }

      const naoLidasPor: Record<string, number> = {}
      for (const msg of (naoLidasData ?? [])) {
        naoLidasPor[msg.conversa_id] = (naoLidasPor[msg.conversa_id] ?? 0) + 1
      }

      const conversasEnriquecidas: ConversaItem[] = conversasData.map((conversa) => {
        const contatoRaw = conversa.contatos as unknown
        const contato = (
          Array.isArray(contatoRaw) ? contatoRaw[0] : contatoRaw
        ) as ConversaItem['contatos']
        const ultimaMsg = ultimaMsgPor[conversa.id]

        return {
          ...conversa,
          contatos: contato,
          ultima_mensagem: ultimaMsg
            ? {
                texto: ultimaMsg.texto,
                enviado_em: ultimaMsg.enviado_em,
                de: ultimaMsg.de as 'cliente' | 'agente' | 'sistema',
              }
            : undefined,
          nao_lidas: naoLidasPor[conversa.id] ?? 0,
        }
      })

      setConversas(conversasEnriquecidas)
    } catch (err) {
      console.error('[useConversas] Erro ao carregar conversas', err)
      setErro('Erro ao carregar conversas')
    } finally {
      setCarregando(false)
    }
  }, [clinicaId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Carregar conversas na montagem
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarConversas()
  }, [carregarConversas])

  // Supabase Realtime — escutar novas mensagens para atualizar a lista
  useEffect(() => {
    if (!clinicaId) return

    const canal = supabase
      .channel(`conversas-clinica-${clinicaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mensagens',
          filter: `clinica_id=eq.${clinicaId}`,
        },
        () => {
          void carregarConversas()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversas',
          filter: `clinica_id=eq.${clinicaId}`,
        },
        (payload) => {
          setConversas((prev) =>
            prev.map((c) =>
              c.id === payload.new.id
                ? {
                    ...c,
                    agente_ativo: payload.new.agente_ativo as boolean,
                    atualizado_em: payload.new.atualizado_em as string,
                  }
                : c
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [clinicaId]) // eslint-disable-line react-hooks/exhaustive-deps

  return { conversas, carregando, erro, recarregar: carregarConversas }
}
