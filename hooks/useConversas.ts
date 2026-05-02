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

      // Buscar conversas com dados do contato
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

      if (erroQuery) {
        throw erroQuery
      }

      // Para cada conversa, buscar a última mensagem e quantidade de não lidas
      const conversasEnriquecidas: ConversaItem[] = await Promise.all(
        (conversasData ?? []).map(async (conversa) => {
          const [{ data: ultimaMsgData }, { count: naoLidas }] =
            await Promise.all([
              supabase
                .from('mensagens')
                .select('texto, enviado_em, de')
                .eq('conversa_id', conversa.id)
                .order('enviado_em', { ascending: false })
                .limit(1)
                .single(),
              supabase
                .from('mensagens')
                .select('*', { count: 'exact', head: true })
                .eq('conversa_id', conversa.id)
                .eq('lido', false)
                .eq('de', 'cliente'),
            ])

          const contatoRaw = conversa.contatos as unknown
          const contato = (
            Array.isArray(contatoRaw) ? contatoRaw[0] : contatoRaw
          ) as ConversaItem['contatos']

          return {
            ...conversa,
            contatos: contato,
            ultima_mensagem: ultimaMsgData
              ? {
                  texto: ultimaMsgData.texto,
                  enviado_em: ultimaMsgData.enviado_em,
                  de: ultimaMsgData.de as 'cliente' | 'agente' | 'sistema',
                }
              : undefined,
            nao_lidas: naoLidas ?? 0,
          }
        })
      )

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
          // Re-carregar conversas quando chega mensagem nova
          carregarConversas()
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
          // Atualizar localmente sem refetch completo quando agente_ativo muda
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
